import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { RescueOrganisation, RescueRole } from "../types/rescue";

const functions = getFunctions(app, "europe-west2");

type RescueOrganisationResponse = { success: boolean; organisation: RescueOrganisation | null; role: RescueRole | null };
type Invitation = { id: string; organisationId: string; targetEmail: string; role: RescueRole; expiresAt: number; organisationName: string };

const getOrgCall = httpsCallable<Record<string, never>, RescueOrganisationResponse>(functions, "getMyRescueOrganisation");
const createOrgCall = httpsCallable<{ name: string }, { success: boolean; organisation: RescueOrganisation }>(functions, "createRescueOrganisation");
const inviteCall = httpsCallable<{ organisationId: string; email: string; role: Exclude<RescueRole, "owner"> }, { success: boolean; invitationId: string; expiresAt: number; role: RescueRole; email: string }>(functions, "inviteRescueStaff");
const getInviteCall = httpsCallable<{ invitationId: string }, { success: boolean; invitation: Invitation }>(functions, "getRescueInvitation");
const acceptInviteCall = httpsCallable<{ invitationId: string }, { success: boolean; organisationId: string; role: RescueRole }>(functions, "acceptRescueInvitation");
const declineInviteCall = httpsCallable<{ invitationId: string }, { success: boolean; invitationId: string; declined: boolean }>(functions, "declineRescueInvitation");
const revokeCall = httpsCallable<{ organisationId: string; targetUid: string }, { success: boolean; organisationId: string; targetUid: string; removed: boolean }>(functions, "revokeRescueStaff");

export async function getMyRescueOrganisation() { return (await getOrgCall({})).data; }
export async function createRescueOrganisation(name: string) { return (await createOrgCall({ name })).data; }
export async function inviteRescueStaff(organisationId: string, email: string, role: Exclude<RescueRole, "owner">) { return (await inviteCall({ organisationId, email, role })).data; }
export async function getRescueInvitation(invitationId: string) { return (await getInviteCall({ invitationId })).data; }
export async function acceptRescueInvitation(invitationId: string) { return (await acceptInviteCall({ invitationId })).data; }
export async function declineRescueInvitation(invitationId: string) { return (await declineInviteCall({ invitationId })).data; }
export async function revokeRescueStaff(organisationId: string, targetUid: string) { return (await revokeCall({ organisationId, targetUid })).data; }
