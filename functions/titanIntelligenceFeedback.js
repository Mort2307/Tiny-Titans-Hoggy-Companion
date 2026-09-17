const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const ALLOWED = new Set(["helpful", "not_helpful"]);

exports.recordTitanFeedback = onCall({ region: "europe-west2" }, async (request) => {
  const uid = String(request.auth?.uid || "");
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in to rate a Titan answer.");
  const responseId = String(request.data?.responseId || "").trim().slice(0, 160);
  const rating = String(request.data?.rating || "").trim();
  const workspaceKind = String(request.data?.workspaceKind || "personal").trim().slice(0, 40);
  if (!responseId || !ALLOWED.has(rating)) throw new HttpsError("invalid-argument", "A valid Titan response and rating are required.");
  await db.collection("titanFeedback").doc(`${uid}_${responseId}`).set({
    uid,
    responseId,
    rating,
    workspaceKind,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true, rating };
});