const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");

const db = getFirestore();
const adminAuth = getAuth();
const bucket = getStorage().bucket("tinytitans-hoggy-companion.firebasestorage.app");
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
function ownerAccount(request) { return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL; }
function creatorAuthorized(request) { return ownerAccount(request); }
function invitationManagerAuthorized(request) { return ownerAccount(request); }

exports.reconcileCreatorClaim = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!ownerAccount(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can use Creator access.");
  try { const user = await adminAuth.getUser(request.auth.uid); const existingClaims = user.customClaims || {}; await adminAuth.setCustomUserClaims(request.auth.uid, { ...existingClaims, creator: true, tester: true, admin: true }); return { success: true, uid: request.auth.uid, creator: true, tester: true, admin: true, refreshRequired: existingClaims.creator !== true || existingClaims.tester !== true || existingClaims.admin !== true }; }
  catch (error) { console.error("Creator claim reconciliation failed", error); throw new HttpsError("internal", "Unable to reconcile Creator authorization."); }
});
exports.setCreatorClaim = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); if (!invitationManagerAuthorized(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can manage Creator access.");
  const targetUid = String(request.data?.uid || "").trim(); const enabled = request.data?.enabled !== false; if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
  if (enabled && targetUid !== request.auth.uid) throw new HttpsError("permission-denied", "Creator and Tester access are owner-only and cannot be granted to another account.");
  try { const target = await adminAuth.getUser(targetUid); const nextClaims = { ...(target.customClaims || {}) }; if (!enabled) { delete nextClaims.creatorTester; delete nextClaims.tester; delete nextClaims.creator; delete nextClaims.admin; await adminAuth.setCustomUserClaims(targetUid, nextClaims); await db.collection("users").doc(targetUid).set({ isTester: false, testerType: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "revoke_privileged_access", createdAt: FieldValue.serverTimestamp() }); return { success: true, uid: targetUid, creator: false, creatorTester: false, isTester: false }; } nextClaims.creator = true; nextClaims.tester = true; nextClaims.admin = true; await adminAuth.setCustomUserClaims(targetUid, nextClaims); await db.collection("users").doc(targetUid).set({ isTester: true, testerType: "creator", updatedAt: FieldValue.serverTimestamp() }, { merge: true }); await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "grant_owner_privileged_access", createdAt: FieldValue.serverTimestamp() }); return { success: true, uid: targetUid, creator: true, creatorTester: true, isTester: true }; }
  catch (error) { console.error("Creator claim update failed", error); if (error instanceof HttpsError) throw error; throw new HttpsError("internal", "Unable to update privileged access."); }
});

