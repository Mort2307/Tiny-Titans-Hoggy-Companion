import { addDoc, collection, getDocs, query, serverTimestamp, updateDoc, doc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import type { MorphSubmissionCategory, UserMorphSubmission, UserMorphSubmissionStatus } from "../types/morphSubmission";

function submissionCollection() {
  return collection(db, "variationCardSubmissions");
}

function boundedText(value: string | undefined, field: string, maxLength: number, required = false): string {
  const text = value?.trim() ?? "";
  if (required && !text) throw new Error(field + " is required.");
  if (text.length > maxLength) throw new Error(field + " is too long. Maximum " + maxLength + " characters.");
  return text;
}

function optionalHttpUrl(value: string | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("unsupported protocol");
    return parsed.toString();
  } catch {
    throw new Error("Source URL must be a valid http:// or https:// address.");
  }
}

export type CreateMorphSubmissionInput = {
  /** Optional during migration; existing terminology submissions are Hognose-originated. */
  speciesId?: string;
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
  const speciesId = input.speciesId?.trim() ?? "";
  if (!speciesId) throw new Error("Please select the species this morph or variation belongs to.");
  const species = findUniversalSpecies(speciesId);
  if (!species) throw new Error("Please select a recognised Tiny Titans species before submitting a morph or variation.");
  const submittedName = boundedText(input.submittedName, "Morph / variation name", 160, true);
  if (submittedName.length < 2) throw new Error("Please provide the morph or variation name.");
  const description = boundedText(input.description, "Description", 4000, true);
  const knownGenetics = boundedText(input.knownGenetics, "Known genetics", 4000);
  const sourceOrBreeder = boundedText(input.sourceOrBreeder, "Breeder / source", 1000);
  const sourceUrl = optionalHttpUrl(input.sourceUrl);
  if (sourceUrl.length > 2048) throw new Error("Source URL is too long.");

  const now = new Date().toISOString();
  const payload = {
    userId: uid,
    speciesId: species.id,
    speciesName: species.acceptedScientificName,
    submittedName,
    region: input.region,
    category: input.category,
    description,
    knownGenetics,
    sourceOrBreeder,
    sourceUrl,
    status: "pending" as UserMorphSubmissionStatus,
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  };
  const reference = await addDoc(submissionCollection(), payload);
  return { ...payload, id: reference.id, createdAt: now, updatedAt: now };
}

export async function getUserMorphSubmissions(uid: string): Promise<UserMorphSubmission[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(submissionCollection(), where("userId", "==", uid)));
  return snapshot.docs
    .map((item) => ({ ...item.data(), id: item.id }) as UserMorphSubmission)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateUserMorphSubmissionStatus(uid: string, submissionId: string, status: UserMorphSubmissionStatus, reviewerNotes?: string, matchedCanonicalMorphId?: string): Promise<void> {
  if (!uid || !submissionId) return;
  await updateDoc(doc(db, "variationCardSubmissions", submissionId), {
    status,
    reviewerNotes: reviewerNotes ?? "",
    matchedCanonicalMorphId: matchedCanonicalMorphId ?? "",
    updatedAt: new Date().toISOString(),
    reviewedAt: serverTimestamp(),
  });
}