import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

export const KEEPER_SERVICE_CATEGORIES = [
  "exotic_vet",
  "emergency_vet",
  "rescue",
  "reptile_shop",
  "breeder",
  "boarding",
  "transport",
  "other",
] as const;

export const KEEPER_SERVICE_ANIMAL_GROUPS = [
  "reptiles",
  "amphibians",
  "arachnids",
  "invertebrates",
  "fish",
  "birds",
  "mammals",
  "exotic_general",
] as const;

export const KEEPER_SERVICE_FEATURES = [
  "emergency_24h",
  "reptile_experienced",
  "exotics_only",
  "home_visits",
  "boarding",
  "delivery",
  "accessible",
] as const;

export type KeeperServiceCategory = (typeof KEEPER_SERVICE_CATEGORIES)[number];
export type KeeperServiceAnimalGroup = (typeof KEEPER_SERVICE_ANIMAL_GROUPS)[number];
export type KeeperServiceFeature = (typeof KEEPER_SERVICE_FEATURES)[number];
export type KeeperServiceSubmissionStatus = "pending" | "approved" | "rejected";

export type KeeperServiceEntry = {
  id: string;
  name: string;
  category: KeeperServiceCategory;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  website: string;
  publicEmail: string;
  publicPhone: string;
  openingHours: string;
  description: string;
  animalGroups: KeeperServiceAnimalGroup[];
  features: KeeperServiceFeature[];
  professionalRegistration: string;
  reviewLabel: string;
  reviewedAt: number | null;
};

export type KeeperServiceSubmission = Omit<KeeperServiceEntry, "reviewLabel" | "reviewedAt"> & {
  status: KeeperServiceSubmissionStatus;
  evidenceUrl: string;
  submittedByUid: string;
  submittedByName: string;
  submittedAt: number | null;
  reviewedAt: number | null;
  reviewNote: string;
};

export type KeeperServiceSubmissionInput = {
  name: string;
  category: KeeperServiceCategory;
  city: string;
  region?: string;
  country: string;
  postcode?: string;
  website?: string;
  publicEmail?: string;
  publicPhone?: string;
  openingHours?: string;
  description?: string;
  animalGroups: KeeperServiceAnimalGroup[];
  features?: KeeperServiceFeature[];
  professionalRegistration?: string;
  evidenceUrl?: string;
};

const listCall = httpsCallable<{ query?: string; category?: KeeperServiceCategory | "" }, { success: boolean; services: KeeperServiceEntry[]; count: number }>(functions, "listKeeperServices");
const submitCall = httpsCallable<KeeperServiceSubmissionInput, { success: boolean; submissionId: string; geocoded: boolean }>(functions, "submitKeeperService");
const mySubmissionsCall = httpsCallable<void, { success: boolean; submissions: KeeperServiceSubmission[] }>(functions, "listMyKeeperServiceSubmissions");
const creatorSubmissionsCall = httpsCallable<{ status?: KeeperServiceSubmissionStatus | "all" }, { success: boolean; submissions: KeeperServiceSubmission[] }>(functions, "getCreatorKeeperServiceSubmissions");
const reviewCall = httpsCallable<{ submissionId: string; action: "approve" | "reject"; reviewNote?: string }, { success: boolean; submissionId: string; status: KeeperServiceSubmissionStatus }>(functions, "reviewKeeperServiceSubmission");

export async function listKeeperServices(query = "", category: KeeperServiceCategory | "" = "") {
  return (await listCall({ query, category })).data.services || [];
}
export async function submitKeeperService(input: KeeperServiceSubmissionInput) {
  return (await submitCall(input)).data;
}
export async function listMyKeeperServiceSubmissions() {
  return (await mySubmissionsCall()).data.submissions || [];
}
export async function getCreatorKeeperServiceSubmissions(status: KeeperServiceSubmissionStatus | "all" = "pending") {
  return (await creatorSubmissionsCall({ status })).data.submissions || [];
}
export async function reviewKeeperServiceSubmission(submissionId: string, action: "approve" | "reject", reviewNote = "") {
  return (await reviewCall({ submissionId, action, reviewNote })).data;
}

export function keeperServiceCategoryLabel(value: KeeperServiceCategory): string {
  return ({
    exotic_vet: "Exotic vet",
    emergency_vet: "Emergency vet",
    rescue: "Rescue",
    reptile_shop: "Reptile shop",
    breeder: "Breeder",
    boarding: "Boarding",
    transport: "Animal transport",
    other: "Other service",
  } as Record<KeeperServiceCategory, string>)[value];
}
export function keeperAnimalGroupLabel(value: KeeperServiceAnimalGroup): string {
  return ({
    reptiles: "Reptiles",
    amphibians: "Amphibians",
    arachnids: "Arachnids",
    invertebrates: "Invertebrates",
    fish: "Fish",
    birds: "Birds",
    mammals: "Mammals",
    exotic_general: "General exotics",
  } as Record<KeeperServiceAnimalGroup, string>)[value];
}
export function keeperServiceFeatureLabel(value: KeeperServiceFeature): string {
  return ({
    emergency_24h: "24-hour emergency",
    reptile_experienced: "Reptile experienced",
    exotics_only: "Exotics focused",
    home_visits: "Home visits",
    boarding: "Boarding",
    delivery: "Delivery/transport",
    accessible: "Accessible",
  } as Record<KeeperServiceFeature, string>)[value];
}
