const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Stripe = require("stripe");

const db = getFirestore();
const adminAuth = getAuth();
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const RESCUE_PRODUCT_ID = "prod_VGXqyTU8XJRQdL";
const CODE_PATTERN = /^[A-Za-z0-9-]+$/;

function isOwnerRequest(request) {
  return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

function assertOwner(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can manage promotion codes.");
}

function normaliseExpiry(value) {
  if (!value) return undefined;
  const millis = new Date(String(value)).getTime();
  if (!Number.isFinite(millis) || millis <= Date.now()) throw new HttpsError("invalid-argument", "Promotion code expiry must be a future date.");
  return Math.floor(millis / 1000) + 86399;
}

function serialisePromotionCode(item) {
  const promotion = item.promotion || {};
  const coupon = typeof promotion.coupon === "object" ? promotion.coupon : null;
  const metadata = coupon?.metadata || item.metadata || {};
  return {
    id: item.id,
    code: item.code,
    active: item.active === true,
    percentOff: Number(coupon?.percent_off || 0),
    maxRedemptions: item.max_redemptions ?? coupon?.max_redemptions ?? null,
    timesRedeemed: Number(item.times_redeemed || 0),
    expiresAt: item.expires_at ? item.expires_at * 1000 : coupon?.redeem_by ? coupon.redeem_by * 1000 : null,
    product: "TinyTitans Rescue",
    productId: RESCUE_PRODUCT_ID,
    createdAt: item.created ? item.created * 1000 : Date.now(),
    metadata,
  };
}

function isRescuePromotion(item) {
  const promotion = item.promotion || {};
  const coupon = typeof promotion.coupon === "object" ? promotion.coupon : null;
  return coupon?.applies_to?.products?.includes(RESCUE_PRODUCT_ID) === true;
}

exports.listCreatorPromoCodes = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  assertOwner(request);
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const response = await stripe.promotionCodes.list({ active: true, limit: 100, expand: ["data.promotion.coupon"] });
    return { success: true, promotionCodes: response.data.filter(isRescuePromotion).map(serialisePromotionCode) };
  } catch (error) {
    console.error("Creator promo list failed", error);
    throw new HttpsError("internal", "Unable to load promotion codes.");
  }
});

exports.createCreatorPromoCode = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  assertOwner(request);
  const requestedCode = String(request.data?.code || "").trim();
  const percentOff = Number(request.data?.percentOff);
  const maxRedemptions = request.data?.maxRedemptions == null || request.data?.maxRedemptions === "" ? undefined : Number(request.data.maxRedemptions);
  const expiresAt = normaliseExpiry(request.data?.expiresAt);
  if (requestedCode && !CODE_PATTERN.test(requestedCode)) throw new HttpsError("invalid-argument", "Promo codes may contain only letters, numbers and dashes.");
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) throw new HttpsError("invalid-argument", "Discount must be a whole number from 1 to 100%.");
  if (maxRedemptions !== undefined && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) throw new HttpsError("invalid-argument", "Maximum redemptions must be a positive whole number.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const coupon = await stripe.coupons.create({
      duration: "forever",
      percent_off: percentOff,
      max_redemptions: maxRedemptions,
      ...(expiresAt ? { redeem_by: expiresAt } : {}),
      name: `TinyTitans Rescue — ${percentOff}% Off`,
      applies_to: { products: [RESCUE_PRODUCT_ID] },
      metadata: { tier_id: "rescue", audience: "creator-managed", purpose: "TinyTitans Rescue promotion" },
    });
    const promotionCode = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      ...(requestedCode ? { code: requestedCode } : {}),
      max_redemptions: maxRedemptions,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      metadata: { tier_id: "rescue", audience: "creator-managed" },
    });
    await db.collection("creatorAudit").add({ actorUid: request.auth.uid, action: "create_rescue_promotion_code", promotionCodeId: promotionCode.id, code: promotionCode.code, percentOff, maxRedemptions: maxRedemptions ?? null, expiresAt: expiresAt ?? null, createdAt: FieldValue.serverTimestamp() });
    return { success: true, promotionCode: serialisePromotionCode({ ...promotionCode, promotion: { ...promotionCode.promotion, coupon } }) };
  } catch (error) {
    console.error("Creator promo creation failed", error);
    if (error?.code === "resource_already_exists") throw new HttpsError("already-exists", "That promotion code is already active.");
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to create promotion code.");
  }
});

exports.deactivateCreatorPromoCode = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  assertOwner(request);
  const promotionCodeId = String(request.data?.promotionCodeId || "").trim();
  if (!promotionCodeId) throw new HttpsError("invalid-argument", "A promotion code ID is required.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const current = await stripe.promotionCodes.retrieve(promotionCodeId, { expand: ["promotion.coupon"] });
    if (!isRescuePromotion(current)) throw new HttpsError("permission-denied", "That promotion code is not a TinyTitans Rescue code.");
    const promotionCode = await stripe.promotionCodes.update(promotionCodeId, { active: false });
    await db.collection("creatorAudit").add({ actorUid: request.auth.uid, action: "deactivate_rescue_promotion_code", promotionCodeId, code: promotionCode.code, createdAt: FieldValue.serverTimestamp() });
    return { success: true, promotionCode: serialisePromotionCode(promotionCode) };
  } catch (error) {
    console.error("Creator promo deactivation failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to deactivate promotion code.");
  }
});
