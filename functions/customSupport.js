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
  const allowed = new Set([
    "https://tinytitans-hoggy-companion.web.app",
    "https://tinytitans-hoggy-companion.firebaseapp.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
  return allowed.has(origin) ? origin : "https://tinytitans-hoggy-companion.web.app";
}

function parseCustomAmountPence(value) {
  const raw = String(value ?? "").trim().replace(/£/g, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw new HttpsError("invalid-argument", "Enter a valid support amount in GBP.");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 1) throw new HttpsError("invalid-argument", "Custom support must be at least £1.00.");
  const pence = Math.round(amount * 100);
  if (pence < 100) throw new HttpsError("invalid-argument", "Custom support must be at least £1.00.");
  if (pence > 99999999) throw new HttpsError("invalid-argument", "That support amount is above Stripe's maximum supported GBP checkout amount.");
  return pence;
}

exports.createTitanCheckout = onCall(
  { region: "europe-west2", secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to become a Titan.");

    const tierKey = String(request.data?.tier || "").trim();
    let amountPence;
    let label;

    if (tierKey === "custom") {
      amountPence = parseCustomAmountPence(request.data?.amountGbp);
      label = "Custom Titan Support";
    } else {
      const tier = SUPPORT_TIERS[tierKey];
      if (!tier) throw new HttpsError("invalid-argument", "Invalid Titan support option.");
      amountPence = tier.amount * 100;
      label = tier.label;
    }

    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const origin = getAllowedOrigin(request);
      const amountGbp = (amountPence / 100).toFixed(2);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Tiny Titans Support",
              description: label,
            },
            unit_amount: amountPence,
          },
          quantity: 1,
        }],
        customer_email: request.auth.token.email || undefined,
        client_reference_id: request.auth.uid,
        metadata: {
          uid: request.auth.uid,
          tier: tierKey,
          label,
          amount_gbp: amountGbp,
        },
        success_url: `${origin}/become-a-titan?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/become-a-titan?payment=cancelled`,
        billing_address_collection: "auto",
      });

      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url };
    } catch (error) {
      console.error("Flexible Titan Stripe checkout creation failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Unable to start Stripe Checkout.");
    }
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
        const amountPence = Number(session.amount_total || 0);
        const amountGbp = amountPence / 100;
        const tierKey = String(session.metadata?.tier || "custom");
        const tier = SUPPORT_TIERS[tierKey];
        const label = session.metadata?.label || tier?.label || "Custom Titan Support";
        const eventRef = db.collection("stripeEvents").doc(event.id);

        if (uid && session.payment_status === "paid" && amountPence >= 100) {
          const existingEvent = await eventRef.get();
          if (!existingEvent.exists) {
            await eventRef.set({ type: event.type, uid, amountGbp, processedAt: FieldValue.serverTimestamp() });
            await db.collection("supporters").doc(uid).set({
              uid,
              status: "active",
              tier: tierKey,
              tierLabel: label,
              amountGbp,
              stripeCustomerId: session.customer || null,
              stripeCheckoutSessionId: session.id,
              lastPaymentAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            await db.collection("supporterStats").doc("global").set({
              totalSupporters: FieldValue.increment(1),
              totalReceivedGbp: FieldValue.increment(amountGbp),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook verification/processing failed", error);
      return res.status(400).send("Invalid Stripe webhook signature or event");
    }
  }
);
