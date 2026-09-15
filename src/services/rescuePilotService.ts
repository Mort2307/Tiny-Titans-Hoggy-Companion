import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

type RescuePilotOrganisation = {
  id: string;
  name: string;
  ownerUid: string;
  accountType: string;
  pilotStatus: string;
  pilotStartsAt: number | null;
  pilotEndsAt: number | null;
  staffLimit: number;
  animalLimit: number;
  storageMbLimit: number;
  updatedAt: number | null;
};

export type RescuePilotControls = { pilotsEnabled: boolean; writesEnabled: boolean; maxActivePilots: number };
export type RescuePilotSnapshot = { success: boolean; controls: RescuePilotControls; activePilots: number; organisations: RescuePilotOrganisation[] };
type ConfigureRescuePilotInput = { organisationId: string; enabled: boolean; durationDays?: number; staffLimit?: number; animalLimit?: number; storageMbLimit?: number };

type ConfigureRescuePilotResponse = { success: boolean; organisationId: string; pilotStatus: string; pilotStartsAt?: string; pilotEndsAt?: string; staffLimit?: number; animalLimit?: number; storageMbLimit?: number };
const getPilotsCall = httpsCallable<Record<string, never>, RescuePilotSnapshot>(functions, "getCreatorRescuePilots");
const setControlsCall = httpsCallable<Partial<RescuePilotControls>, { success: boolean; controls: RescuePilotControls }>(functions, "setRescuePlatformControls");
const configurePilotCall = httpsCallable<ConfigureRescuePilotInput, ConfigureRescuePilotResponse>(functions, "configureRescuePilot");
const convertCall = httpsCallable<{ organisationId: string }, { success: boolean; organisationId: string; accountStatus: string }>(functions, "convertRescuePilotToPaid");

export async function getRescuePilotSnapshot(): Promise<RescuePilotSnapshot> { return (await getPilotsCall({})).data; }
export async function setRescuePlatformControls(patch: Partial<RescuePilotControls>) { return (await setControlsCall(patch)).data; }
export async function configureRescuePilot(input: ConfigureRescuePilotInput) { return (await configurePilotCall(input)).data; }
export async function convertRescuePilotToPaid(organisationId: string) { return (await convertCall({ organisationId })).data; }