exports.approveMorphImageSubmission = onCall({ region: "europe-west2", timeoutSeconds: 120, memory: "256MiB" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); if (!creatorAuthorized(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can approve Creator submissions.");
  const submissionId = String(request.data?.submissionId || "").trim(); if (!submissionId) throw new HttpsError("invalid-argument", "A submission ID is required.");
  const submissionRef = db.collection("morphImageSubmissions").doc(submissionId); const submissionSnapshot = await submissionRef.get(); if (!submissionSnapshot.exists) throw new HttpsError("not-found", "The morph submission could not be found.");
  const submission = submissionSnapshot.data() || {}; if (submission.status !== "Pending" && submission.status !== "NeedsInfo") throw new HttpsError("failed-precondition", "This submission is no longer awaiting approval.");
  const morphId = String(submission.morphId || "").trim(); const morphName = String(submission.morphName || "").trim(); const speciesId = String(submission.speciesId || "").trim(); const sourceStoragePath = String(submission.attachment?.path || "").trim();
  if (!morphId || !morphName || !speciesId) throw new HttpsError("failed-precondition", "This submission has no complete species-specific Morph Library selection. It must be resolved before approval.");
  if (!sourceStoragePath.startsWith("morph-submissions/")) throw new HttpsError("failed-precondition", "The submitted media file could not be located safely.");
  const publishToMorphLibrary = submission.allowMorphLibraryLink !== false;
  const mediaType = submission.attachment?.type === "video" ? "video" : "image";
  const extension = mediaType === "video" ? (String(submission.attachment?.originalType || "").includes("webm") ? "webm" : String(submission.attachment?.originalType || "").includes("quicktime") ? "mov" : "mp4") : "jpg";
  const contentType = mediaType === "video" ? String(submission.attachment?.originalType || "video/mp4") : "image/jpeg";
  const approvedPath = `morphLibrary/${speciesId}/${morphId}/community/${submissionId}.${extension}`;
  try {
    const sourceFile = bucket.file(sourceStoragePath); const [exists] = await sourceFile.exists(); if (!exists) throw new HttpsError("not-found", "The submitted media is no longer available in temporary storage.");
    let approvedImageId = null; let responseStoragePath = "";
    if (publishToMorphLibrary) {
      const destinationFile = bucket.file(approvedPath); await sourceFile.copy(destinationFile); await destinationFile.setMetadata({ contentType, metadata: { sourceSubmissionId: submissionId, approvedBy: request.auth.uid, speciesId, morphId, mediaType } });
      const approvedRef = db.collection("approvedMorphImages").doc(); await approvedRef.set({ speciesId, speciesName: submission.speciesName || null, morphId, morphName, imageUrl: null, storagePath: approvedPath, mediaType, sourceStoragePath, creditType: submission.creditType || "anonymous", creditName: submission.creditName || null, creditSocial: submission.creditSocial || null, sourceSubmissionId: submissionId, approvedAt: FieldValue.serverTimestamp(), approvedBy: request.auth.uid });
      approvedImageId = approvedRef.id; responseStoragePath = approvedPath;
    }
    await submissionRef.update({ status: "Approved", speciesId, morphId, morphName, reviewedAt: FieldValue.serverTimestamp(), reviewedBy: request.auth.uid, approvedImageId, morphLibraryLinked: publishToMorphLibrary });
    await sourceFile.delete().catch(() => undefined);
    return { success: true, published: publishToMorphLibrary, approvedImageId, speciesId, morphId, morphName, storagePath: responseStoragePath, mediaType };
  } catch (error) {
    if (publishToMorphLibrary) await bucket.file(approvedPath).delete().catch(() => undefined);
    if (error instanceof HttpsError) throw error; console.error("Morph media approval failed", error); throw new HttpsError("internal", "Unable to approve the morph gallery submission. The submission has not been marked approved.");
  }
});

exports.deleteApprovedMorphImage = onCall({ region: "europe-west2", timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in."); if (!creatorAuthorized(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can remove approved morph media.");
  const approvedImageId = String(request.data?.approvedImageId || "").trim(); const reason = String(request.data?.reason || "").trim(); if (!approvedImageId) throw new HttpsError("invalid-argument", "An approved media ID is required."); if (!reason) throw new HttpsError("invalid-argument", "A removal reason is required.");
  const imageRef = db.collection("approvedMorphImages").doc(approvedImageId); const imageSnapshot = await imageRef.get(); if (!imageSnapshot.exists) throw new HttpsError("not-found", "The approved morph media could not be found."); const image = imageSnapshot.data() || {}; const storagePath = String(image.storagePath || "").trim();
  if (!storagePath.startsWith("morphLibrary/")) throw new HttpsError("failed-precondition", "The approved media has an invalid storage path.");
  try { await bucket.file(storagePath).delete().catch(() => undefined); await imageRef.delete(); if (image.sourceSubmissionId) await db.collection("morphImageSubmissions").doc(String(image.sourceSubmissionId)).set({ status: "Removed", removedAt: FieldValue.serverTimestamp(), removedBy: request.auth.uid, removalReason: reason }, { merge: true }); await db.collection("creatorAudit").add({ actorUid: request.auth.uid, action: "remove_approved_morph_media", approvedImageId, morphId: image.morphId || null, morphName: image.morphName || null, sourceSubmissionId: image.sourceSubmissionId || null, reason, createdAt: FieldValue.serverTimestamp() }); return { success: true, approvedImageId, morphId: image.morphId || null, morphName: image.morphName || null }; }
  catch (error) { console.error("Approved morph media removal failed", error); if (error instanceof HttpsError) throw error; throw new HttpsError("internal", "Unable to remove the approved morph media."); }
});
