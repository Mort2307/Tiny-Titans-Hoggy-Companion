const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const PAID_TIERS = new Set(["titan_seller", "business_starter", "business_plus", "business_advanced"]);

function cleanText(value, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function expiryMillis(value) { if (!value) return null; if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis(); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
async function requireSeller(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  const data = snapshot.exists ? snapshot.data() : {};
  if (String(data.email || "").trim().toLowerCase() === OWNER_EMAIL) return "business_advanced";
  const subscriptionTier = String(data.subscriptionTier || "free");
  const subscriptionStatus = String(data.subscriptionStatus || (subscriptionTier === "free" ? "free" : "active"));
  const subscriptionActive = PAID_TIERS.has(subscriptionTier) && ["active", "trialing"].includes(subscriptionStatus);
  const override = data.paidTesterOverride || null;
  const overrideTier = String(override?.tier || "");
  const overrideActive = override?.enabled === true && PAID_TIERS.has(overrideTier) && (expiryMillis(override.expiresAt) === null || expiryMillis(override.expiresAt) > Date.now());
  const trial = data.paidTrial || null;
  const trialTier = String(trial?.tier || "");
  const trialActive = trial?.enabled === true && PAID_TIERS.has(trialTier) && (expiryMillis(trial.expiresAt) || 0) > Date.now();
  const effectiveTier = overrideActive ? overrideTier : subscriptionActive ? subscriptionTier : trialActive ? trialTier : "free";
  if (!PAID_TIERS.has(effectiveTier)) throw new HttpsError("permission-denied", "Marketplace seller tools require a seller or business tier.");
  return effectiveTier;
}
exports.getPaidMarketplaceListings = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await requireSeller(request.auth.uid);
  const snapshot = await db.collection("paidWorkspaces").doc(request.auth.uid).collection("marketplaceListings").orderBy("updatedAt", "desc").limit(100).get();
  return { success: true, listings: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
});
exports.upsertPaidMarketplaceListing = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await requireSeller(request.auth.uid);
  const payload = request.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  const id = cleanText(payload.id, 120); const title = cleanText(payload.title, 140); const category = cleanText(payload.category, 60) || "reptile"; const description = cleanText(payload.description, 2000); const price = Number(payload.price); const currency = cleanText(payload.currency, 8).toUpperCase() || "GBP"; const status = ["draft", "active", "sold", "archived"].includes(payload.status) ? payload.status : "draft";
  if (!title) throw new HttpsError("invalid-argument", "A listing title is required."); if (!Number.isFinite(price) || price < 0) throw new HttpsError("invalid-argument", "A non-negative listing price is required.");
  const collection = db.collection("paidWorkspaces").doc(request.auth.uid).collection("marketplaceListings"); const ref = id ? collection.doc(id) : collection.doc(); const existing = await ref.get();
  const data = { title, category, description, price, currency, status, updatedAt: FieldValue.serverTimestamp() }; if (!existing.exists) data.createdAt = FieldValue.serverTimestamp(); await ref.set(data, { merge: true }); return { success: true, id: ref.id };
});
exports.removePaidMarketplaceListing = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); await requireSeller(request.auth.uid); const id = cleanText(request.data?.id, 120); if (!id) throw new HttpsError("invalid-argument", "A listing ID is required."); await db.collection("paidWorkspaces").doc(request.auth.uid).collection("marketplaceListings").doc(id).delete(); return { success: true, id };
});
