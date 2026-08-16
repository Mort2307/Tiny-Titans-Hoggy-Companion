const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

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

function isCreatorRequest(request) {
  return request.auth?.token?.creator === true || request.auth?.token?.admin === true;
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
