import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { UserMorphSubmission, UserMorphSubmissionStatus } from "../types/morphSubmission";

export async function getAllUserMorphSubmissions(): Promise<UserMorphSubmission[]> {
  const snapshot = await getDocs(collection(db, "variationCardSubmissions"));
  return snapshot.docs
    .map((item) => ({ ...item.data(), id: item.id }) as UserMorphSubmission)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function reviewUserMorphSubmission(input: {
  userId: string;
  submissionId: string;
  status: UserMorphSubmissionStatus;
  reviewerNotes?: string;
  matchedCanonicalMorphId?: string;
  reviewerUid?: string;
}): Promise<void> {
  const submissionRef = doc(db, "variationCardSubmissions", input.submissionId);
  const snapshot = await getDoc(submissionRef);
  if (!snapshot.exists()) throw new Error("The variation submission could not be found.");
  const submission = { ...(snapshot.data() as Omit<UserMorphSubmission, "id">), id: snapshot.id } as UserMorphSubmission;
  if (submission.userId !== input.userId) throw new Error("The variation submission owner does not match the review request.");

  await updateDoc(submissionRef, {
    status: input.status,
    reviewerNotes: input.reviewerNotes ?? "",
    matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
    reviewedAt: serverTimestamp(),
    reviewedBy: input.reviewerUid ?? "",
    updatedAt: new Date().toISOString(),
  });

  const publicRef = doc(db, "approvedMorphVariations", "variation_" + input.submissionId);
  if (input.status === "approved") {
    await setDoc(publicRef, {
      speciesId: submission.speciesId,
      speciesName: submission.speciesName ?? "",
      name: submission.submittedName,
      category: submission.category,
      description: submission.description,
      knownGenetics: submission.knownGenetics ?? "",
      sourceOrBreeder: submission.sourceOrBreeder ?? "",
      sourceUrl: submission.sourceUrl ?? "",
      sourceSubmissionId: submission.id,
      matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
      geneticsStatus: "unresolved",
      calculatorEligible: false,
      approvedAt: serverTimestamp(),
    }, { merge: true });
  } else if (input.status === "rejected" || input.status === "merged") {
    await deleteDoc(publicRef).catch(() => undefined);
  }
}
