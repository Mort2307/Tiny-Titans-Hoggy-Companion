const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const REGION = "europe-west2";
const VALID_CATEGORIES = new Set(["snake_keeping", "health_vet", "feeding", "weight", "shedding", "genetics", "breeding", "learning", "achievements", "community", "ui", "other"]);
const VALID_STATUSES = new Set(["suggested", "under_review", "planned", "in_development", "testing", "released", "declined", "backlog"]);

function requireUser(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function isAdmin(uid, authToken = {}) {
  if (authToken.admin === true) return true;
  const profile = await db.collection("users").doc(uid).get();
  return profile.data()?.role === "admin";
}

exports.listFeatureRequests = onCall({ region: REGION }, async (request) => {
  requireUser(request);
  const snapshot = await db.collection("featureRequests").where("visibility", "==", "public").get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
});

exports.listUserFeatureVotes = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const snapshot = await db.collection("users").doc(uid).collection("featureVotes").get();
  return snapshot.docs.map((item) => item.id);
});

exports.submitFeatureRequest = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const data = request.data || {};
  const title = String(data.title || "").trim();
  const description = String(data.description || "").trim();
  const whyUseful = String(data.whyUseful || "").trim();
  const category = String(data.category || "");
  if (title.length < 5 || title.length > 100) throw new HttpsError("invalid-argument", "Feature title must be between 5 and 100 characters.");
  if (description.length < 20 || description.length > 1000) throw new HttpsError("invalid-argument", "Please give the feature a useful description (20–1000 characters).");
  if (whyUseful.length > 600) throw new HttpsError("invalid-argument", "The usefulness explanation must be 600 characters or fewer.");
  if (!VALID_CATEGORIES.has(category)) throw new HttpsError("invalid-argument", "Invalid feature category.");
  const profile = await db.collection("users").doc(uid).get();
  const creatorName = String(data.creatorName || profile.data()?.displayName || "Tiny Titans user").trim().slice(0, 80) || "Tiny Titans user";
  const ref = db.collection("featureRequests").doc();
  await ref.set({ title, description, whyUseful, category, status: "suggested", voteCount: 0, createdBy: uid, creatorName, visibility: "public", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { id: ref.id };
});

exports.toggleFeatureVote = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  const featureId = String(request.data?.featureId || "").trim();
  if (!featureId) throw new HttpsError("invalid-argument", "A feature ID is required.");
  const featureRef = db.collection("featureRequests").doc(featureId);
  const voteRef = featureRef.collection("votes").doc(uid);
  const userVoteRef = db.collection("users").doc(uid).collection("featureVotes").doc(featureId);
  let voted = false;
  await db.runTransaction(async (transaction) => {
    const featureSnapshot = await transaction.get(featureRef);
    const voteSnapshot = await transaction.get(voteRef);
    if (!featureSnapshot.exists) throw new HttpsError("not-found", "This feature request no longer exists.");
    const feature = featureSnapshot.data() || {};
    if (feature.status === "declined") throw new HttpsError("failed-precondition", "Declined feature requests cannot be voted on.");
    const currentCount = Math.max(0, Number(feature.voteCount || 0));
    if (voteSnapshot.exists) {
      transaction.delete(voteRef);
      transaction.delete(userVoteRef);
      transaction.update(featureRef, { voteCount: Math.max(0, currentCount - 1), updatedAt: FieldValue.serverTimestamp() });
      voted = false;
    } else {
      transaction.create(voteRef, { uid, createdAt: FieldValue.serverTimestamp() });
      transaction.create(userVoteRef, { featureId, createdAt: FieldValue.serverTimestamp() });
      transaction.update(featureRef, { voteCount: currentCount + 1, updatedAt: FieldValue.serverTimestamp() });
      voted = true;
    }
  });
  return { voted };
});

exports.updateFeatureRequestStatus = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  if (!(await isAdmin(uid, request.auth.token || {}))) throw new HttpsError("permission-denied", "Creator authorization is required.");
  const featureId = String(request.data?.featureId || "").trim();
  const status = String(request.data?.status || "");
  if (!featureId || !VALID_STATUSES.has(status)) throw new HttpsError("invalid-argument", "Invalid feature status.");
  await db.collection("featureRequests").doc(featureId).update({ status, adminNote: request.data?.adminNote ? String(request.data.adminNote).trim().slice(0, 1000) : null, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});

exports.deleteFeatureRequest = onCall({ region: REGION }, async (request) => {
  const uid = requireUser(request);
  if (!(await isAdmin(uid, request.auth.token || {}))) throw new HttpsError("permission-denied", "Creator authorization is required.");
  const featureId = String(request.data?.featureId || "").trim();
  if (!featureId) throw new HttpsError("invalid-argument", "A feature ID is required.");
  await db.collection("featureRequests").doc(featureId).delete();
  return { success: true };
});
