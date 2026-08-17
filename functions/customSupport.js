const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const db = getFirestore();

const SUPPORT_TIERS = Object.freeze({
  starter: { amount: 1, label: "Titan Supporter" },
  little: { amount: 5, label: "Little Titan" },
  growing: { amount: 10, label: "Growing Titan" },
  champion: { amount: 20, label: "Champion Titan" },
  legendary: { amount: 40, label: "Legendary Titan" },
  broken: { amount: 100, label: "You Just Broke Me" },
});

function getAllowedOrigin(request) {
  const origin = request.rawRequest?.headers?.origin || "";
  const allowed = new Set(["https://tinytitans-hoggy-companion.web.app", "https://tinytitans-hoggy-companion.firebaseapp.com", "http://localhost:5173", "http://127.0.0.1:5173"]);
  return allowed.has(origin) ? origin : "https://tinytitans-hoggy-companion.web.app";
}

function parseCustomAmountPence(value) {
  const raw = String(value ?? "").trim().replace(/£/g, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new HttpsError("invalid-argument", "Enter a valid support amount in GBP.");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 1) throw new HttpsError("invalid-argument", "Custom support must be at least £1.00.");
  const pence = Math.round(amount * 100);
  if (pence > 99999999) throw new HttpsError("invalid-argument", "That support amount is above Stripe's maximum supported GBP checkout amount.");
  return pence;
}

function buildSupportLineItem(amountPence, label) {
  return { price_data: { currency: "gbp", product_data: { name: `Tiny Titans — ${label}`, description: "One-time voluntary support contribution to Tiny Titans Hoggy Companion. This payment is project support and does not purchase goods, services, membership, or administrative access." }, unit_amount: amountPence }, quantity: 1 };
}

