const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const adminAuth = getAuth();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const VALID_TIERS = new Set(["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const VALID_MODES = new Set(["silent", "visible"]);
function isOwnerRequest(request) { return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL; }
function normaliseExpiry(value) { if (value === null || value === undefined || value === "") return null; const millis = new Date(String(value)).getTime(); if (!Number.isFinite(millis)) throw new HttpsError("invalid-argument", "Tester expiry must be a valid date/time."); if (millis <= Date.now()) throw new HttpsError("invalid-argument", "Tester expiry must be in the future."); return Timestamp.fromMillis(millis); }

exports.setPaidTesterOverride = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can manage paid-feature testing.");
  const targetUid = String(request.data?.targetUid || "").trim(); const enabled = request.data?.enabled === true; const tier = String(request.data?.tier || "free"); const mode = String(request.data?.mode || "visible");
  if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
  if (!VALID_TIERS.has(tier)) throw new HttpsError("invalid-argument", "Invalid paid tester tier.");
  if (!VALID_MODES.has(mode)) throw new HttpsError("invalid-argument", "Invalid tester visibility mode.");
  await adminAuth.getUser(targetUid);
  const userRef = db.collection("users").doc(targetUid);
  if (!enabled) {
    const current = await userRef.get(); const actualTier = current.exists && VALID_TIERS.has(String(current.data()?.subscriptionTier || "")) ? String(current.data().subscriptionTier) : "free";
    await userRef.set({ paidTesterOverride: { enabled: false, tier: "free", mode, revokedAt: FieldValue.serverTimestamp(), revokedByUid: request.auth.uid } }, { merge: true });
    await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "revoke_paid_tier_tester_override", createdAt: FieldValue.serverTimestamp() });
    return { success: true, targetUid, effectiveTier: actualTier, enabled: false };
  }
  const expiresAt = normaliseExpiry(request.data?.expiresAt);
  await userRef.set({ paidTesterOverride: { enabled: true, tier, mode, grantedAt: FieldValue.serverTimestamp(), grantedByUid: request.auth.uid, expiresAt } }, { merge: true });
  await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "grant_paid_tier_tester_override", tier, mode, expiresAt, createdAt: FieldValue.serverTimestamp() });
  return { success: true, targetUid, effectiveTier: tier, enabled: true };
});

exports.getPaidTierAccess = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const requestedUid = String(request.data?.uid || request.auth.uid);
  if (requestedUid !== request.auth.uid && !isOwnerRequest(request)) throw new HttpsError("permission-denied", "You cannot inspect another user's paid access.");
  const snapshot = await db.collection("users").doc(requestedUid).get(); const data = snapshot.exists ? snapshot.data() : {};
  const actualTier = VALID_TIERS.has(String(data.subscriptionTier || "")) ? String(data.subscriptionTier) : "free";
  const override = data.paidTesterOverride || null; const overrideEnabled = override?.enabled === true && VALID_TIERS.has(String(override?.tier || "")) && (!override.expiresAt?.toMillis || override.expiresAt.toMillis() > Date.now());
  const status = String(data.subscriptionStatus || (actualTier === "free" ? "free" : "active"));
  const statusAllowsPaidAccess = actualTier === "free" || status === "active" || status === "trialing";
  const effectiveTier = overrideEnabled ? String(override.tier) : statusAllowsPaidAccess ? actualTier : "free";
  return { success: true, uid: requestedUid, actualTier, effectiveTier, source: overrideEnabled ? "tester" : effectiveTier === "free" ? "free" : "subscription", subscriptionStatus: status, testerOverride: overrideEnabled ? { ...override, tier: String(override.tier) } : null };
});

Object.assign(exports, require("./paidSubscriptions"));
Object.assign(exports, require("./paidBusiness"));
