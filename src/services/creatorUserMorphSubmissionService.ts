import { collection, collectionGroup, getDocs, orderBy, query, updateDoc, doc } from "firebase/firestore";
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

export async function reviewUserMorphSubmission(input: { userId: string; submissionId: string; status: UserMorphSubmissionStatus; reviewerNotes?: string; matchedCanonicalMorphId?: string }): Promise<void> {
  await updateDoc(doc(db, "users", input.userId, "morphSubmissions", input.submissionId), {
    status: input.status,
    reviewerNotes: input.reviewerNotes ?? "",
    matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
