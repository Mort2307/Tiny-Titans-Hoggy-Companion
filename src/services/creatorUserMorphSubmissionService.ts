import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { UserMorphSubmission, UserMorphSubmissionStatus } from "../types/morphSubmission";

export async function getAllUserMorphSubmissions(): Promise<UserMorphSubmission[]> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const submissions = await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "users", userDoc.id, "morphSubmissions"), orderBy("createdAt", "desc")),
        );
        return snapshot.docs.map((item) => ({
          ...item.data(),
          id: item.id,
          userId: item.data().userId || userDoc.id,
        }) as UserMorphSubmission);
      } catch {
        // A single user's malformed/missing subcollection must not prevent
        // Creator Centre from loading the rest of the global queue.
        return [];
      }
    }),
  );

  return submissions.flat().sort((a, b) => {
    const aTime = new Date(String(a.createdAt ?? 0)).getTime();
    const bTime = new Date(String(b.createdAt ?? 0)).getTime();
    return bTime - aTime;
  });
}

export async function reviewUserMorphSubmission(input: { userId: string; submissionId: string; status: UserMorphSubmissionStatus; reviewerNotes?: string; matchedCanonicalMorphId?: string; reviewerUid?: string }): Promise<void> {
  const submissionRef = doc(db, "users", input.userId, "morphSubmissions", input.submissionId);
  const snapshot = await getDoc(submissionRef);
  if (!snapshot.exists()) throw new Error("The variation submission could not be found.");
  const submission = { ...(snapshot.data() as Omit<UserMorphSubmission, "id">), id: snapshot.id } as UserMorphSubmission;

  await updateDoc(submissionRef, {
    status: input.status,
    reviewerNotes: input.reviewerNotes ?? "",
    matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const publicRef = doc(db, "approvedMorphVariations", input.userId + "_" + input.submissionId);
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
      contributorUid: submission.userId,
      reviewerNotes: input.reviewerNotes ?? "",
      matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
      geneticsStatus: "unresolved",
      calculatorEligible: false,
      approvedAt: serverTimestamp(),
      approvedBy: input.reviewerUid ?? "",
    }, { merge: true });
  } else if (input.status === "rejected" || input.status === "merged") {
    await deleteDoc(publicRef).catch(() => undefined);
  }
}
