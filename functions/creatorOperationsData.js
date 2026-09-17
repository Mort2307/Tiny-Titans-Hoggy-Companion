const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const bucket = getStorage().bucket();
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

exports.publishCreatorQaRun = onRequest({ region: "europe-west2", timeoutSeconds: 120, memory: "512MiB" }, async (request, response) => {
  const origin = String(request.headers.origin || "");
  if (["https://tinytitans-hoggy-companion.web.app", "https://tinytitans-hoggy-companion.firebaseapp.com", "http://localhost:5173", "http://127.0.0.1:5173"].includes(origin)) response.set("Access-Control-Allow-Origin", origin);
  response.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (request.method === "OPTIONS") return response.status(204).send("");
  if (request.method !== "POST") return response.status(405).json({ error: "Method Not Allowed" });

  const authHeader = String(request.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) return response.status(401).json({ error: "Missing Firebase ID token." });

  let decoded;
  try {
    decoded = await require("firebase-admin/auth").getAuth().verifyIdToken(authHeader.slice(7));
  } catch {
    return response.status(401).json({ error: "Invalid Firebase ID token." });
  }

  if (String(decoded.email || "").trim().toLowerCase() !== OWNER_EMAIL || (decoded.admin !== true && decoded.creator !== true)) {
    return response.status(403).json({ error: "Creator authorization is required." });
  }

  const body = request.body && typeof request.body === "object" ? request.body : {};
  const runId = String(body.id || "").trim();
  const storagePrefix = String(body.storagePrefix || "").trim().replace(/^\/+|\/+$/g, "");
  if (!runId || !storagePrefix || !storagePrefix.startsWith("qa-evidence/runs/")) return response.status(400).json({ error: "A valid QA run ID and storage prefix are required." });

  const latestSnapshot = await db.collection("qaRuns").orderBy("completedAt", "desc").limit(1).get();
  const previous = latestSnapshot.empty ? null : latestSnapshot.docs[0].data() || {};
  if (previous.storagePrefix && previous.storagePrefix !== storagePrefix) {
    await bucket.deleteFiles({ prefix: String(previous.storagePrefix).replace(/^\/+|\/+$/g, "") }).catch((error) => console.warn("Previous QA evidence cleanup failed", error));
  }

  const safeSummary = {
    id: runId,
    name: String(body.name || "Tiny Titans Visual Review BOT"),
    status: String(body.status || "UNKNOWN"),
    generatedAt: String(body.generatedAt || ""),
    completedAt: FieldValue.serverTimestamp(),
    commit: String(body.commit || ""),
    routes: Number(body.routes || 0),
    viewports: Array.isArray(body.viewports) ? body.viewports.slice(0, 12) : [],
    screenshots: Number(body.screenshots || 0),
    videos: Number(body.videos || 0),
    failures: Number(body.failures || 0),
    errors: Number(body.errors || 0),
    warnings: Number(body.warnings || 0),
    storagePrefix,
    reportPath: String(body.reportPath || `${storagePrefix}/report.json`),
    publisherUid: decoded.uid,
    qaEvidenceAvailable: true,
    routeSource: String(body.routeSource || "universal-visual-review"),
    github: body.github && typeof body.github === "object" ? {
      repository: String(body.github.repository || ""),
      branch: String(body.github.branch || "qa-evidence"),
      path: String(body.github.path || "qa/latest"),
      url: String(body.github.url || ""),
      actionsUrl: body.github.actionsUrl ? String(body.github.actionsUrl) : null,
    } : null,
  };

  await db.collection("qaRuns").doc(runId).set(safeSummary, { merge: true });
  return response.status(200).json({ success: true, run: safeSummary });
});

exports.creatorOperationsHealth = onCall({ region: "europe-west2" }, async (request) => {
  if (!isOwner(request)) throw new HttpsError("permission-denied", "Tiny Titans owner authorization is required.");
  return { success: true, service: "creator-operations-data", timestamp: Date.now() };
});
