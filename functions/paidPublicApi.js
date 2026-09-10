const crypto = require("node:crypto");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");

const db = getFirestore();
const TIER_ENTITLEMENTS = {
  free: new Set(["core_tracking", "core_genetics", "core_learning", "core_community"]),
  titan_pro: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "data_export"]),
  titan_seller: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "seller_profile", "marketplace_seller", "data_export"]),
  business_starter: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user"]),
  business_plus: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "priority_support"]),
  business_advanced: new Set(["core_tracking", "core_genetics", "core_learning", "core_community", "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "api_access", "priority_support", "custom_branding"]),
};

function sendJson(response, status, payload) { response.status(status).set("Cache-Control", "no-store").json(payload); }
function bearerToken(request) { const header = String(request.get("authorization") || ""); return header.startsWith("Bearer ") ? header.slice(7).trim() : ""; }
function expiryMillis(value) { if (!value) return null; if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis(); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
function hasActiveTrial(data) { const trial = data.paidTrial || null; const tier = String(trial?.tier || "free"); const expiresAt = expiryMillis(trial?.expiresAt); return trial?.enabled === true && tier !== "free" && Boolean(TIER_ENTITLEMENTS[tier]) && expiresAt !== null && expiresAt > Date.now(); }
function resolveEffectiveTier(data) {
  const subscriptionTier = String(data.subscriptionTier || "free");
  const subscriptionStatus = String(data.subscriptionStatus || (subscriptionTier === "free" ? "free" : "active"));
  const subscriptionActive = Boolean(TIER_ENTITLEMENTS[subscriptionTier]) && subscriptionTier !== "free" && ["active", "trialing"].includes(subscriptionStatus);
  const override = data.paidTesterOverride || null;
  const overrideTier = String(override?.tier || "free");
  const overrideExpiry = expiryMillis(override?.expiresAt);
  const overrideActive = override?.enabled === true && overrideTier !== "free" && Boolean(TIER_ENTITLEMENTS[overrideTier]) && (overrideExpiry === null || overrideExpiry > Date.now());
  if (overrideActive) return { effectiveTier: overrideTier, source: "tester" };
  if (subscriptionActive) return { effectiveTier: subscriptionTier, source: "subscription" };
  if (hasActiveTrial(data)) return { effectiveTier: String(data.paidTrial.tier), source: "trial" };
  return { effectiveTier: "free", source: "free" };
}
async function authenticateApiKey(request) {
  const token = bearerToken(request);
  if (!token || token.length < 20) return null;
  const prefix = token.slice(0, 14);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const matches = await db.collectionGroup("apiKeys").where("prefix", "==", prefix).limit(5).get();
  for (const doc of matches.docs) {
    const data = doc.data();
    if (data.revoked || typeof data.secretHash !== "string") continue;
    const stored = Buffer.from(data.secretHash);
    const supplied = Buffer.from(hash);
    if (stored.length !== supplied.length || !crypto.timingSafeEqual(stored, supplied)) continue;
    const workspaceRef = doc.ref.parent.parent;
    const uid = workspaceRef?.id;
    if (!uid) continue;
    const userSnapshot = await db.collection("users").doc(uid).get();
    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const access = resolveEffectiveTier(userData);
    const entitlements = TIER_ENTITLEMENTS[access.effectiveTier] || TIER_ENTITLEMENTS.free;
    if (!entitlements.has("api_access")) return null;
    return { uid, tier: String(userData.subscriptionTier || "free"), effectiveTier: access.effectiveTier, source: access.source, userData };
  }
  return null;
}

exports.paidPublicApi = onRequest({ region: "europe-west2", cors: true }, async (request, response) => {
  try {
    if (request.method === "GET" && request.path === "/api/v1/health") return sendJson(response, 200, { ok: true, service: "Tiny Titans API", version: "v1" });
    const auth = await authenticateApiKey(request);
    if (!auth) return sendJson(response, 401, { ok: false, error: "Invalid or inactive API key." });
    if (request.method === "GET" && request.path === "/api/v1/me") return sendJson(response, 200, { ok: true, data: { uid: auth.uid, tier: auth.tier, effectiveTier: auth.effectiveTier, source: auth.source, displayName: auth.userData.displayName || null, api: { version: "v1", access: ["me"] } } });
    return sendJson(response, 404, { ok: false, error: "Unknown API endpoint." });
  } catch (error) {
    console.error("Tiny Titans: paid public API failure", error);
    return sendJson(response, 500, { ok: false, error: "Internal API error." });
  }
});
