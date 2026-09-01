const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const PUBLIC_CACHE_TTL_MS = 60_000;
let snapshotCache = null;
let snapshotCacheAt = 0;
let feedCache = null;
let feedCacheAt = 0;

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value) {
  const millis = timestampMillis(value);
  return millis > 0 ? new Date(millis).toISOString() : new Date().toISOString();
}

function creditMethods(item) {
  if (Array.isArray(item?.contributorCreditMethods)) return item.contributorCreditMethods;
  if (item?.contributorCreditMethod) return [item.contributorCreditMethod];
  if (item?.creditType) return [item.creditType];
  if (item?.creditMode) return [item.creditMode];
  return [];
}

function publicAttribution(item, fallback = "Anonymous keeper") {
  const methods = creditMethods(item);
  if (methods.includes("anonymous")) return fallback;
  const parts = [];
  if (methods.includes("profile")) {
    const value = String(item?.contributorCreditProfileName || item?.contributorProfileName || "").trim();
    if (value) parts.push(value);
  }
  if (methods.includes("name") || methods.includes("credited")) {
    const value = String(item?.contributorCreditName || item?.creditName || item?.contributorDisplayName || "").trim();
    if (value) parts.push(value);
  }
  if (methods.includes("social")) {
    const value = String(item?.contributorCreditSocial || item?.creditSocial || "").trim();
    if (value) parts.push(value);
  }
  return parts.length ? parts.join(" · ") : fallback;
}

function contributorKey(item, documentId) {
  const uid = String(item?.userId || item?.creatorUid || item?.submittedBy || "").trim();
  return uid || `anonymous:${documentId}`;
}

async function getPublicDocuments() {
  return Promise.all([
    db.collection("keeperObservations").where("status", "==", "approved").get(),
    db.collection("morphImageSubmissions").where("status", "==", "Approved").get(),
    db.collectionGroup("morphSubmissions").where("status", "==", "approved").get(),
    db.collection("communityContent").where("visibility", "==", "community").get(),
  ]);
}

async function calculatePublicSnapshot() {
  const [behaviourDocs, morphDocs, morphNameDocs, communityDocs] = await getPublicDocuments();
  const contributors = new Set();
  let behaviourContributions = 0;
  let morphContributions = 0;
  let communityContributions = 0;

  for (const doc of behaviourDocs.docs) {
    const item = doc.data() || {};
    if (!item.educationalConsent) continue;
    behaviourContributions += 1;
    contributors.add(contributorKey(item, doc.id));
  }
  for (const doc of morphDocs.docs) {
    const item = doc.data() || {};
    morphContributions += 1;
    contributors.add(contributorKey(item, doc.id));
  }
  for (const doc of morphNameDocs.docs) {
    const item = doc.data() || {};
    if (item.visibility && !["community", "public"].includes(item.visibility)) continue;
    morphContributions += 1;
    contributors.add(contributorKey(item, doc.id));
  }
  for (const doc of communityDocs.docs) {
    const item = doc.data() || {};
    if (item.moderationStatus !== "approved") continue;
    communityContributions += 1;
    contributors.add(contributorKey(item, doc.id));
  }

  const totalRecords = behaviourContributions + morphContributions + communityContributions;
  return { available: true, contributors: contributors.size, totalRecords, behaviourContributions, morphContributions, communityContributions, generatedAt: new Date().toISOString() };
}

async function calculatePublicFeed() {
  const feed = [];
  const [behaviourDocs, morphDocs, morphNameDocs, communityDocs] = await getPublicDocuments();
  for (const doc of behaviourDocs.docs) {
    const item = doc.data() || {};
    if (!item.educationalConsent) continue;
    feed.push({ id: doc.id, category: String(item.primaryCategory || item.category || "Behaviour"), title: String(item.title || item.behaviourName || item.observationTitle || "Behaviour observation"), snippet: String(item.description || item.observation || item.notes || "Keeper-submitted behaviour observation.").slice(0, 180), contributor: publicAttribution(item), createdAt: isoDate(item.createdAt || item.submittedAt || item.updatedAt), source: "Behaviour Observatory" });
  }
  for (const doc of morphDocs.docs) {
    const item = doc.data() || {};
    feed.push({ id: doc.id, category: "Morph Library", title: String(item.morphName || item.morphId || item.submittedName || "Morph evidence"), snippet: String(item.description || item.proofDetails || "Keeper-submitted Morph Library evidence.").slice(0, 180), contributor: publicAttribution(item), createdAt: isoDate(item.approvedAt || item.reviewedAt || item.submittedAt || item.createdAt), source: "Morph Library" });
  }
  for (const doc of morphNameDocs.docs) {
    const item = doc.data() || {};
    if (item.visibility && !["community", "public"].includes(item.visibility)) continue;
    feed.push({ id: doc.id, category: "Morph Library", title: String(item.submittedName || item.morphName || "Morph contribution"), snippet: String(item.description || item.knownGenetics || "Keeper-submitted Morph Library contribution.").slice(0, 180), contributor: publicAttribution(item, "Anonymous keeper"), createdAt: isoDate(item.reviewedAt || item.updatedAt || item.createdAt), source: "Morph Library" });
  }
  for (const doc of communityDocs.docs) {
    const item = doc.data() || {};
    if (item.moderationStatus !== "approved") continue;
    feed.push({ id: doc.id, category: String(item.type || "Community"), title: String(item.title || "Community contribution"), snippet: String(item.description || "Community contribution shared with Tiny Titans.").slice(0, 180), contributor: publicAttribution(item, "Anonymous keeper"), createdAt: isoDate(item.createdAt || item.updatedAt), source: "Community Hub" });
  }
  return feed.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 100);
}

exports.getPublicCommunityContributionSnapshotV2 = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const now = Date.now();
  if (snapshotCache && now - snapshotCacheAt < PUBLIC_CACHE_TTL_MS) return snapshotCache;
  try { snapshotCache = await calculatePublicSnapshot(); snapshotCacheAt = Date.now(); return snapshotCache; }
  catch (error) { console.error("Public contribution snapshot failed", error); throw new HttpsError("internal", "Unable to load the community contribution tracker."); }
});

exports.getPublicCommunityContributionFeedV2 = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const now = Date.now();
  if (feedCache && now - feedCacheAt < PUBLIC_CACHE_TTL_MS) return { entries: feedCache, generatedAt: new Date(feedCacheAt).toISOString() };
  try { feedCache = await calculatePublicFeed(); feedCacheAt = Date.now(); return { entries: feedCache, generatedAt: new Date().toISOString() }; }
  catch (error) { console.error("Public contribution feed failed", error); throw new HttpsError("internal", "Unable to load the public contribution feed."); }
});
