const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const Stripe = require("stripe");
const { recordPaidTierActivationNotification } = require("./creatorPaidTier");

const db = getFirestore();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const LOOKUP_KEYS = Object.freeze({
  titan_pro: "tinytitans_titan_pro_monthly",
  titan_seller: "tinytitans_titan_seller_monthly",
  business_starter: "tinytitans_business_starter_monthly",
  business_plus: "tinytitans_business_plus_monthly",
  business_advanced: "tinytitans_business_advanced_monthly",
});
const ORIGINS = new Set(["https://tinytitans-hoggy-companion.web.app", "https://tinytitans-hoggy-companion.firebaseapp.com", "http://localhost:5173", "http://127.0.0.1:5173"]);
function origin(request) { const value = request.rawRequest?.headers?.origin || ""; return ORIGINS.has(value) ? value : "https://tinytitans-hoggy-companion.web.app"; }
function owner(request) { return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL; }
function tierFromPrice(price) { const lookup = String(price?.lookup_key || ""); const found = Object.entries(LOOKUP_KEYS).find(([, value]) => value === lookup); return found?.[0] || String(price?.metadata?.tinyTitansTier || ""); }
function timestampOrNull(unixSeconds) { return Number.isFinite(Number(unixSeconds)) && Number(unixSeconds) > 0 ? Timestamp.fromMillis(Number(unixSeconds) * 1000) : null; }
async function findRecurringPrice(stripe, tier) {
  const lookup = LOOKUP_KEYS[tier];
  const result = await stripe.prices.list({ lookup_keys: [lookup], active: true, type: "recurring", limit: 1 });
  const price = result.data[0];
  if (!price || price.type !== "recurring" || !price.recurring) throw new HttpsError("failed-precondition", `${tier} is not configured in Stripe yet. Create its recurring monthly price using lookup key ${lookup}.`);
  return price;
}

exports.createPaidSubscriptionCheckout = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const tier = String(request.data?.tier || "");
  if (!TIERS.has(tier)) throw new HttpsError("invalid-argument", "Invalid paid subscription tier.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const price = await findRecurringPrice(stripe, tier);
    const userRef = db.collection("users").doc(request.auth.uid);
    const user = await userRef.get();
    const existingCustomerId = user.exists ? String(user.data()?.stripeCustomerId || "") : "";
    const checkout = await stripe.checkout.sessions.create({ mode: "subscription", line_items: [{ price: price.id, quantity: 1 }], ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: request.auth.token.email || undefined }), client_reference_id: request.auth.uid, allow_promotion_codes: true, subscription_data: { metadata: { uid: request.auth.uid, tinyTitansTier: tier } }, metadata: { uid: request.auth.uid, tinyTitansTier: tier }, success_url: `${origin(request)}/account/billing?subscription=success`, cancel_url: `${origin(request)}/plans?subscription=cancelled` });
    if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: checkout.url };
  } catch (error) {
    console.error("Paid subscription checkout failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to start subscription checkout.");
  }
});

exports.createPaidBillingPortalSession = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const user = await db.collection("users").doc(request.auth.uid).get();
  const customerId = String(user.data()?.stripeCustomerId || "");
  if (!customerId) throw new HttpsError("failed-precondition", "No Stripe customer is linked to this account yet.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin(request)}/account/billing` });
    return { url: session.url };
  } catch (error) {
    console.error("Billing portal creation failed", error);
    throw new HttpsError("internal", "Unable to open Stripe billing management.");
  }
});

exports.paidSubscriptionWebhook = onRequest({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).send("Missing Stripe signature");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription" && session.payment_status !== "unpaid") {
        const uid = String(session.metadata?.uid || session.client_reference_id || "");
        const tier = String(session.metadata?.tinyTitansTier || "");
        if (uid && TIERS.has(tier)) {
          const userRef = db.collection("users").doc(uid);
          const userSnapshot = await userRef.get();
          const before = userSnapshot.data() || {};
          await userRef.set({ subscriptionTier: tier, subscriptionStatus: "active", stripeCustomerId: session.customer || null, stripeSubscriptionId: session.subscription || null, subscriptionUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
          const wasAlreadyActive = String(before.subscriptionTier || "") === tier && ["active", "trialing"].includes(String(before.subscriptionStatus || ""));
          if (!wasAlreadyActive) {
            const targetName = String(before.displayName || before.name || requestSafeEmail(session.customer_details?.email || "") || "A Tiny Titans user");
            await recordPaidTierActivationNotification({ eventKey: `paid-tier-subscription-${event.id}`, targetUid: uid, targetName, tier, activationKind: "subscription", source: "stripe" });
          }
        }
      }
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object;
      const uid = String(subscription.metadata?.uid || "");
      const tier = TIERS.has(String(subscription.metadata?.tinyTitansTier || "")) ? String(subscription.metadata.tinyTitansTier) : tierFromPrice(subscription.items?.data?.[0]?.price);
      if (uid && TIERS.has(tier)) await db.collection("users").doc(uid).set({ subscriptionTier: tier, subscriptionStatus: String(subscription.status || "active"), stripeCustomerId: subscription.customer || null, stripeSubscriptionId: subscription.id, subscriptionCurrentPeriodEnd: timestampOrNull(subscription.current_period_end), cancelAtPeriodEnd: subscription.cancel_at_period_end === true, subscriptionUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (uid && TIERS.has(tier) && event.type === "customer.subscription.updated" && ["active", "trialing"].includes(String(subscription.status || "")) && event.data.previous_attributes?.status && !["active", "trialing"].includes(String(event.data.previous_attributes.status))) {
        const targetSnapshot = await db.collection("users").doc(uid).get();
        const target = targetSnapshot.data() || {};
        await recordPaidTierActivationNotification({ eventKey: `paid-tier-subscription-${event.id}`, targetUid: uid, targetName: String(target.displayName || target.name || "A Tiny Titans user"), tier, activationKind: "subscription", source: "stripe-status-transition" });
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const uid = String(subscription.metadata?.uid || "");
      if (uid) await db.collection("users").doc(uid).set({ subscriptionTier: "free", subscriptionStatus: "canceled", stripeCustomerId: subscription.customer || null, stripeSubscriptionId: subscription.id, subscriptionCurrentPeriodEnd: timestampOrNull(subscription.current_period_end), cancelAtPeriodEnd: false, subscriptionUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Paid subscription webhook failed", error);
    return res.status(400).send("Invalid webhook signature or event");
  }
});

function requestSafeEmail(value) { const email = String(value || "").trim(); return email && email.includes("@") ? email : ""; }
