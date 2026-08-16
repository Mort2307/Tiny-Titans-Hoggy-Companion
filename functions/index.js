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

const PRICE_TIERS = Object.freeze({
  little: { priceId: "price_1U51PDI4DKNMJVXDaEvd0OUJ", amount: 5, label: "Little Titan" },
  growing: { priceId: "price_1U51PHI4DKNMJVXDYWQlFoRv", amount: 10, label: "Growing Titan" },
  champion: { priceId: "price_1U51PMI4DKNMJVXD014dtANW", amount: 20, label: "Champion Titan" },
  legendary: { priceId: "price_1U51PRI4DKNMJVXDgIZKBg4k", amount: 40, label: "Legendary Titan" },
  broken: { priceId: "price_1U51PWI4DKNMJVXD4flYcU4R", amount: 100, label: "You Just Broke Me" },
});

const MIN_CUSTOM_SUPPORT_GBP = 1;
const MAX_CUSTOM_SUPPORT_GBP = 1000;

const ALLOWED_ORIGINS = new Set(["https://tinytitans-hoggy-companion.web.app", "https://tinytitans-hoggy-companion.firebaseapp.com", "http://localhost:5173", "http://127.0.0.1:5173"]);

function getAllowedOrigin(request) {
  const origin = request.rawRequest?.headers?.origin || "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "https://tinytitans-hoggy-companion.web.app";
}

async function getUserRole(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.exists ? snapshot.data()?.role : null;
}

function canManageRoles(role, claims = {}) {
  return role === "creator" || role === "admin" || claims.creator === true || claims.admin === true;
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
  const callerRole = await getUserRole(callerUid);
  if (!canManageRoles(callerRole, request.auth.token || {})) throw new HttpsError("permission-denied", "Only the Creator or an administrator can manage admin access.");
  const uid = String(request.data?.uid || "").trim();
  const role = String(request.data?.role || "user").trim();
  if (!uid || !["user", "moderator", "admin"].includes(role)) throw new HttpsError("invalid-argument", "Invalid user or administrator role.");
  if (uid === callerUid && role !== "admin" && callerRole === "creator") throw new HttpsError("failed-precondition", "The Creator account cannot remove its own Creator access.");
  const targetRole = await getUserRole(uid);
  if (targetRole === "creator") throw new HttpsError("failed-precondition", "The Creator account cannot be changed by the Admin Centre.");
  await db.collection("users").doc(uid).set({ role }, { merge: true });
  await adminAuth.setCustomUserClaims(uid, { creator: false, admin: role === "admin", moderator: role === "moderator" || role === "admin" });
  return { uid, role };
});

