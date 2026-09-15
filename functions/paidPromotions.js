const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { recordPaidTierActivationNotification } = require("./paidTierNotification");
const Stripe = require("stripe");
const { defineSecret } = require("firebase-functions/params");

const db = getFirestore();
const adminAuth = getAuth();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const RESCUE_PRODUCT_ID = "prod_VGXqyTU8XJRQdL";
const PROMOTIONS = Object.freeze({
  launch_pro_30: { tier: "titan_pro", kind: "trial", durationDays: 30, enabled: false, audience: "new_users", name: "Titan Pro · 30 Day Launch Trial" },
});
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"]);
const DAY_MS = 86400000;

function isOwnerRequest(request) { return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL; }
function requireOwner(request) { if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can manage promotion codes."); }
function mapPromotionCode(promotionCode) {
  const coupon = promotionCode.promotion?.coupon;
  return { id: promotionCode.id, code: promotionCode.code, active: promotionCode.active === true, percentOff: Number(coupon?.percent_off || 0), maxRedemptions: promotionCode.max_redemptions ?? null, timesRedeemed: Number(promotionCode.times_redeemed || 0), expiresAt: promotionCode.expires_at ? promotionCode.expires_at * 1000 : null, product: "TinyTitans Rescue", productId: RESCUE_PRODUCT_ID, createdAt: Number(promotionCode.created || 0) * 1000 };
}

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
  await userRef.set({ paidTrial: { enabled: true, tier: promotion.tier, durationDays: promotion.durationDays, startedAt, grantedAt: startedAt, grantedByUid: request.auth.uid, promotionId, expiresAt }, paidPromotionHistory: FieldValue.arrayUnion(entry), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const authUser = await adminAuth.getUser(request.auth.uid);
  const targetName = String(data.displayName || data.name || authUser.displayName || authUser.email || "A Tiny Titans user");
  await recordPaidTierActivationNotification({ eventKey: `paid-promotion-${promotionId}-${request.auth.uid}-${expiresAt.toMillis()}`, targetUid: request.auth.uid, targetName, tier: promotion.tier, activationKind: "promotion", source: promotionId });
  return { success: true, promotionId, tier: promotion.tier, durationDays: promotion.durationDays, expiresAt: expiresAt.toMillis() };
});

exports.listCreatorPromoCodes = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  requireOwner(request);
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const response = await stripe.promotionCodes.list({ limit: 100, active: true, expand: ["data.promotion.coupon"] });
    const rescueCodes = response.data.filter((item) => item.promotion?.coupon?.applies_to?.products?.includes(RESCUE_PRODUCT_ID)).map(mapPromotionCode);
    return { success: true, promotionCodes: rescueCodes };
  } catch (error) {
    console.error("Creator promotion-code listing failed", error);
    throw new HttpsError("internal", "Unable to load Stripe promotion codes.");
  }
});

exports.createCreatorPromoCode = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  requireOwner(request);
  const code = String(request.data?.code || "").trim();
  const percentOff = Number(request.data?.percentOff);
  const maxRedemptions = request.data?.maxRedemptions == null ? null : Number(request.data.maxRedemptions);
  const expiresAtRaw = request.data?.expiresAt ? String(request.data.expiresAt) : null;
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) throw new HttpsError("invalid-argument", "Discount must be between 1% and 100%.");
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)) throw new HttpsError("invalid-argument", "Maximum redemptions must be a positive whole number.");
  let expiresAt = null;
  if (expiresAtRaw) {
    const timestamp = Math.floor(new Date(expiresAtRaw).getTime() / 1000);
    if (!Number.isFinite(timestamp) || timestamp <= Math.floor(Date.now() / 1000)) throw new HttpsError("invalid-argument", "Expiry must be a future date.");
    expiresAt = timestamp;
  }
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const coupon = await stripe.coupons.create({ name: `TinyTitans Rescue · ${percentOff}% Off`, percent_off: percentOff, duration: "forever", max_redemptions: maxRedemptions || undefined, applies_to: { products: [RESCUE_PRODUCT_ID] }, metadata: { tier_id: "rescue", audience: "creator_managed", created_by: request.auth.uid } });
    const promotionCode = await stripe.promotionCodes.create({ code: code || undefined, promotion: { type: "coupon", coupon: coupon.id }, max_redemptions: maxRedemptions || undefined, expires_at: expiresAt || undefined, metadata: { tier_id: "rescue", product_id: RESCUE_PRODUCT_ID, created_by: request.auth.uid } });
    const completePromotionCode = await stripe.promotionCodes.retrieve(promotionCode.id, { expand: ["promotion.coupon"] });
    return { success: true, promotionCode: mapPromotionCode(completePromotionCode) };
  } catch (error) {
    console.error("Creator promotion-code creation failed", error);
    const message = String(error?.message || "Unable to create promotion code.");
    if (message.toLowerCase().includes("already exists")) throw new HttpsError("already-exists", "That promotion code is already active.");
    throw new HttpsError("internal", "Unable to create Stripe promotion code.");
  }
});

exports.deactivateCreatorPromoCode = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  requireOwner(request);
  const promotionCodeId = String(request.data?.promotionCodeId || "").trim();
  if (!promotionCodeId) throw new HttpsError("invalid-argument", "A promotion code ID is required.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const current = await stripe.promotionCodes.retrieve(promotionCodeId, { expand: ["promotion.coupon"] });
    const coupon = current.promotion?.coupon;
    if (!coupon?.applies_to?.products?.includes(RESCUE_PRODUCT_ID)) throw new HttpsError("permission-denied", "That promotion code is not a TinyTitans Rescue promotion.");
    const updated = await stripe.promotionCodes.update(promotionCodeId, { active: false });
    return { success: true, promotionCode: mapPromotionCode({ ...updated, promotion: current.promotion }) };
  } catch (error) {
    console.error("Creator promotion-code deactivation failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to deactivate Stripe promotion code.");
  }
});