async function writePaidSupport(uid, session) {
  const amountGbp = Number(session.amount_total || 0) / 100;
  if (!uid || session.payment_status !== "paid" || amountGbp < 1) return { recorded: false, reason: "not-paid" };
  const tierKey = String(session.metadata?.tier || "custom");
  const tier = SUPPORT_TIERS[tierKey];
  const label = session.metadata?.label || tier?.label || "Custom Tiny Titans Support";
  const supporterRef = db.collection("supporters").doc(uid);
  const wallRef = db.collection("supporterWall").doc(uid);
  const eventRef = db.collection("stripeEvents").doc(`checkout_${session.id}`);
  const existing = await supporterRef.get();
  if (!existing.exists || existing.data()?.status !== "active") {
    await supporterRef.set({ uid, status: "active", tier: tierKey, tierLabel: label, amountGbp, stripeCustomerId: session.customer || null, stripeCheckoutSessionId: session.id, lastPaymentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await wallRef.set({ uid, displayName: "Anonymous Titan", socialUrl: "", visibility: "anonymous", tierLabel: label, amountGbp, supportedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await eventRef.set({ type: "support-recorded", uid, sessionId: session.id, amountGbp, processedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("supporterStats").doc("global").set({ totalSupporters: FieldValue.increment(1), totalReceivedGbp: FieldValue.increment(amountGbp), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { recorded: true, createdWall: true };
  }
  const wall = await wallRef.get();
  if (!wall.exists) await wallRef.set({ uid, displayName: "Anonymous Titan", socialUrl: "", visibility: "anonymous", tierLabel: label, amountGbp, supportedAt: existing.data()?.lastPaymentAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { recorded: false, createdWall: !wall.exists };
}

async function recoverLatestPaidSession(uid, stripe) {
  const sessions = await stripe.checkout.sessions.list({ limit: 100, status: "complete" });
  const matches = sessions.data.filter((session) => {
    const sessionUid = String(session.metadata?.uid || session.client_reference_id || "");
    return sessionUid === uid && session.payment_status === "paid" && Number(session.amount_total || 0) >= 100;
  });
  matches.sort((a, b) => Number(b.created || 0) - Number(a.created || 0));
  return matches[0] || null;
}

async function createCheckout(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to become a Titan.");
  const tierKey = String(request.data?.tier || "").trim();
  const tier = SUPPORT_TIERS[tierKey];
  if (tierKey !== "custom" && !tier) throw new HttpsError("invalid-argument", "Invalid Titan support option.");
  const stripeSecret = STRIPE_SECRET_KEY.value();
  if (!stripeSecret || !stripeSecret.startsWith("sk_")) throw new HttpsError("failed-precondition", "Stripe support payments are not configured on the live server yet.");
  try {
    const stripe = new Stripe(stripeSecret);
    const origin = getAllowedOrigin(request);
    let amountPence;
    let amountGbp;
    let label;
    if (tierKey === "custom") { amountPence = parseCustomAmountPence(request.data?.amountGbp); amountGbp = (amountPence / 100).toFixed(2); label = `Support — £${amountGbp}`; }
    else { amountPence = Math.round(tier.amount * 100); amountGbp = tier.amount.toFixed(2); label = tier.label; }
    const session = await stripe.checkout.sessions.create({ mode: "payment", line_items: [buildSupportLineItem(amountPence, label)], customer_email: request.auth.token.email || undefined, client_reference_id: request.auth.uid, metadata: { uid: request.auth.uid, tier: tierKey, label, amount_gbp: amountGbp, payment_purpose: "one_time_project_support" }, success_url: `${origin}/become-a-titan?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/become-a-titan?payment=cancelled`, billing_address_collection: "auto", managed_payments: { enabled: false } });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  } catch (error) {
    console.error("Tiny Titans Stripe checkout creation failed", { type: error?.type || null, code: error?.code || null, statusCode: error?.statusCode || null, message: error?.message || String(error), requestId: error?.requestId || null });
    if (error instanceof HttpsError) throw error;
    const stripeMessage = error?.type === "StripeAuthenticationError" ? "Stripe authentication failed on the server." : error?.type === "StripeInvalidRequestError" ? `Stripe rejected the checkout request: ${error.message}` : "Stripe Checkout could not be started. Please try again.";
    throw new HttpsError("internal", stripeMessage);
  }
}

exports.finalizeTitanSupport = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const sessionId = String(request.data?.sessionId || "").trim();
  if (!sessionId) throw new HttpsError("invalid-argument", "A Stripe checkout session is required.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUid = String(session.metadata?.uid || session.client_reference_id || "");
    if (sessionUid !== request.auth.uid) throw new HttpsError("permission-denied", "That Stripe checkout session does not belong to this account.");
    return await writePaidSupport(request.auth.uid, session);
  } catch (error) {
    console.error("Tiny Titans support finalisation failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Your support payment could not be finalised yet. Please refresh the Wall shortly.");
  }
});

exports.reconcileTitanWall = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to view the Wall of Titans.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const existingSupporter = await db.collection("supporters").doc(request.auth.uid).get();
    if (!existingSupporter.exists || existingSupporter.data()?.status !== "active") {
      const recovered = await recoverLatestPaidSession(request.auth.uid, stripe);
      if (recovered) await writePaidSupport(request.auth.uid, recovered);
    }
    const supportersSnapshot = await db.collection("supporters").where("status", "==", "active").get();
    let created = 0;
    for (const supporterDoc of supportersSnapshot.docs) {
      const uid = supporterDoc.id;
      const supporter = supporterDoc.data();
      const wallRef = db.collection("supporterWall").doc(uid);
      const wallDoc = await wallRef.get();
      if (wallDoc.exists) continue;
      await wallRef.create({ uid, displayName: "Anonymous Titan", socialUrl: "", visibility: "anonymous", tierLabel: String(supporter.tierLabel || "Titan Supporter"), amountGbp: Number(supporter.amountGbp || 0), supportedAt: supporter.lastPaymentAt || null, updatedAt: FieldValue.serverTimestamp() });
      created += 1;
    }
    return { created, checked: supportersSnapshot.size };
  } catch (error) {
    console.error("Tiny Titans Wall reconciliation failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "The Wall of Titans could not be refreshed right now.");
  }
});

exports.createTitanCheckoutV2 = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, createCheckout);
exports.createTitanCheckout = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, createCheckout);

exports.stripeWebhook = onRequest({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).send("Missing Stripe signature");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const uid = session.metadata?.uid || session.client_reference_id;
      await writePaidSupport(uid, session);
    }
    return res.status(200).json({ received: true });
  } catch (error) { console.error("Stripe webhook verification/processing failed", error); return res.status(400).send("Invalid webhook signature or event"); }
});