exports.createTitanCheckout = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to become a Titan.");
  const tierKey = String(request.data?.tier || "");
  let amountGbp;
  let label;
  let priceLineItem;

  if (tierKey === "custom") {
    const rawAmount = Number(request.data?.customAmountGbp);
    if (!Number.isFinite(rawAmount) || rawAmount < MIN_CUSTOM_SUPPORT_GBP || rawAmount > MAX_CUSTOM_SUPPORT_GBP) {
      throw new HttpsError("invalid-argument", `Custom Titan support must be between £${MIN_CUSTOM_SUPPORT_GBP} and £${MAX_CUSTOM_SUPPORT_GBP}.`);
    }
    amountGbp = Number(rawAmount.toFixed(2));
    label = "Custom Titan Support";
    priceLineItem = {
      price_data: {
        currency: "gbp",
        product_data: { name: "Tiny Titans — Custom Titan Support", description: "One-time voluntary support for Tiny Titans." },
        unit_amount: Math.round(amountGbp * 100),
      },
      quantity: 1,
    };
  } else {
    const tier = PRICE_TIERS[tierKey];
    if (!tier) throw new HttpsError("invalid-argument", "Invalid Titan support tier.");
    amountGbp = tier.amount;
    label = tier.label;
    priceLineItem = { price: tier.priceId, quantity: 1 };
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const origin = getAllowedOrigin(request);
    const session = await stripe.checkout.sessions.create({ mode: "payment", line_items: [priceLineItem], customer_email: request.auth.token.email || undefined, client_reference_id: request.auth.uid, metadata: { uid: request.auth.uid, tier: tierKey, label, amount_gbp: amountGbp.toFixed(2), support_type: "voluntary_support" }, success_url: `${origin}/become-a-titan?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/become-a-titan?payment=cancelled`, billing_address_collection: "auto" });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    throw new HttpsError("internal", "Unable to start Stripe Checkout.");
  }
});

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
      const tierKey = String(session.metadata?.tier || "");
      const tier = PRICE_TIERS[tierKey];
      const amountGbp = Number(session.metadata?.amount_gbp || 0);
      const tierLabel = tier?.label || (tierKey === "custom" ? "Custom Titan Support" : String(session.metadata?.label || "Titan Supporter"));
      if (uid && amountGbp > 0 && session.payment_status === "paid") {
        await db.collection("supporters").doc(uid).set({ uid, status: "active", tier: tierKey, tierLabel, amountGbp, stripeCustomerId: session.customer || null, stripeCheckoutSessionId: session.id, lastPaymentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await db.collection("supporterStats").doc("global").set({ totalSupporters: FieldValue.increment(1), totalReceivedGbp: FieldValue.increment(amountGbp), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook verification/processing failed", error);
    return res.status(400).send("Invalid webhook signature or event");
  }
});

const TESTER_WEB_API_KEY = "AIzaSyCaUnpNpfoGcmgs3cfe8PXYTeU7_lz50d0";
const TESTER_PROJECT_ID = "tinytitans-hoggy-companion";
const SECURITY_TEST_UID = "tiny-titans-security-user";

async function ensureSecurityTestUser() {
  try {
    await adminAuth.getUser(SECURITY_TEST_UID);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    await adminAuth.createUser({ uid: SECURITY_TEST_UID, disabled: false });
  }
  await adminAuth.setCustomUserClaims(SECURITY_TEST_UID, { creator: false, admin: false, moderator: false });
  await db.collection("users").doc(SECURITY_TEST_UID).set({ role: "user", isTester: true, isSecurityTestUser: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return SECURITY_TEST_UID;
}

async function signInSecurityTestUser() {
  const uid = await ensureSecurityTestUser();
  const customToken = await adminAuth.createCustomToken(uid, { securityTest: true });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${TESTER_WEB_API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) });
  const body = await response.json();
  if (!response.ok || !body.idToken) throw new Error(`Security test identity token exchange failed: ${body.error?.message || response.status}`);
  return { idToken: body.idToken, uid };
}

async function firestoreAsUser(idToken, method, path, body) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${TESTER_PROJECT_ID}/databases/(default)/documents/${path}`, { method, headers: { Authorization: `Bearer ${idToken}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.text() };
}

async function chooseTargetUser(testUid) {
  const users = await db.collection("users").limit(50).get();
  const target = users.docs.find((item) => item.id !== testUid && item.data()?.isSecurityTestUser !== true);
  if (!target) return null;
  const snakes = await db.collection("users").doc(target.id).collection("snakes").limit(1).get();
  return { uid: target.id, snakeId: snakes.empty ? null : snakes.docs[0].id };
}

exports.runSecurityAttackSuite = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Creator authentication is required.");
  const callerRole = await getUserRole(request.auth.uid);
  if (!request.auth.token?.creator && !request.auth.token?.admin && callerRole !== "creator" && callerRole !== "admin") throw new HttpsError("permission-denied", "Only Creator/Admin accounts can start the security attack suite.");

  try {
    const securityUser = await signInSecurityTestUser();
    const target = await chooseTargetUser(securityUser.uid);
    if (!target) return { status: "blocked", reason: "No separate real user exists for cross-user security testing." };

    const results = [];
    const targetUserPath = `users/${target.uid}`;
    const targetProbeId = `security-${Date.now()}`;
    const targetProbePath = `users/${target.uid}/__testerSecurityProbes/${targetProbeId}`;

    const readTarget = await firestoreAsUser(securityUser.idToken, "GET", targetUserPath);
    results.push({ id: "firestore-cross-user-read", expected: 403, actual: readTarget.status, status: readTarget.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's profile" });

    const writeTarget = await firestoreAsUser(securityUser.idToken, "PATCH", targetProbePath, { fields: { securityProbe: { booleanValue: true } } });
    results.push({ id: "firestore-cross-user-write", expected: 403, actual: writeTarget.status, status: writeTarget.status === 403 ? "pass" : "fail", descriptor: "Normal User → another user's Firestore document" });
    if (writeTarget.status !== 403) await db.doc(targetProbePath).delete().catch(() => undefined);

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
});
