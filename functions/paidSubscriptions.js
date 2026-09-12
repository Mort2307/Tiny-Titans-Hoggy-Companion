const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const Stripe = require("stripe");
const { recordPaidTierActivationNotification } = require("./paidTierNotification");

const db = getFirestore();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_PAID_SUBSCRIPTION_WEBHOOK_SECRET = defineSecret("STRIPE_PAID_SUBSCRIPTION_WEBHOOK_SECRET");
const TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const LOOKUP_KEYS = Object.freeze({
  titan_pro: "tinytitans_titan_pro_monthly",
  titan_seller: "tinytitans_titan_seller_monthly",
  business_starter: "tinytitans_business_starter_monthly",
  business_plus: "tinytitans_business_plus_monthly",
  business_advanced: "tinytitans_business_advanced_monthly",
});
const ORIGINS = new Set([
  "https://tinytitans-hoggy-companion.web.app",
  "https://tinytitans-hoggy-companion.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const ACTIVE_ACCESS_STATUSES = new Set(["active", "trialing"]);
const SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "incomplete_expired", "canceled"]);

function origin(request) {
  const value = request.rawRequest?.headers?.origin || "";
  return ORIGINS.has(value) ? value : "https://tinytitans-hoggy-companion.web.app";
}

function tierFromPrice(price) {
  const lookup = String(price?.lookup_key || "");
  const found = Object.entries(LOOKUP_KEYS).find(([, value]) => value === lookup);
  return found?.[0] || String(price?.metadata?.tinyTitansTier || "");
}

function timestampOrNull(unixSeconds) {
  return Number.isFinite(Number(unixSeconds)) && Number(unixSeconds) > 0
    ? Timestamp.fromMillis(Number(unixSeconds) * 1000)
    : null;
}

function normaliseStatus(status) {
  const value = String(status || "").trim();
  return SUBSCRIPTION_STATUSES.has(value) ? value : "active";
}

async function findRecurringPrice(stripe, tier) {
  const lookup = LOOKUP_KEYS[tier];
  const result = await stripe.prices.list({ lookup_keys: [lookup], active: true, type: "recurring", limit: 1 });
  const price = result.data[0];
  if (!price || !price.recurring) {
    throw new HttpsError("failed-precondition", `${tier} is not configured in Stripe yet. Create its recurring monthly price using lookup key ${lookup}.`);
  }
  return price;
}

async function writeSubscriptionState({ uid, tier, status, customerId, subscriptionId, currentPeriodEnd, cancelAtPeriodEnd, sourceEventId }) {
  const safeTier = TIERS.has(String(tier || "")) ? String(tier) : "free";
  const safeStatus = safeTier === "free" ? "canceled" : normaliseStatus(status);
  const periodEnd = timestampOrNull(currentPeriodEnd);
  const userRef = db.collection("users").doc(uid);
  const subscriptionRef = db.collection("paidSubscriptions").doc(uid);
  const entitlementRef = db.collection("paidEntitlements").doc(uid);
  const update = {
    subscriptionTier: safeTier,
    subscriptionStatus: safeStatus,
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    subscriptionCurrentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: cancelAtPeriodEnd === true,
    subscriptionUpdatedAt: FieldValue.serverTimestamp(),
  };
  const subscriptionRecord = {
    uid,
    tier: safeTier,
    status: safeStatus,
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: cancelAtPeriodEnd === true,
    sourceEventId: sourceEventId || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const entitlementRecord = {
    uid,
    tier: safeTier,
    source: safeTier === "free" ? "free" : "subscription",
    status: safeStatus,
    active: safeTier !== "free" && ACTIVE_ACCESS_STATUSES.has(safeStatus),
    stripeSubscriptionId: subscriptionId || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.runTransaction(async (transaction) => {
    transaction.set(userRef, update, { merge: true });
    transaction.set(subscriptionRef, subscriptionRecord, { merge: true });
    transaction.set(entitlementRef, entitlementRecord, { merge: true });
  });
}

async function beginWebhookEvent(event) {
  const eventRef = db.collection("stripeWebhookEvents").doc(event.id);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.exists && existing.data()?.status === "completed") return { duplicate: true, eventRef };
    transaction.set(eventRef, {
      eventId: event.id,
      type: event.type,
      status: "processing",
      receivedAt: existing.exists ? (existing.data()?.receivedAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { duplicate: false, eventRef };
  });
}

exports.getPaidTierPricing = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const prices = {};
    for (const tier of TIERS) {
      const lookupKey = LOOKUP_KEYS[tier];
      const result = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, type: "recurring", limit: 1 });
      const price = result.data[0];
      prices[tier] = price && price.recurring
        ? { configured: true, priceId: price.id, unitAmount: price.unit_amount, currency: price.currency, interval: price.recurring.interval, intervalCount: price.recurring.interval_count, lookupKey }
        : { configured: false, lookupKey };
    }
    return { success: true, prices };
  } catch (error) {
    console.error("Paid tier pricing lookup failed", error);
    throw new HttpsError("internal", "Unable to read Stripe paid-tier pricing.");
  }
});

