const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function creatorAuthorized(request) {
  return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

const EDITABLE_KEYS = new Set([
  "speciesId", "speciesName", "morphId", "morphName", "description", "geneticsNotes",
  "observedTraits", "proofDetails", "proofReference", "creditType", "creditName",
  "creditSocial", "allowMorphLibraryLink", "creatorReviewerNotes", "status",
]);
const VALID_STATUS = new Set(["Pending", "NeedsInfo"]);
const VALID_CREDIT = new Set(["name", "social", "anonymous"]);

exports.saveMorphSubmissionReview = onCall({ region: "europe-west2", timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!creatorAuthorized(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can edit Creator submissions.");

  const submissionId = String(request.data?.submissionId || "").trim();
  if (!submissionId) throw new HttpsError("invalid-argument", "A submission ID is required.");
  const draft = request.data?.draft;
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new HttpsError("invalid-argument", "A review draft is required.");

  const submissionRef = db.collection("morphImageSubmissions").doc(submissionId);
  const snapshot = await submissionRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "The morph submission could not be found.");
  const before = snapshot.data() || {};
  if (before.status !== "Pending" && before.status !== "NeedsInfo") throw new HttpsError("failed-precondition", "Only pending or Needs Info submissions can be edited.");

  const updates = {};
  for (const [key, value] of Object.entries(draft)) {
    if (!EDITABLE_KEYS.has(key)) continue;
    if (key === "status") {
      const status = String(value || "").trim();
      if (!VALID_STATUS.has(status)) throw new HttpsError("invalid-argument", "Review drafts may only remain Pending or Needs Info.");
      updates.status = status;
      continue;
    }
    if (key === "allowMorphLibraryLink") {
      if (typeof value !== "boolean") throw new HttpsError("invalid-argument", "Morph Library publication must be true or false.");
      updates.allowMorphLibraryLink = value;
      continue;
    }
    const text = value === null || value === undefined ? "" : String(value).trim();
    if (["speciesId", "morphId", "morphName"].includes(key) && !text) throw new HttpsError("invalid-argument", `${key} is required for a review edit.`);
    if (key === "creditType" && !VALID_CREDIT.has(text)) throw new HttpsError("invalid-argument", "Invalid credit type.");
    updates[key] = text;
  }

  if (!Object.keys(updates).length) throw new HttpsError("invalid-argument", "No editable fields were supplied.");

  const changes = {};
  for (const [key, value] of Object.entries(updates)) {
    const beforeValue = before[key] ?? null;
    if (JSON.stringify(beforeValue) !== JSON.stringify(value)) changes[key] = { before: beforeValue, after: value };
  }

  if (Object.keys(changes).length) {
    await submissionRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
      lastEditedAt: FieldValue.serverTimestamp(),
      lastEditedBy: request.auth.uid,
    });
    await db.collection("creatorAudit").add({
      actorUid: request.auth.uid,
      action: "edit_morph_submission",
      submissionId,
      status: updates.status || before.status,
      changes,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { success: true, submissionId, updatedAt: new Date().toISOString() };
});
