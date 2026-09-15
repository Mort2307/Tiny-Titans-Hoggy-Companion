import { getFunctions, httpsCallable } from "firebase/functions";
import type { RescueOrganisation, RescueRole } from "../types/rescue";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

type WorkspaceResponse = {
  success: boolean;
  organisation: Record<string, unknown> | null;
  role: RescueRole | null;
};

type TeamMember = {
  uid: string;
  email: string;
  displayName: string;
  role: RescueRole;
};

function millisToIso(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && value) return value;
  return "";
}

function normaliseOrganisation(item: Record<string, unknown> | null): RescueOrganisation | null {
  if (!item) return null;
  const list = (key: string) => Array.isArray(item[key]) ? item[key].filter((value): value is string => typeof value === "string") : [];
  return {
    id: String(item.id || ""),
    accountType: "rescue",
    accountStatus: String(item.accountStatus || "pilot_pending") as RescueOrganisation["accountStatus"],
    name: String(item.name || "TinyTitans Rescue"),
    ownerUid: String(item.ownerUid || ""),
    managerUids: list("managerUids"),
    staffUids: list("staffUids"),
    medicalUids: list("medicalUids"),
    fosterUids: list("fosterUids"),
    viewerUids: list("viewerUids"),
    speciesDiscovered: list("speciesDiscovered"),
    pilotStatus: String(item.pilotStatus || item.accountStatus || "pilot_pending") as RescueOrganisation["pilotStatus"],
    pilotStartsAt: millisToIso(item.pilotStartsAt),
    pilotEndsAt: millisToIso(item.pilotEndsAt),
    staffLimit: Number(item.staffLimit || 5),
    animalLimit: Number(item.animalLimit || 100),
    storageMbLimit: Number(item.storageMbLimit || 512),
    createdAt: millisToIso(item.createdAt),
    updatedAt: millisToIso(item.updatedAt),
  };
}

export async function getMyRescueWorkspace(): Promise<{ organisation: RescueOrganisation | null; role: RescueRole | null }> {
  const call = httpsCallable<Record<string, never>, WorkspaceResponse>(functions, "getMyRescueOrganisation");
  const result = await call({});
  return {
    organisation: normaliseOrganisation(result.data.organisation),
    role: result.data.role,
  };
}

export async function inviteRescueStaff(organisationId: string, email: string, role: Exclude<RescueRole, "owner">) {
  const call = httpsCallable<{ organisationId: string; email: string; role: Exclude<RescueRole, "owner"> }, { success: boolean; invitationId: string; expiresAt: number; role: string; email: string }>(functions, "inviteRescueStaff");
  const result = await call({ organisationId, email: email.trim().toLowerCase(), role });
  return result.data;
}

export async function getRescueTeam(organisationId: string): Promise<TeamMember[]> {
  const call = httpsCallable<{ organisationId: string }, { success: boolean; organisationId: string; members: TeamMember[] }>(functions, "getRescueTeam");
  const result = await call({ organisationId });
  return result.data.members;
}

export async function getRescueInvitation(invitationId: string) {
  const call = httpsCallable<{ invitationId: string }, { success: boolean; invitation: { id: string; organisationId: string; targetEmail: string; role: Exclude<RescueRole, "owner">; expiresAt: number | null; organisationName: string } }>(functions, "getRescueInvitation");
  const result = await call({ invitationId });
  return result.data.invitation;
}

export async function acceptRescueInvitation(invitationId: string) {
  const call = httpsCallable<{ invitationId: string }, { success: boolean; organisationId: string; role: Exclude<RescueRole, "owner">; organisationName: string }>(functions, "acceptRescueInvitation");
  const result = await call({ invitationId });
  return result.data;
}
