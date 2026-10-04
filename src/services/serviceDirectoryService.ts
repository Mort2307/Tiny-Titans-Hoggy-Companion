import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

export type ServiceCategory = "exotics_vet" | "veterinary_practice" | "rescue" | "reptile_shop" | "breeder" | "supplier";
export type ServiceAnimalGroup = "reptiles" | "snakes" | "lizards" | "turtles_tortoises" | "amphibians" | "arachnids" | "invertebrates" | "fish" | "birds" | "mammals" | "exotics";

export type ServiceDirectoryEntry = {
  id: string;
  name: string;
  category: ServiceCategory;
  animalGroups: ServiceAnimalGroup[];
  line1: string;
  city: string;
  region: string;
  postcode: string;
  countryCode: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
  emergencyCare: boolean;
  verificationStatus: "creator_reviewed";
  verifiedAtMs: number | null;
  communitySubmissionCount: number;
};

export type ServiceDirectoryInput = {
  name: string;
  category: ServiceCategory;
  animalGroups: ServiceAnimalGroup[];
  line1?: string;
  city: string;
  region?: string;
  postcode?: string;
  countryCode: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  emergencyCare?: boolean;
};

export type ServiceDirectorySubmission = ServiceDirectoryInput & {
  id: string;
  submittedAtMs: number | null;
  status: "pending" | "approved" | "rejected";
};

const listCall = httpsCallable<{ category?: ServiceCategory; countryCode?: string }, { services: ServiceDirectoryEntry[] }>(functions, "listVerifiedServices");
const submitCall = httpsCallable<{ entry: ServiceDirectoryInput }, { success: boolean; submissionId: string }>(functions, "submitServiceDirectoryEntry");
const submissionsCall = httpsCallable<{ status?: "pending" | "approved" | "rejected" }, { submissions: ServiceDirectorySubmission[] }>(functions, "listServiceDirectorySubmissions");
const reviewCall = httpsCallable<{ submissionId: string; decision: "approve" | "reject"; reviewNote?: string }, { success: boolean; decision: string; serviceId?: string }>(functions, "reviewServiceDirectorySubmission");

export async function listVerifiedServices(filters: { category?: ServiceCategory; countryCode?: string } = {}) {
  return (await listCall(filters)).data.services || [];
}
export async function submitServiceDirectoryEntry(entry: ServiceDirectoryInput) {
  return (await submitCall({ entry })).data;
}
export async function listServiceDirectorySubmissions(status: "pending" | "approved" | "rejected" = "pending") {
  return (await submissionsCall({ status })).data.submissions || [];
}
export async function reviewServiceDirectorySubmission(submissionId: string, decision: "approve" | "reject", reviewNote = "") {
  return (await reviewCall({ submissionId, decision, reviewNote })).data;
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  exotics_vet: "Exotics vet",
  veterinary_practice: "Veterinary practice",
  rescue: "Rescue",
  reptile_shop: "Reptile shop",
  breeder: "Breeder",
  supplier: "Specialist supplier",
};

export const SERVICE_ANIMAL_GROUP_LABELS: Record<ServiceAnimalGroup, string> = {
  reptiles: "Reptiles",
  snakes: "Snakes",
  lizards: "Lizards",
  turtles_tortoises: "Turtles & tortoises",
  amphibians: "Amphibians",
  arachnids: "Arachnids",
  invertebrates: "Invertebrates",
  fish: "Fish",
  birds: "Birds",
  mammals: "Mammals",
  exotics: "Other exotics",
};
