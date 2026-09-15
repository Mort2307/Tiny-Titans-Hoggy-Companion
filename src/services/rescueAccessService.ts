import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { RescueAccountStatus, RescueRole } from "../types/rescue";

const functions = getFunctions(app, "europe-west2");

type RescueWorkspaceAccess = {
  success: boolean;
  active: boolean;
  organisationId: string | null;
  role: RescueRole | null;
  accountStatus: RescueAccountStatus | null;
  pilotStatus: RescueAccountStatus | null;
  pilotEndsAt: number | null;
  staffLimit: number | null;
  animalLimit: number | null;
};

const getWorkspaceAccessCall = httpsCallable<Record<string, never>, RescueWorkspaceAccess>(functions, "getRescueWorkspaceAccess");

export async function getRescueWorkspaceAccess(): Promise<RescueWorkspaceAccess> {
  return (await getWorkspaceAccessCall({})).data;
}
