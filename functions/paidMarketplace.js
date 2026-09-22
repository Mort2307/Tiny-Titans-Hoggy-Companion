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
exports.getPublicMarketplaceListings = onCall({ region: "europe-west2" }, async () => {
  const snapshot = await db.collectionGroup("marketplaceListings").where("status", "==", "active").limit(200).get();
  const rows = await Promise.all(snapshot.docs.map(async (doc) => {
    const ownerUid = doc.ref.parent.parent?.id || "";
    if (!ownerUid) return null;
    const [workspaceSnapshot, userSnapshot] = await Promise.all([
      db.collection("paidWorkspaces").doc(ownerUid).get(),
      db.collection("users").doc(ownerUid).get(),
    ]);
    const workspace = workspaceSnapshot.exists ? workspaceSnapshot.data() : {};
    const user = userSnapshot.exists ? userSnapshot.data() : {};
    const seller = workspace.sellerProfile && typeof workspace.sellerProfile === "object" ? workspace.sellerProfile : {};
    const marketplace = workspace.marketplace && typeof workspace.marketplace === "object" ? workspace.marketplace : {};
    return {
      id: doc.id,
      ...doc.data(),
      seller: {
        displayName: cleanText(seller.displayName || user.displayName, 120),
        businessName: cleanText(seller.businessName, 120),
        location: marketplace.showLocation === false ? "" : cleanText(seller.location, 160),
        contactEmail: marketplace.showContactEmail === true && seller.acceptingEnquiries !== false ? cleanText(seller.contactEmail, 160) : "",
        website: cleanText(seller.website, 240),
      },
    };
  }));
  return {
    success: true,
    listings: rows.filter(Boolean).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))).slice(0, 100),
  };
});

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
  const id = cleanText(payload.id, 120); const title = cleanText(payload.title, 140); const category = cleanText(payload.category, 60) || "animal"; const speciesId = cleanText(payload.speciesId, 140); const animalGroup = cleanText(payload.animalGroup, 40); const speciesCommonName = cleanText(payload.speciesCommonName, 160); const scientificName = cleanText(payload.scientificName, 180); const description = cleanText(payload.description, 2000); const price = Number(payload.price); const currency = cleanText(payload.currency, 8).toUpperCase() || "GBP"; const status = ["draft", "active", "sold", "archived"].includes(payload.status) ? payload.status : "draft";
  if (!title) throw new HttpsError("invalid-argument", "A listing title is required."); if (!Number.isFinite(price) || price < 0) throw new HttpsError("invalid-argument", "A non-negative listing price is required.");
  const collection = db.collection("paidWorkspaces").doc(request.auth.uid).collection("marketplaceListings"); const ref = id ? collection.doc(id) : collection.doc(); const existing = await ref.get();
  const data = { title, category, description, price, currency, status, speciesId, animalGroup, speciesCommonName, scientificName, updatedAt: FieldValue.serverTimestamp() }; if (!existing.exists) data.createdAt = FieldValue.serverTimestamp(); await ref.set(data, { merge: true }); return { success: true, id: ref.id };
});
exports.removePaidMarketplaceListing = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); await requireSeller(request.auth.uid); const id = cleanText(request.data?.id, 120); if (!id) throw new HttpsError("invalid-argument", "A listing ID is required."); await db.collection("paidWorkspaces").doc(request.auth.uid).collection("marketplaceListings").doc(id).delete(); return { success: true, id };
});
