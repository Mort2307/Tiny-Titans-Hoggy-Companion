const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const db = getFirestore();
const bucket = getStorage().bucket();

exports.approveMorphImageSubmission = onCall(
  { region: "europe-west2", timeoutSeconds: 120, memory: "256MiB" },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");

    const caller = await db.collection("users").doc(request.auth.uid).get();
    const claims = request.auth.token || {};
    const creatorAuthorized = claims.creator === true || claims.admin === true || caller.data()?.role === "admin";
    if (!creatorAuthorized) throw new HttpsError("permission-denied", "Creator authorization is required.");

    const submissionId = String(request.data?.submissionId || "").trim();
    if (!submissionId) throw new HttpsError("invalid-argument", "A submission ID is required.");

    const submissionRef = db.collection("morphImageSubmissions").doc(submissionId);
    const submissionSnapshot = await submissionRef.get();
    if (!submissionSnapshot.exists) throw new HttpsError("not-found", "The morph submission could not be found.");

    const submission = submissionSnapshot.data() || {};
    if (submission.status !== "Pending" && submission.status !== "NeedsInfo") {
      throw new HttpsError("failed-precondition", "This submission is no longer awaiting approval.");
    }

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
      await destinationFile.setMetadata({
        contentType: "image/jpeg",
        metadata: { sourceSubmissionId: submissionId, approvedBy: request.auth.uid },
      });

      const approvedRef = db.collection("approvedMorphImages").doc();
      await approvedRef.set({
        morphId,
        morphName,
        imageUrl: null,
        storagePath: approvedPath,
        sourceStoragePath,
        creditType: submission.creditType || "anonymous",
        creditName: submission.creditName || null,
        creditSocial: submission.creditSocial || null,
        sourceSubmissionId: submissionId,
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: request.auth.uid,
      });

      await submissionRef.update({
        status: "Approved",
        morphId,
        morphName,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: request.auth.uid,
        approvedImageId: approvedRef.id,
      });

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