exports.createPaidSubscriptionCheckout = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const tier = String(request.data?.tier || "");
  if (!TIERS.has(tier)) throw new HttpsError("invalid-argument", "Invalid paid subscription tier.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const userRef = db.collection("users").doc(request.auth.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {};
    const currentTier = String(userData.subscriptionTier || "free");
    const currentStatus = String(userData.subscriptionStatus || "free");
    if (TIERS.has(currentTier) && ACTIVE_ACCESS_STATUSES.has(currentStatus)) {
      throw new HttpsError("failed-precondition", "This account already has an active Stripe subscription. Manage it from Billing & Access before starting another one.");
    }
    const price = await findRecurringPrice(stripe, tier);
    const existingCustomerId = String(userData.stripeCustomerId || "");
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: request.auth.token.email || undefined }),
      client_reference_id: request.auth.uid,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      subscription_data: {
        metadata: { uid: request.auth.uid, tinyTitansTier: tier, tinyTitansLookupKey: LOOKUP_KEYS[tier] },
      },
      metadata: { uid: request.auth.uid, tinyTitansTier: tier, tinyTitansLookupKey: LOOKUP_KEYS[tier] },
      success_url: `${origin(request)}/account/billing?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin(request)}/plans?subscription=cancelled`,
    });
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

exports.paidSubscriptionWebhook = onRequest({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY, STRIPE_PAID_SUBSCRIPTION_WEBHOOK_SECRET], invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).send("Missing Stripe signature");
  let event;
  let eventRef;
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_PAID_SUBSCRIPTION_WEBHOOK_SECRET.value());
    const claim = await beginWebhookEvent(event);
    if (claim.duplicate) return res.status(200).json({ received: true, duplicate: true });
    eventRef = claim.eventRef;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription") {
        const uid = String(session.metadata?.uid || session.client_reference_id || "");
        const tier = String(session.metadata?.tinyTitansTier || "");
        if (uid && TIERS.has(tier) && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
          await writeSubscriptionState({
            uid,
            tier,
            status: subscription.status,
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            sourceEventId: event.id,
          });
          const userSnapshot = await db.collection("users").doc(uid).get();
          const userData = userSnapshot.data() || {};
          const wasAlreadyActive = String(userData.subscriptionTier || "") === tier && ACTIVE_ACCESS_STATUSES.has(String(userData.subscriptionStatus || ""));
          if (!wasAlreadyActive && ACTIVE_ACCESS_STATUSES.has(String(subscription.status || ""))) {
            const targetName = String(userData.displayName || userData.name || session.customer_details?.email || "A Tiny Titans user");
            await recordPaidTierActivationNotification({ eventKey: `paid-tier-subscription-${event.id}`, targetUid: uid, targetName, tier, activationKind: "subscription", source: "stripe" });
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object;
      const uid = String(subscription.metadata?.uid || "");
      const tier = TIERS.has(String(subscription.metadata?.tinyTitansTier || ""))
        ? String(subscription.metadata.tinyTitansTier)
        : tierFromPrice(subscription.items?.data?.[0]?.price);
      if (uid && TIERS.has(tier)) {
        await writeSubscriptionState({
          uid,
          tier,
          status: subscription.status,
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          sourceEventId: event.id,
        });
        if (event.type === "customer.subscription.updated" && ACTIVE_ACCESS_STATUSES.has(String(subscription.status || "")) && event.data.previous_attributes?.status && !ACTIVE_ACCESS_STATUSES.has(String(event.data.previous_attributes.status))) {
          const targetSnapshot = await db.collection("users").doc(uid).get();
          const target = targetSnapshot.data() || {};
          await recordPaidTierActivationNotification({ eventKey: `paid-tier-subscription-${event.id}`, targetUid: uid, targetName: String(target.displayName || target.name || "A Tiny Titans user"), tier, activationKind: "subscription", source: "stripe-status-transition" });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const uid = String(subscription.metadata?.uid || "");
      if (uid) {
        await writeSubscriptionState({
          uid,
          tier: "free",
          status: "canceled",
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: false,
          sourceEventId: event.id,
        });
      }
    }

    await eventRef.set({ status: "completed", processedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Paid subscription webhook failed", error);
    if (eventRef) {
      try { await eventRef.set({ status: "failed", error: String(error?.message || error), updatedAt: FieldValue.serverTimestamp() }, { merge: true }); } catch (recordError) { console.error("Unable to record failed Stripe webhook", recordError); }
    }
    return res.status(400).send("Invalid webhook signature or event");
  }
});
