const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const CREATOR_TIERS = new Set(["business_starter", "business_plus", "business_advanced", "rescue"]);

function isCreator(request) {
  return Boolean(request.auth?.uid) && String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL && (request.auth.token.admin === true || request.auth.token.creator === true);
}

function isOwner(request) {
  return Boolean(request.auth?.uid) && String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

async function hasPartnerAccess(uid) {
  const [entitlementSnapshot, trialSnapshot, overrideSnapshot] = await Promise.all([
    db.collection("paidEntitlements").doc(uid).get(),
    db.collection("paidTrials").doc(uid).get(),
    db.collection("paidTesterOverrides").doc(uid).get(),
  ]);
  const entitlement = entitlementSnapshot.exists ? entitlementSnapshot.data() || {} : {};
  const trial = trialSnapshot.exists ? trialSnapshot.data() || {} : {};
  const override = overrideSnapshot.exists ? overrideSnapshot.data() || {} : {};
  const paid = CREATOR_TIERS.has(String(entitlement.tier || "")) && ["active", "trialing"].includes(String(entitlement.status || ""));
  const trialActive = CREATOR_TIERS.has(String(trial.tier || "")) && trial.enabled === true && trial.expiresAt?.toMillis?.() > Date.now();
  const testerActive = CREATOR_TIERS.has(String(override.tier || "")) && override.enabled === true && (!override.expiresAt || override.expiresAt.toMillis?.() > Date.now());
  return paid || trialActive || testerActive;
}

function cleanProfile(data, id) {
  if (!data) return null;
  return { ...data, id: String(id || data.id || "") };
}

exports.getCreatorPartnerLandings = onCall({ region: "europe-west2" }, async (request) => {
  if (!isCreator(request)) throw new HttpsError("permission-denied", "Creator authorization is required.");
  const snapshot = await db.collection("partnerLandings").where("recordType", "==", "owner").limit(500).get();
  return { success: true, profiles: snapshot.docs.map((doc) => cleanProfile(doc.data(), doc.id)) };
});

exports.getCreatorPartnerLanding = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const targetUid = String(request.data?.ownerUid || "").trim();
  if (!targetUid) throw new HttpsError("invalid-argument", "An owner user ID is required.");
  const creator = isCreator(request);
  if (!creator && request.auth.uid !== targetUid) throw new HttpsError("permission-denied", "You can only manage your own partner profile.");
  if (!creator && !(await hasPartnerAccess(request.auth.uid))) throw new HttpsError("permission-denied", "An eligible Business or Rescue tier is required for partner branding.");
  const snapshot = await db.collection("partnerLandings").doc(targetUid).get();
  return { success: true, profile: snapshot.exists && snapshot.data()?.recordType === "owner" ? cleanProfile(snapshot.data(), snapshot.id) : null };
});

exports.savePartnerLanding = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const profile = request.data?.profile && typeof request.data.profile === "object" ? request.data.profile : null;
  const creatorMode = request.data?.creatorMode === true;
  const targetUid = String(profile?.ownerUid || "").trim();
  if (!profile || !targetUid) throw new HttpsError("invalid-argument", "A valid partner profile is required.");
  const creator = isCreator(request);
  if (creatorMode && !creator) throw new HttpsError("permission-denied", "Creator authorization is required for cross-account partner edits.");
  if (!creator && request.auth.uid !== targetUid) throw new HttpsError("permission-denied", "You can only save your own partner profile.");
  if (!creator && !(await hasPartnerAccess(request.auth.uid))) throw new HttpsError("permission-denied", "An eligible Business or Rescue tier is required for partner branding.");

  const brandName = String(profile.brandName || "").trim();
  const slug = String(profile.slug || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!brandName) throw new HttpsError("invalid-argument", "A business or rescue name is required.");
  if (!slug) throw new HttpsError("invalid-argument", "Choose a public profile URL slug.");

  const ownerRef = db.collection("partnerLandings").doc(targetUid);
  const currentSnapshot = await ownerRef.get();
  const current = currentSnapshot.exists ? currentSnapshot.data() || {} : {};
  const next = { ...profile, id: targetUid, ownerUid: targetUid, slug, brandName, recordType: "owner", updatedAt: FieldValue.serverTimestamp(), createdAt: current.createdAt || FieldValue.serverTimestamp() };
  const publicId = `public-${slug}`;
  const publicRef = db.collection("partnerLandings").doc(publicId);
  const batch = db.batch();
  batch.set(ownerRef, next, { merge: true });
  if (profile.publicEnabled === true) batch.set(publicRef, { ...next, id: publicId, recordType: "public" }, { merge: true });
  else batch.delete(publicRef);
  if (current.slug && current.slug !== slug) batch.delete(db.collection("partnerLandings").doc(`public-${String(current.slug)}`));
  await batch.commit();
  const saved = await ownerRef.get();
  return { success: true, profile: cleanProfile(saved.data(), saved.id) };
});

exports.getPublicPartnerLanding = onCall({ region: "europe-west2" }, async (request) => {
  const slug = String(request.data?.slug || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!slug) throw new HttpsError("invalid-argument", "A partner slug is required.");
  const snapshot = await db.collection("partnerLandings").doc(`public-${slug}`).get();
  const data = snapshot.exists ? snapshot.data() || {} : null;
  if (!data || data.recordType !== "public" || data.publicEnabled !== true) return { success: true, profile: null };
  return { success: true, profile: cleanProfile(data, snapshot.id) };
});

exports.getCreatorQaRuns = onCall({ region: "europe-west2" }, async (request) => {
  if (!isCreator(request)) throw new HttpsError("permission-denied", "Creator authorization is required.");
  const snapshot = await db.collection("qaRuns").orderBy("completedAt", "desc").limit(20).get();
  return { success: true, runs: snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) })) };
});

exports.creatorOperationsHealth = onCall({ region: "europe-west2" }, async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Tiny Titans owner authorization is required.");
  return { success: true, service: "creator-operations-data", timestamp: Date.now() };
});
