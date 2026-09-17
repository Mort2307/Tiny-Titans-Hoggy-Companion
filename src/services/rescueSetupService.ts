import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { RescueRole } from "../types/rescue";

const functions = getFunctions(app, "europe-west2");

export type RescuePublicSetup = {
  id: string;
  name: string;
  logoUrl: string;
  heroImageUrl: string;
  directoryDescription: string;
  website: string;
  contactEmail: string;
  phone: string;
  locationLabel: string;
  postcode: string;
  region: string;
  country: string;
  openingHours: string;
  charityNumber: string;
  companyNumber: string;
  localAuthorityLicence: string;
  otherRegistrationNumber: string;
  registrationAuthority: string;
  registrationsPublic: boolean;
  directoryVisible: boolean;
  setupComplete: boolean;
  setupCompletedAt: number | null;
};

export type RescueSetupState = {
  success: boolean;
  organisationId: string;
  role: RescueRole;
  organisation: RescuePublicSetup;
};

function serviceError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return new Error(`${fallback}${code ? ` (${code})` : ""}${message ? `: ${message}` : "."}`);
}

export async function getRescueSetupState(organisationId: string): Promise<RescueSetupState> {
  try {
    const call = httpsCallable<{ organisationId: string }, RescueSetupState>(functions, "getRescueSetupState");
    return (await call({ organisationId })).data;
  } catch (error) {
    throw serviceError(error, "Could not load Rescue setup");
  }
}

export async function updateRescuePublicProfile(input: {
  organisationId: string;
  name: string;
  logoUrl: string;
  heroImageUrl: string;
  directoryDescription: string;
  website: string;
  contactEmail: string;
  phone: string;
  locationLabel: string;
  postcode: string;
  region: string;
  country: string;
  openingHours: string;
  charityNumber: string;
  companyNumber: string;
  localAuthorityLicence: string;
  otherRegistrationNumber: string;
  registrationAuthority: string;
  registrationsPublic: boolean;
  directoryVisible: boolean;
}): Promise<RescueSetupState> {
  try {
    const call = httpsCallable<typeof input, RescueSetupState>(functions, "updateRescuePublicProfile");
    return (await call(input)).data;
  } catch (error) {
    throw serviceError(error, "Could not save the Rescue public profile");
  }
}
