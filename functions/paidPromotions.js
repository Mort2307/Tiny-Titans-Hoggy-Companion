const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { recordPaidTierActivationNotification } = require("./paidTierNotification");

const db = getFirestore();
const adminAuth = getAuth();
const PROMOTIONS = Object.freeze({
  launch_pro_30: { tier: "titan_pro", kind: "trial", durationDays: 30, enabled: false, audience: "new_users", name: "Titan Pro · 30 Day Launch Trial" },
});
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const DAY_MS = 86400000;

exports.claimPaidPromotion = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const promotionId = String(request.data?.promotionId || "");
  const promotion = PROMOTIONS[promotionId];
  if (!promotion || !promotion.enabled) throw new HttpsError("failed-precondition", "This promotion is not currently available.");
  const userRef = db.collection("users").doc(request.auth.uid);
  const snapshot = await userRef.get();
  const data = snapshot.data() || {};
  const actualTier = PAID_TIERS.has(String(data.subscriptionTier || "")) ? String(data.subscriptionTier) : "free";
  if (actualTier !== "free") throw new HttpsError("failed-precondition", "This offer is for accounts without an active paid subscription.");
  const history = Array.isArray(data.paidPromotionHistory) ? data.paidPromotionHistory : [];
  if (history.some((item) => String(item?.promotionId || "") === promotionId)) throw new HttpsError("already-exists", "This promotion has already been claimed on this account.");
  const currentTrial = data.paidTrial;
  if (currentTrial?.enabled === true) throw new HttpsError("failed-precondition", "An active paid trial already exists.");
  const startedAt = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + promotion.durationDays * DAY_MS);
  const entry = { promotionId, tier: promotion.tier, kind: promotion.kind, claimedAt: startedAt, expiresAt };
  await userRef.set({
    paidTrial: { enabled: true, tier: promotion.tier, durationDays: promotion.durationDays, startedAt, grantedAt: startedAt, grantedByUid: request.auth.uid, promotionId, expiresAt },
    paidPromotionHistory: FieldValue.arrayUnion(entry),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const authUser = await adminAuth.getUser(request.auth.uid);
  const targetName = String(data.displayName || data.name || authUser.displayName || authUser.email || "A Tiny Titans user");
  await recordPaidTierActivationNotification({ eventKey: `paid-promotion-${promotionId}-${request.auth.uid}-${expiresAt.toMillis()}`, targetUid: request.auth.uid, targetName, tier: promotion.tier, activationKind: "promotion", source: promotionId });
  return { success: true, promotionId, tier: promotion.tier, durationDays: promotion.durationDays, expiresAt: expiresAt.toMillis() };
});
