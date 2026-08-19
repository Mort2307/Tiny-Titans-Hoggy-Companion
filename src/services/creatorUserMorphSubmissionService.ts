import { collectionGroup, getDocs, orderBy, query, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MorphSubmissionStatus, UserMorphSubmission } from "../types/MorphSubmission";

export async function getAllUserMorphSubmissions(): Promise<UserMorphSubmission[]> {
  const snapshot = await getDocs(query(collectionGroup(db, "morphSubmissions"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as UserMorphSubmission);
}

export async function reviewUserMorphSubmission(input: { userId: string; submissionId: string; status: MorphSubmissionStatus; reviewerNotes?: string; matchedCanonicalMorphId?: string }): Promise<void> {
  await updateDoc(doc(db, "users", input.userId, "morphSubmissions", input.submissionId), {
    status: input.status,
    reviewerNotes: input.reviewerNotes ?? "",
    matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
