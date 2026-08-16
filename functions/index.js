const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const Stripe = require("stripe");

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
const messaging = getMessaging();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const PRICE_TIERS = Object.freeze({
  little: { priceId: "price_1U4E9q3zyS86a3ry2Lrikcjq", amount: 5, label: "Little Titan" },
  growing: { priceId: "price_1U4EBp3zyS86a3ryn3HfNU0R", amount: 10, label: "Growing Titan" },
  champion: { priceId: "price_1U4EDE3zyS86a3ryKXVPLEhd", amount: 20, label: "Champion Titan" },
  legendary: { priceId: "price_1U4EDx3zyS86a3ryxlW1Scz8", amount: 40, label: "Legendary Titan" },
  broken: { priceId: "price_1U4EEf3zyS86a3ryLupeschV", amount: 100, label: "You Just Broke Me" },
});

const ALLOWED_ORIGINS = new Set([
  "https://tinytitans-hoggy-companion.web.app",
  "https://tinytitans-hoggy-companion.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getAllowedOrigin(request) {
  const origin = request.rawRequest?.headers?.origin || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "https://tinytitans-hoggy-companion.web.app";
}

function isLegacyAdminRequest(request) {
  return request.auth?.token?.admin === true || request.auth?.token?.creator === true;
}

exports.setCreatorClaim = onCall(
  { region: "europe-west2" },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (!isLegacyAdminRequest(request)) throw new HttpsError("permission-denied", "Creator authorization is required.");
    const targetUid = String(request.data?.uid || "").trim();
    const enabled = request.data?.enabled !== false;
    if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
    if (targetUid === request.auth.uid && !enabled) throw new HttpsError("failed-precondition", "The current Creator cannot remove their own Creator access.");
    try {
      const target = await adminAuth.getUser(targetUid);
      const existing = target.customClaims || {};
      const nextClaims = { ...existing, creator: enabled };
      if (!enabled) delete nextClaims.creator;
      await adminAuth.setCustomUserClaims(targetUid, nextClaims);
      await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: enabled ? "grant_creator" : "revoke_creator", createdAt: FieldValue.serverTimestamp() });
      return { success: true, uid: targetUid, creator: enabled };
    } catch (error) {
      console.error("Creator claim update failed", error);
      throw new HttpsError("internal", "Unable to update Creator authorization.");
    }
  }
);

exports.createTitanCheckout = onCall(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to become a Titan.");
    const tierKey = String(request.data?.tier || "");
    const tier = PRICE_TIERS[tierKey];
    if (!tier) throw new HttpsError("invalid-argument", "Invalid Titan support tier.");
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const origin = getAllowedOrigin(request);
      const session = await stripe.checkout.sessions.create({ mode: "payment", line_items: [{ price: tier.priceId, quantity: 1 }], customer_email: request.auth.token.email || undefined, client_reference_id: request.auth.uid, metadata: { uid: request.auth.uid, tier: tierKey, label: tier.label, amount_gbp: String(tier.amount) }, success_url: `${origin}/become-a-titan?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/become-a-titan?payment=cancelled`, billing_address_collection: "auto" });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url };
    } catch (error) { console.error("Stripe checkout creation failed", error); throw new HttpsError("internal", "Unable to start Stripe Checkout."); }
  }
);

exports.stripeWebhook = onRequest(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).send("Missing Stripe signature");
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.metadata?.uid || session.client_reference_id;
        const tier = PRICE_TIERS[session.metadata?.tier];
        if (uid && tier && session.payment_status === "paid") {
          await db.collection("supporters").doc(uid).set({ uid, status: "active", tier: session.metadata.tier, tierLabel: tier.label, amountGbp: tier.amount, stripeCustomerId: session.customer || null, stripeCheckoutSessionId: session.id, lastPaymentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          await db.collection("supporterStats").doc("global").set({ totalSupporters: FieldValue.increment(1), totalReceivedGbp: FieldValue.increment(tier.amount), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }
      return res.status(200).json({ received: true });
    } catch (error) { console.error("Stripe webhook verification/processing failed", error); return res.status(400).send("Invalid webhook signature or event"); }
  }
);

function londonToday() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysBetween(fromDate, toDate) {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / 86400000);
}

