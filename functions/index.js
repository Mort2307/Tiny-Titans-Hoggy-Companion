const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const Stripe = require("stripe");

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
const adminStorage = getStorage();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const TESTER_SECURITY_EMAIL = defineSecret("TESTER_SECURITY_EMAIL");
const TESTER_SECURITY_PASSWORD = defineSecret("TESTER_SECURITY_PASSWORD");

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

async function getUserRole(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.exists ? snapshot.data()?.role : null;
}

exports.syncMyCreatorClaims = onCall({ region: "europe-west2" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const role = await getUserRole(uid);
  const isAdmin = role === "admin";
  const isCreator = isAdmin || role === "creator";
  const isModerator = isAdmin || isCreator || role === "moderator";
  await adminAuth.setCustomUserClaims(uid, { creator: isCreator, admin: isAdmin, moderator: isModerator });
  return { creator: isCreator, admin: isAdmin, moderator: isModerator };
});

exports.setCreatorClaims = onCall({ region: "europe-west2" }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if ((await getUserRole(callerUid)) !== "admin") throw new HttpsError("permission-denied", "Only an administrator can manage Creator access.");
  const uid = String(request.data?.uid || "").trim();
  const role = String(request.data?.role || "user").trim();
  if (!uid || !["user", "creator", "moderator", "admin"].includes(role)) throw new HttpsError("invalid-argument", "Invalid user or Creator role.");
  await db.collection("users").doc(uid).set({ role }, { merge: true });
  await adminAuth.setCustomUserClaims(uid, { creator: role === "creator" || role === "admin", admin: role === "admin", moderator: role === "moderator" || role === "creator" || role === "admin" });
  return { uid, role };
});

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
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: tier.priceId, quantity: 1 }],
        customer_email: request.auth.token.email || undefined,
        client_reference_id: request.auth.uid,
        metadata: { uid: request.auth.uid, tier: tierKey, label: tier.label, amount_gbp: String(tier.amount) },
        success_url: `${origin}/become-a-titan?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/become-a-titan?payment=cancelled`,
        billing_address_collection: "auto",
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url };
    } catch (error) {
      console.error("Stripe checkout creation failed", error);
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
        const tier = PRICE_TIERS[session.metadata?.tier];
        if (uid && tier && session.payment_status === "paid") {
          await db.collection("supporters").doc(uid).set({ uid, status: "active", tier: session.metadata.tier, tierLabel: tier.label, amountGbp: tier.amount, stripeCustomerId: session.customer || null, stripeCheckoutSessionId: session.id, lastPaymentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          await db.collection("supporterStats").doc("global").set({ totalSupporters: FieldValue.increment(1), totalReceivedGbp: FieldValue.increment(tier.amount), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
      }
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook verification/processing failed", error);
      return res.status(400).send("Invalid webhook signature or event");
    }
  }
);

const TESTER_WEB_API_KEY = "AIzaSyCaUnpNpfoGcmgs3cfe8PXYTeU7_lz50d0";
const TESTER_PROJECT_ID = "tinytitans-hoggy-companion";

async function signInSecurityTestUser() {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${TESTER_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TESTER_SECURITY_EMAIL.value(), password: TESTER_SECURITY_PASSWORD.value(), returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok || !body.idToken || !body.localId) throw new Error(`Security test identity sign-in failed: ${body.error?.message || response.status}`);
  return { idToken: body.idToken, uid: body.localId };
}

async function firestoreAsUser(idToken, method, path, body) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${TESTER_PROJECT_ID}/databases/(default)/documents/${path}`, {
    method,
    headers: { Authorization: `Bearer ${idToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.text() };
}

async function chooseTargetUser(testUid) {
  const users = await db.collection("users").limit(50).get();
  const target = users.docs.find((item) => item.id !== testUid);
  if (!target) return null;
  const snakes = await db.collection("users").doc(target.id).collection("snakes").limit(1).get();
  return { uid: target.id, snakeId: snakes.empty ? null : snakes.docs[0].id };
}

exports.runSecurityAttackSuite = onCall(
  { region: "europe-west2", secrets: [TESTER_SECURITY_EMAIL, TESTER_SECURITY_PASSWORD] },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Creator authentication is required.");
    const callerRole = await getUserRole(request.auth.uid);
    if (!request.auth.token?.creator && !request.auth.token?.admin && callerRole !== "creator" && callerRole !== "admin") throw new HttpsError("permission-denied", "Only Creator/Admin accounts can start the security attack suite.");

    try {
      const securityUser = await signInSecurityTestUser();
      const target = await chooseTargetUser(securityUser.uid);
      if (!target) return { status: "blocked", reason: "No separate target user exists for cross-user security testing." };

      const results = [];
      const targetUserPath = `users/${target.uid}`;
      const targetProbePath = `users/${target.uid}/__testerSecurityProbes/security-${Date.now()}`;

      const readTarget = await firestoreAsUser(securityUser.idToken, "GET", targetUserPath);
      results.push({ id: "firestore-cross-user-read", expected: 403, actual: readTarget.status, status: readTarget.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's profile" });

      const writeTarget = await firestoreAsUser(securityUser.idToken, "PATCH", targetProbePath, { fields: { securityProbe: { booleanValue: true } } });
      results.push({ id: "firestore-cross-user-write", expected: 403, actual: writeTarget.status, status: writeTarget.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's Firestore document" });

      const deleteTarget = await firestoreAsUser(securityUser.idToken, "DELETE", targetProbePath);
      results.push({ id: "firestore-cross-user-delete", expected: 403, actual: deleteTarget.status, status: deleteTarget.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's Firestore delete" });

      if (target.snakeId) {
        const readSnake = await firestoreAsUser(securityUser.idToken, "GET", `users/${target.uid}/snakes/${target.snakeId}`);
        results.push({ id: "firestore-cross-user-snake-read", expected: 403, actual: readSnake.status, status: readSnake.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's snake profile" });
      }

      const targetFiles = await adminStorage.bucket().getFiles({ prefix: `users/${target.uid}/snakes/`, maxResults: 1 });
      if (targetFiles[0]?.length) {
        const objectName = targetFiles[0][0].name;
        const storageRead = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(adminStorage.bucket().name)}/o/${encodeURIComponent(objectName)}`, { headers: { Authorization: `Bearer ${securityUser.idToken}` } });
        results.push({ id: "storage-cross-user-read", expected: 403, actual: storageRead.status, status: storageRead.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's Storage object" });
      } else {
        results.push({ id: "storage-cross-user-read", expected: "403 against an existing target object", actual: "No target Storage object available", status: "blocked", descriptor: "Normal User → another user's Storage object" });
      }

      const resultStatus = results.some((item) => item.status === "fail") ? "failed" : results.some((item) => item.status === "blocked") ? "blocked" : "passed";
      return { status: resultStatus, securityUserUid: securityUser.uid, targetUserUid: target.uid, results };
    } catch (error) {
      console.error("Security attack suite failed to execute", error);
      throw new HttpsError("internal", "The server-side security attack suite could not complete.");
    }
  }
);
