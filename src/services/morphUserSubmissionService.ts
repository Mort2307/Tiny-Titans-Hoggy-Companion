import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MorphSubmissionCategory, MorphSubmissionStatus, UserMorphSubmission } from "../types/MorphSubmission";

function submissionCollection(uid: string) {
  return collection(db, "users", uid, "morphSubmissions");
}

export type CreateMorphSubmissionInput = {
  submittedName: string;
  region: UserMorphSubmission["region"];
  category: MorphSubmissionCategory;
  description: string;
  knownGenetics?: string;
  sourceOrBreeder?: string;
  sourceUrl?: string;
};

export async function createUserMorphSubmission(uid: string, input: CreateMorphSubmissionInput): Promise<UserMorphSubmission> {
  if (!uid) throw new Error("You must be signed in to submit a morph.");
  const submittedName = input.submittedName.trim();
  if (submittedName.length < 2) throw new Error("Please provide the morph name.");
  if (!input.description.trim()) throw new Error("Please describe where the morph name came from or what is known about it.");

  const now = new Date().toISOString();
  const payload = {
    userId: uid,
    submittedName,
    region: input.region,
    category: input.category,
    description: input.description.trim(),
    knownGenetics: input.knownGenetics?.trim() || "",
    sourceOrBreeder: input.sourceOrBreeder?.trim() || "",
    sourceUrl: input.sourceUrl?.trim() || "",
    status: "pending" as MorphSubmissionStatus,
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  };
  const reference = await addDoc(submissionCollection(uid), payload);
  return { ...payload, id: reference.id, createdAt: now, updatedAt: now };
}

export async function getUserMorphSubmissions(uid: string): Promise<UserMorphSubmission[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(submissionCollection(uid), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as UserMorphSubmission);
}

export async function updateUserMorphSubmissionStatus(uid: string, submissionId: string, status: MorphSubmissionStatus, reviewerNotes?: string, matchedCanonicalMorphId?: string): Promise<void> {
  if (!uid || !submissionId) return;
  await updateDoc(doc(submissionCollection(uid), submissionId), {
    status,
    reviewerNotes: reviewerNotes ?? "",
    matchedCanonicalMorphId: matchedCanonicalMorphId ?? "",
    updatedAt: new Date().toISOString(),
    reviewedAt: serverTimestamp(),
  });
}
