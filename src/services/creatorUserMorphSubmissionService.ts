import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { UserMorphSubmission, UserMorphSubmissionStatus } from "../types/morphSubmission";

async function getLegacyUserMorphSubmissions(): Promise<UserMorphSubmission[]> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const nested = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
    try {
      const snapshot = await getDocs(collection(db, "users", userDoc.id, "morphSubmissions"));
      return snapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
        userId: item.data().userId || userDoc.id,
      }) as UserMorphSubmission);
    } catch {
      return [];
    }
  }));
  return nested.flat();
}

export async function getAllUserMorphSubmissions(): Promise<UserMorphSubmission[]> {
  const [modernSnapshot, legacy] = await Promise.all([
    getDocs(collection(db, "variationCardSubmissions")),
    getLegacyUserMorphSubmissions(),
  ]);

  const modern = modernSnapshot.docs.map((item) => ({
    ...item.data(),
    id: item.id,
  }) as UserMorphSubmission);

  const seen = new Set(modern.map((item) => item.userId + ":" + item.id));
  const combined = [
    ...modern,
    ...legacy.filter((item) => !seen.has(item.userId + ":" + item.id)),
  ];

  return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function resolveSubmissionRef(userId: string, submissionId: string) {
  const modernRef = doc(db, "variationCardSubmissions", submissionId);
  const modernSnapshot = await getDoc(modernRef);
  if (modernSnapshot.exists()) {
    return { ref: modernRef, snapshot: modernSnapshot, source: "variationCardSubmissions" as const };
  }

  const legacyRef = doc(db, "users", userId, "morphSubmissions", submissionId);
  const legacySnapshot = await getDoc(legacyRef);
  if (legacySnapshot.exists()) {
    return { ref: legacyRef, snapshot: legacySnapshot, source: "legacyUserMorphSubmissions" as const };
  }

  throw new Error("The variation submission could not be found.");
}

export async function reviewUserMorphSubmission(input: {
  userId: string;
  submissionId: string;
  status: UserMorphSubmissionStatus;
  reviewerNotes?: string;
  matchedCanonicalMorphId?: string;
  reviewerUid?: string;
}): Promise<void> {
  const resolved = await resolveSubmissionRef(input.userId, input.submissionId);
  const submission = { ...(resolved.snapshot.data() as Omit<UserMorphSubmission, "id">), id: resolved.snapshot.id } as UserMorphSubmission;
  if (submission.userId !== input.userId) throw new Error("The variation submission owner does not match the review request.");

  await updateDoc(resolved.ref, {
    status: input.status,
    reviewerNotes: input.reviewerNotes ?? "",
    matchedCanonicalMorphId: input.matchedCanonicalMorphId ?? "",
    reviewedAt: serverTimestamp(),
    reviewedBy: input.reviewerUid ?? "",
    updatedAt: new Date().toISOString(),
    migratedReviewSource: resolved.source,
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
      geneticsStatus: "unresolved",
      calculatorEligible: false,
      approvedAt: serverTimestamp(),
    }, { merge: true });
  } else if (input.status === "rejected" || input.status === "merged") {
    await deleteDoc(publicRef).catch(() => undefined);
  }
}
