import { addDoc, collection, getDocs, orderBy, query, updateDoc, doc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/config";
import type { SpeciesSubmission, SpeciesSubmissionStatus } from "../types/speciesSubmission";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function submitSpeciesSubmission(userId: string, submission: Omit<SpeciesSubmission, "id" | "status" | "submittedAt" | "updatedAt">, files: File[]) {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, "users", userId, "speciesSubmissions"), {
    ...submission,
    status: "pending" satisfies SpeciesSubmissionStatus,
    submittedAt: now,
    updatedAt: now,
  });

  const images = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image file.`);
    if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 8 MB.`);
    const path = `species-submissions/${userId}/${docRef.id}/${index}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type, customMetadata: { submissionId: docRef.id, userId } });
    images.push({ path, name: file.name, type: file.type, sizeBytes: file.size });
  }

  await updateDoc(docRef, { images, updatedAt: new Date().toISOString() });
  return docRef.id;
}

export async function getAllSpeciesSubmissions(): Promise<SpeciesSubmission[]> {
  const users = await getDocs(collection(db, "users"));
  const batches = await Promise.all(users.docs.map(async (userDoc) => {
    try {
      const snapshot = await getDocs(query(collection(db, "users", userDoc.id, "speciesSubmissions"), orderBy("submittedAt", "desc")));
      return snapshot.docs.map((item) => ({ ...item.data(), id: item.id, userId: item.data().userId || userDoc.id }) as SpeciesSubmission);
    } catch {
      return [];
    }
  }));
  return batches.flat().sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

export async function reviewSpeciesSubmission(input: { userId: string; submissionId: string; status: SpeciesSubmissionStatus; reviewerNotes: string; reviewerUid: string }) {
  await updateDoc(doc(db, "users", input.userId, "speciesSubmissions", input.submissionId), {
    status: input.status,
    reviewerNotes: input.reviewerNotes,
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewerUid,
    updatedAt: new Date().toISOString(),
  });
}

export async function getSpeciesSubmissionImageUrl(path: string) {
  return getDownloadURL(ref(storage, path));
}
