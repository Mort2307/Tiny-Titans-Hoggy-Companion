const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const adminAuth = getAuth();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const VALID_TIERS = new Set(["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"]);
const VALID_MODES = new Set(["silent", "visible"]);
function isOwnerRequest(request) { return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL; }
function normaliseExpiry(value) { if (value === null || value === undefined || value === "") return null; const millis = new Date(String(value)).getTime(); if (!Number.isFinite(millis)) throw new HttpsError("invalid-argument", "Tester expiry must be a valid date/time."); if (millis <= Date.now()) throw new HttpsError("invalid-argument", "Tester expiry must be in the future."); return Timestamp.fromMillis(millis); }
function isActiveExpiry(value) { if (!value) return false; if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis() > Date.now(); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) && parsed > Date.now(); }

exports.setPaidTesterOverride = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can manage paid-feature testing.");
  const targetUid = String(request.data?.targetUid || "").trim(); const enabled = request.data?.enabled === true; const tier = String(request.data?.tier || "free"); const mode = String(request.data?.mode || "visible");
  if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required."); if (!VALID_TIERS.has(tier)) throw new HttpsError("invalid-argument", "Invalid paid tester tier."); if (!VALID_MODES.has(mode)) throw new HttpsError("invalid-argument", "Invalid tester visibility mode.");
  await adminAuth.getUser(targetUid); const overrideRef = db.collection("paidTesterOverrides").doc(targetUid);
  if (!enabled) { await overrideRef.set({ enabled: false, tier: "free", mode, revokedAt: FieldValue.serverTimestamp(), revokedByUid: request.auth.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "revoke_paid_tier_tester_override", createdAt: FieldValue.serverTimestamp() }); return { success: true, targetUid, effectiveTier: null, enabled: false }; }
  const expiresAt = normaliseExpiry(request.data?.expiresAt); await overrideRef.set({ uid: targetUid, enabled: true, tier, mode, grantedAt: FieldValue.serverTimestamp(), grantedByUid: request.auth.uid, expiresAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "grant_paid_tier_tester_override", tier, mode, expiresAt, createdAt: FieldValue.serverTimestamp() }); return { success: true, targetUid, effectiveTier: tier, enabled: true };
});

exports.getPaidTierAccess = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const requestedUid = String(request.data?.uid || request.auth.uid); if (requestedUid !== request.auth.uid && !isOwnerRequest(request)) throw new HttpsError("permission-denied", "You cannot inspect another user's paid access.");
  const snapshot = await db.collection("users").doc(requestedUid).get(); const data = snapshot.exists ? snapshot.data() : {};
  const entitlementSnapshot = await db.collection("paidEntitlements").doc(requestedUid).get(); const entitlement = entitlementSnapshot.exists ? entitlementSnapshot.data() || {} : {};
  const storedTier = VALID_TIERS.has(String(entitlement.tier || "")) ? String(entitlement.tier) : String(data.subscriptionTier || "");
  const actualTier = VALID_TIERS.has(storedTier) ? storedTier : "free";
  const status = String(entitlement.status || data.subscriptionStatus || (actualTier === "free" ? "free" : "active"));
  const statusAllowsPaidAccess = actualTier === "free" || status === "active" || status === "trialing";
  const overrideSnapshot = await db.collection("paidTesterOverrides").doc(requestedUid).get();
  const override = overrideSnapshot.exists ? overrideSnapshot.data() || null : null;
  const overrideEnabled = override?.enabled === true && VALID_TIERS.has(String(override?.tier || "")) && (!override.expiresAt || isActiveExpiry(override.expiresAt));
  const trialSnapshot = await db.collection("paidTrials").doc(requestedUid).get();
  const trial = trialSnapshot.exists ? trialSnapshot.data() || null : null;
  const trialEnabled = trial?.enabled === true && VALID_TIERS.has(String(trial?.tier || "")) && String(trial?.tier || "") !== "free" && isActiveExpiry(trial.expiresAt);
  const ownerOwnAccount = isOwnerRequest(request) && requestedUid === request.auth.uid;
  const effectiveTier = ownerOwnAccount ? "business_advanced" : overrideEnabled ? String(override.tier) : statusAllowsPaidAccess && actualTier !== "free" ? actualTier : trialEnabled ? String(trial.tier) : "free";
  const source = ownerOwnAccount ? "owner" : overrideEnabled ? "tester" : effectiveTier === "free" ? "free" : statusAllowsPaidAccess && actualTier !== "free" ? "subscription" : "trial";
  return { success: true, uid: requestedUid, actualTier, effectiveTier, source, subscriptionStatus: status, currentPeriodEnd: entitlement.currentPeriodEnd || data.subscriptionCurrentPeriodEnd, testerOverride: overrideEnabled ? { ...override, tier: String(override.tier) } : null, trial: trialEnabled ? { ...trial, tier: String(trial.tier), enabled: true } : null };
});

Object.assign(exports, require("./paidSubscriptions"));
Object.assign(exports, require("./paidBusiness"));
Object.assign(exports, require("./paidPublicApi"));
Object.assign(exports, require("./paidMarketplace"));
Object.assign(exports, require("./paidSupport"));
Object.assign(exports, require("./creatorPaidTier"));
Object.assign(exports, require("./paidTrialLifecycle"));
Object.assign(exports, require("./rescueDirectory"));
