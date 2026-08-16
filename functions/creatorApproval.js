const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");

const db = getFirestore();
const adminAuth = getAuth();
const bucket = getStorage().bucket();

function creatorAuthorized(request) {
  return request.auth?.token?.admin === true || request.auth?.token?.creator === true || request.auth?.token?.creatorTester === true;
}

exports.setCreatorClaim = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const caller = await db.collection("users").doc(request.auth.uid).get();
  const callerClaims = request.auth.token || {};
  const callerAuthorized = callerClaims.admin === true || callerClaims.creator === true || caller.data()?.role === "admin";
  if (!callerAuthorized) throw new HttpsError("permission-denied", "Creator authorization is required.");
  const targetUid = String(request.data?.uid || "").trim();
  const enabled = request.data?.enabled !== false;
  if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
  if (targetUid === request.auth.uid && !enabled) throw new HttpsError("failed-precondition", "The current Creator cannot remove their own Creator access.");
  try {
    const target = await adminAuth.getUser(targetUid);
    const existingClaims = target.customClaims || {};
    const nextClaims = { ...existingClaims };
    if (enabled) {
      nextClaims.creator = true;
      nextClaims.creatorTester = true;
    } else {
      delete nextClaims.creatorTester;
    }
    await adminAuth.setCustomUserClaims(targetUid, nextClaims);
    await db.collection("users").doc(targetUid).set({ isTester: enabled, testerType: enabled ? "creator" : null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: enabled ? "grant_creator_tester" : "revoke_creator_tester", createdAt: FieldValue.serverTimestamp() });
    return { success: true, uid: targetUid, creator: enabled, creatorTester: enabled, isTester: enabled };
  } catch (error) {
    console.error("Creator Tester authorization update failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to update Creator Tester authorization.");
  }
});

exports.approveMorphImageSubmission = onCall(
  { region: "europe-west2", timeoutSeconds: 120, memory: "256MiB" },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
    const caller = await db.collection("users").doc(request.auth.uid).get();
    const claims = request.auth.token || {};
    const creatorAuthorized = claims.creator === true || claims.admin === true || claims.creatorTester === true || caller.data()?.role === "admin";
    if (!creatorAuthorized) throw new HttpsError("permission-denied", "Creator authorization is required.");
    const submissionId = String(request.data?.submissionId || "").trim();
    if (!submissionId) throw new HttpsError("invalid-argument", "A submission ID is required.");
    const submissionRef = db.collection("morphImageSubmissions").doc(submissionId);
    const submissionSnapshot = await submissionRef.get();
    if (!submissionSnapshot.exists) throw new HttpsError("not-found", "The morph submission could not be found.");
    const submission = submissionSnapshot.data() || {};
    if (submission.status !== "Pending" && submission.status !== "NeedsInfo") throw new HttpsError("failed-precondition", "This submission is no longer awaiting approval.");
    const morphId = String(submission.morphId || "").trim();
    const morphName = String(submission.morphName || "").trim();
    const sourceStoragePath = String(submission.attachment?.path || "").trim();
    if (!morphId || !morphName) throw new HttpsError("failed-precondition", "This submission has no canonical Morph Library selection. It must be resolved before approval.");
    if (!sourceStoragePath || !sourceStoragePath.startsWith("morph-submissions/")) throw new HttpsError("failed-precondition", "The submitted image file could not be located safely.");
    const approvedPath = `morphLibrary/${morphId}/community/${submissionId}.jpg`;
    try {
      const sourceFile = bucket.file(sourceStoragePath);
      const [exists] = await sourceFile.exists();
      if (!exists) throw new HttpsError("not-found", "The submitted image is no longer available in temporary storage.");
      const destinationFile = bucket.file(approvedPath);
      await sourceFile.copy(destinationFile);
      await destinationFile.setMetadata({ contentType: "image/jpeg", metadata: { sourceSubmissionId: submissionId, approvedBy: request.auth.uid } });
      const approvedRef = db.collection("approvedMorphImages").doc();
      await approvedRef.set({ morphId, morphName, imageUrl: null, storagePath: approvedPath, sourceStoragePath, creditType: submission.creditType || "anonymous", creditName: submission.creditName || null, creditSocial: submission.creditSocial || null, sourceSubmissionId: submissionId, approvedAt: FieldValue.serverTimestamp(), approvedBy: request.auth.uid });
      await submissionRef.update({ status: "Approved", morphId, morphName, reviewedAt: FieldValue.serverTimestamp(), reviewedBy: request.auth.uid, approvedImageId: approvedRef.id });
      await sourceFile.delete().catch(() => undefined);
      return { success: true, approvedImageId: approvedRef.id, morphId, morphName, storagePath: approvedPath };
    } catch (error) {
      await bucket.file(approvedPath).delete().catch(() => undefined);
      if (error instanceof HttpsError) throw error;
      console.error("Morph image approval failed", error);
      throw new HttpsError("internal", "Unable to approve the morph image submission. The submission has not been marked approved.");
    }
  }
);

exports.deleteApprovedMorphImage = onCall(
  { region: "europe-west2", timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
    if (!creatorAuthorized(request)) throw new HttpsError("permission-denied", "Creator authorization is required.");
    const approvedImageId = String(request.data?.approvedImageId || "").trim();
    const reason = String(request.data?.reason || "").trim();
    if (!approvedImageId) throw new HttpsError("invalid-argument", "An approved image ID is required.");
    if (!reason) throw new HttpsError("invalid-argument", "A removal reason is required.");
    const imageRef = db.collection("approvedMorphImages").doc(approvedImageId);
    const imageSnapshot = await imageRef.get();
    if (!imageSnapshot.exists) throw new HttpsError("not-found", "The approved morph image could not be found.");
    const image = imageSnapshot.data() || {};
    const storagePath = String(image.storagePath || "").trim();
    if (!storagePath.startsWith("morphLibrary/")) throw new HttpsError("failed-precondition", "The approved image has an invalid storage path.");
    try {
      await bucket.file(storagePath).delete().catch((error) => console.warn("Approved morph image storage object was already missing", storagePath, error?.message || error));
      await imageRef.delete();
      if (image.sourceSubmissionId) {
        await db.collection("morphImageSubmissions").doc(String(image.sourceSubmissionId)).set({ status: "Removed", removedAt: FieldValue.serverTimestamp(), removedBy: request.auth.uid, removalReason: reason }, { merge: true });
      }
      await db.collection("creatorAudit").add({ actorUid: request.auth.uid, action: "remove_approved_morph_image", approvedImageId, morphId: image.morphId || null, morphName: image.morphName || null, sourceSubmissionId: image.sourceSubmissionId || null, reason, createdAt: FieldValue.serverTimestamp() });
      return { success: true, approvedImageId, morphId: image.morphId || null, morphName: image.morphName || null };
    } catch (error) {
      console.error("Approved morph image removal failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Unable to remove the approved morph image.");
    }
  }
);
