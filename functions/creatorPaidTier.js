const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { recordPaidTierActivationNotification } = require("./paidTierNotification");

const db = getFirestore();
const adminAuth = getAuth();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const VALID_TIERS = new Set(["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);

function isOwnerRequest(request) { return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL; }
function millis(value) { if (!value) return null; if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis(); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
function activeExpiry(value) { const time = millis(value); return time !== null && time > Date.now(); }
function accessForUser(data) {
  const actualTier = VALID_TIERS.has(String(data.subscriptionTier || "")) ? String(data.subscriptionTier) : "free";
  const subscriptionStatus = String(data.subscriptionStatus || (actualTier === "free" ? "free" : "active"));
  const subscriptionActive = actualTier !== "free" && (subscriptionStatus === "active" || subscriptionStatus === "trialing");
  const override = data.paidTesterOverride || null;
  const overrideTier = VALID_TIERS.has(String(override?.tier || "")) ? String(override.tier) : "free";
  const overrideActive = override?.enabled === true && PAID_TIERS.has(overrideTier) && (!override.expiresAt || activeExpiry(override.expiresAt));
  const trial = data.paidTrial || null;
  const trialTier = VALID_TIERS.has(String(trial?.tier || "")) ? String(trial.tier) : "free";
  const trialActive = trial?.enabled === true && PAID_TIERS.has(trialTier) && activeExpiry(trial.expiresAt);
  let effectiveTier = "free"; let source = "free";
  if (overrideActive) { effectiveTier = overrideTier; source = "tester"; } else if (subscriptionActive) { effectiveTier = actualTier; source = "subscription"; } else if (trialActive) { effectiveTier = trialTier; source = "trial"; }
  return { actualTier, effectiveTier, source, subscriptionStatus, currentPeriodEnd: data.subscriptionCurrentPeriodEnd || null, testerOverride: overrideActive ? { ...override, tier: overrideTier, enabled: true } : null, trial: trialActive ? { ...trial, tier: trialTier, enabled: true } : null };
}
exports.getCreatorPaidTierUsers = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can inspect paid-tier users.");
  const snapshot = await db.collection("users").get();
  const users = snapshot.docs.map((item) => {
    const data = item.data() || {}; const access = accessForUser(data);
    return { uid: item.id, displayName: String(data.displayName || data.name || "Unnamed user"), email: String(data.email || ""), role: String(data.role || ""), profileType: String(data.profileType || "user"), actualTier: access.actualTier, effectiveTier: access.effectiveTier, source: access.source, subscriptionStatus: access.subscriptionStatus, currentPeriodEnd: millis(access.currentPeriodEnd), testerExpiry: millis(access.testerOverride?.expiresAt), trialExpiry: millis(access.trial?.expiresAt), trialStartedAt: millis(access.trial?.startedAt || access.trial?.grantedAt) };
  });
  users.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.email.localeCompare(b.email));
  const summary = users.reduce((result, account) => { result.total += 1; result[account.effectiveTier] = (result[account.effectiveTier] || 0) + 1; if (account.source === "trial") result.trials += 1; if (account.source === "subscription") result.paid += 1; if (account.source === "tester") result.testers += 1; return result; }, { total: 0, trials: 0, paid: 0, testers: 0, free: 0, titan_pro: 0, titan_seller: 0, business_starter: 0, business_plus: 0, business_advanced: 0 });
  return { success: true, users, summary, generatedAt: Date.now() };
});
exports.getCreatorPaidTierNotifications = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can inspect Creator paid-tier notifications.");
  const uid = await ownerUid(); const snapshot = await db.collection("users").doc(uid).collection("notificationEvents").orderBy("createdAt", "desc").limit(100).get();
  const notifications = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.eventType === "paid-tier-activation").slice(0, 50);
  return { success: true, notifications, unreadCount: notifications.filter((item) => item.read !== true).length };
});
exports.markCreatorPaidTierNotificationRead = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can update Creator paid-tier notifications.");
  const eventId = String(request.data?.eventId || "").trim(); if (!eventId) throw new HttpsError("invalid-argument", "Notification ID is required."); const uid = await ownerUid(); await db.collection("users").doc(uid).collection("notificationEvents").doc(eventId).set({ read: true, readAt: FieldValue.serverTimestamp() }, { merge: true }); return { success: true, eventId };
});
exports.grantPaidTrial = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can grant paid trials.");
  const targetUid = String(request.data?.targetUid || "").trim(); const tier = String(request.data?.tier || "titan_pro"); const durationDays = Math.round(Number(request.data?.durationDays || 30));
  if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required."); if (!PAID_TIERS.has(tier)) throw new HttpsError("invalid-argument", "Invalid paid trial tier."); if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3650) throw new HttpsError("invalid-argument", "Trial duration must be between 1 and 3650 days.");
  const targetAuth = await adminAuth.getUser(targetUid); const userRef = db.collection("users").doc(targetUid); const current = await userRef.get(); const currentTrial = current.data()?.paidTrial;
  if (currentTrial?.enabled === true && activeExpiry(currentTrial.expiresAt)) throw new HttpsError("failed-precondition", "This user already has an active paid trial.");
  const expiresAt = Timestamp.fromMillis(Date.now() + durationDays * 86400000);
  await userRef.set({ paidTrial: { enabled: true, tier, durationDays, startedAt: FieldValue.serverTimestamp(), expiresAt, grantedByUid: request.auth.uid, grantedAt: FieldValue.serverTimestamp() }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const auditRef = await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "grant_paid_trial", tier, durationDays, expiresAt, createdAt: FieldValue.serverTimestamp() });
  const targetName = String(current.data()?.displayName || current.data()?.name || targetAuth.displayName || targetAuth.email || "A Tiny Titans user"); const eventKey = `paid-tier-trial-${targetUid}-${expiresAt.toMillis()}`;
  await recordPaidTierActivationNotification({ eventKey, targetUid, targetName, tier, activationKind: "trial", source: "creator" });
  return { success: true, targetUid, tier, durationDays, expiresAt: expiresAt.toMillis(), auditId: auditRef.id };
});
exports.revokePaidTrial = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can revoke paid trials.");
  const targetUid = String(request.data?.targetUid || "").trim(); if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
  await adminAuth.getUser(targetUid); const userRef = db.collection("users").doc(targetUid); const snapshot = await userRef.get(); const trial = snapshot.data()?.paidTrial || null;
  if (!trial?.enabled || !activeExpiry(trial.expiresAt)) throw new HttpsError("failed-precondition", "This user does not have an active paid trial.");
  await userRef.set({ paidTrial: { ...trial, enabled: false, revokedAt: FieldValue.serverTimestamp(), revokedByUid: request.auth.uid }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "revoke_paid_trial", tier: trial.tier, createdAt: FieldValue.serverTimestamp() });
  return { success: true, targetUid, tier: String(trial.tier || "free"), revoked: true };
});
async function ownerUid() { return (await adminAuth.getUserByEmail(OWNER_EMAIL)).uid; }