function preparationMessage(daysUntil, snakeName) {
  if (daysUntil === 2) return { title: `🧊 Feeding preparation — ${snakeName}`, body: "Feeding is in 2 days — make sure you have the correct food in stock." };
  if (daysUntil === 1) return { title: `🧊 Feeding preparation — ${snakeName}`, body: "Feeding is tomorrow — make sure your feeder is fully defrosted and kept chilled safely until feeding." };
  return { title: `🍽️ Feeding day — ${snakeName}`, body: "Feeding day — your snake is due for a feed today." };
}

async function claimNotificationEvent(uid, eventKey, payload) {
  const eventRef = db.collection("users").doc(uid).collection("notificationEvents").doc(eventKey);
  let claimed = false;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.exists) return;
    transaction.create(eventRef, { ...payload, status: "sending", createdAt: FieldValue.serverTimestamp() });
    claimed = true;
  });
  return { claimed, eventRef };
}

async function sendToUserTokens(uid, eventKey, message) {
  const tokenSnapshot = await db.collection("users").doc(uid).collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  if (!tokenDocs.length) return { sent: 0, invalid: 0 };
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const tokens = batch.map((item) => item.data().token);
    const response = await messaging.sendEachForMulticast({ tokens, data: { title: message.title, body: message.body, eventKey, url: "/feeding/preparation" } });
    sent += response.successCount;
    invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  return { sent, invalid };
}

exports.sendFeedingPreparationNotifications = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/London", region: "europe-west2", memory: "256MiB", timeoutSeconds: 120 },
  async () => {
    const today = londonToday();
    const users = await db.collection("users").get();
    let notificationsSent = 0;

    for (const userDocument of users.docs) {
      const userData = userDocument.data();
      const notificationSettings = userData.notificationSettings || {};
      if (notificationSettings.enabled !== true || notificationSettings.feedingPreparationEnabled === false) continue;

      const snakes = await userDocument.ref.collection("snakes").get();
      for (const snakeDocument of snakes.docs) {
        const snake = snakeDocument.data();
        const schedule = snake.feedingSchedule;
        if (!schedule || schedule.enabled !== true || schedule.notificationsEnabled === false) continue;
        if (snake.status && snake.status !== "Active") continue;
        if (typeof schedule.nextFeedingDate !== "string") continue;

        const daysUntil = daysBetween(today, schedule.nextFeedingDate);
        if (![2, 1, 0].includes(daysUntil)) continue;

        const alreadyFed = await snakeDocument.ref.collection("feedings").where("date", "==", schedule.nextFeedingDate).limit(1).get();
        if (!alreadyFed.empty) continue;

        const eventKey = `feeding-preparation-${snakeDocument.id}-${schedule.nextFeedingDate}-${daysUntil}`;
        const message = preparationMessage(daysUntil, snake.name || "your snake");
        const delivery = await sendToUserTokens(userDocument.id, eventKey, message);
        if (delivery.sent === 0) continue;

        const { claimed, eventRef } = await claimNotificationEvent(userDocument.id, eventKey, { type: "feeding-preparation", snakeId: snakeDocument.id, snakeName: snake.name || "", feedingDate: schedule.nextFeedingDate, daysUntil });
        if (!claimed) continue;

        await eventRef.set({ status: "sent", sentCount: delivery.sent, invalidTokenCount: delivery.invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true });
        notificationsSent += delivery.sent;
      }
    }

    console.log(`Tiny Titans: feeding preparation notification run complete — ${notificationsSent} notifications sent.`);
  }
);
