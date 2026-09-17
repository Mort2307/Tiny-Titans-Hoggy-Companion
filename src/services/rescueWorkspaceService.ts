import { getFunctions, httpsCallable } from "firebase/functions";
import type { RescueOrganisation, RescueRole } from "../types/rescue";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

type WorkspaceResponse = { success: boolean; organisation: Record<string, unknown> | null; role: RescueRole | null };
type TeamMember = { uid: string; email: string; displayName: string; role: RescueRole };
export type StaffHistoryEntry = {
  id: string;
  organisationType: "rescue" | "business";
  organisationId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  subjectEmail: string;
  subjectName: string;
  fromRole: string;
  toRole: string;
  fromStatus: string;
  toStatus: string;
  actorUid: string;
  source: string;
  note: string;
  createdAt: number | null;
  updatedAt: number | null;
  noteUpdatedAt: number | null;
};
export type RescueStaffInvitation = { id: string; email: string; role: string; status: string; invitedByUid: string; invitedAt: number | null; expiresAt: number | null; updatedAt: number | null };
export type RescueStaffManagement = { success: boolean; organisationId: string; members: TeamMember[]; invitations: RescueStaffInvitation[]; history: StaffHistoryEntry[] };

function millisToIso(value: unknown): string { if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString(); if (typeof value === "string" && value) return value; return ""; }
function normaliseOrganisation(item: Record<string, unknown> | null): RescueOrganisation | null { if (!item) return null; const list = (key: string) => Array.isArray(item[key]) ? item[key].filter((value): value is string => typeof value === "string") : []; return { id: String(item.id || ""), accountType: "rescue", accountStatus: String(item.accountStatus || "pilot_pending") as RescueOrganisation["accountStatus"], name: String(item.name || "My Rescue Centre"), ownerUid: String(item.ownerUid || ""), managerUids: list("managerUids"), staffUids: list("staffUids"), medicalUids: list("medicalUids"), fosterUids: list("fosterUids"), viewerUids: list("viewerUids"), speciesDiscovered: list("speciesDiscovered"), website: String(item.website || ""), contactEmail: String(item.contactEmail || ""), phone: String(item.phone || ""), charityNumber: String(item.charityNumber || ""), companyNumber: String(item.companyNumber || ""), localAuthorityLicence: String(item.localAuthorityLicence || ""), otherRegistrationNumber: String(item.otherRegistrationNumber || ""), registrationAuthority: String(item.registrationAuthority || ""), registrationNotes: String(item.registrationNotes || ""), registrationEvidenceUrl: String(item.registrationEvidenceUrl || ""), registrationsPublic: item.registrationsPublic !== false, pilotStatus: String(item.pilotStatus || item.accountStatus || "pilot_pending") as RescueOrganisation["pilotStatus"], pilotStartsAt: millisToIso(item.pilotStartsAt), pilotEndsAt: millisToIso(item.pilotEndsAt), staffLimit: Number(item.staffLimit || 5), animalLimit: Number(item.animalLimit || 100), storageMbLimit: Number(item.storageMbLimit || 512), createdAt: millisToIso(item.createdAt), updatedAt: millisToIso(item.updatedAt) }; }
function functionError(error: unknown, fallback: string) { const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code || "") : ""; const message = error instanceof Error ? error.message : typeof error === "string" ? error : ""; return new Error(`${fallback}${code ? ` (${code})` : ""}${message ? `: ${message}` : "."}`); }

export async function getMyRescueWorkspace(): Promise<{ organisation: RescueOrganisation | null; role: RescueRole | null }> { const call = httpsCallable<Record<string, never>, WorkspaceResponse>(functions, "getMyRescueOrganisation"); try { const result = await call({}); return { organisation: normaliseOrganisation(result.data.organisation), role: result.data.role }; } catch (error) { throw functionError(error, "Rescue workspace service failed"); } }
export async function inviteRescueStaff(organisationId: string, email: string, role: Exclude<RescueRole, "owner">) { const call = httpsCallable<{ organisationId: string; email: string; role: Exclude<RescueRole, "owner"> }, { success: boolean; invitationId: string; expiresAt: number; role: string; email: string }>(functions, "inviteRescueStaff"); try { const result = await call({ organisationId, email: email.trim().toLowerCase(), role }); return result.data; } catch (error) { throw functionError(error, "Rescue staff invitation failed"); } }
export async function getRescueTeam(organisationId: string): Promise<TeamMember[]> { const call = httpsCallable<{ organisationId: string }, { success: boolean; organisationId: string; members: TeamMember[] }>(functions, "getRescueTeam"); try { const result = await call({ organisationId }); return result.data.members; } catch (error) { throw functionError(error, "Rescue team service failed"); } }
export async function getRescueInvitation(invitationId: string) { const call = httpsCallable<{ invitationId: string }, { success: boolean; invitation: { id: string; organisationId: string; targetEmail: string; role: Exclude<RescueRole, "owner">; expiresAt: number | null; organisationName: string } }>(functions, "getRescueInvitation"); try { const result = await call({ invitationId }); return result.data.invitation; } catch (error) { throw functionError(error, "Rescue invitation lookup failed"); } }
export async function acceptRescueInvitation(invitationId: string) { const call = httpsCallable<{ invitationId: string }, { success: boolean; organisationId: string; role: Exclude<RescueRole, "owner">; organisationName: string }>(functions, "acceptRescueInvitation"); try { const result = await call({ invitationId }); return result.data; } catch (error) { throw functionError(error, "Rescue invitation acceptance failed"); } }
export async function getRescueStaffManagement(organisationId: string): Promise<RescueStaffManagement> { const call = httpsCallable<{ organisationId: string }, RescueStaffManagement>(functions, "getRescueStaffManagement"); try { return (await call({ organisationId })).data; } catch (error) { throw functionError(error, "Rescue staff management failed"); } }
export async function clearRescueStaffInvitation(organisationId: string, invitationId: string) { const call = httpsCallable<{ organisationId: string; invitationId: string }, { success: boolean; invitationId: string; cleared: boolean }>(functions, "clearRescueStaffInvitation"); try { return (await call({ organisationId, invitationId })).data; } catch (error) { throw functionError(error, "Rescue invitation cleanup failed"); } }
export async function updateRescueStaffRole(organisationId: string, targetUid: string, role: Exclude<RescueRole, "owner">) { const call = httpsCallable<{ organisationId: string; targetUid: string; role: Exclude<RescueRole, "owner"> }, { success: boolean; targetUid: string; fromRole: string; role: string }>(functions, "updateRescueStaffRole"); try { return (await call({ organisationId, targetUid, role })).data; } catch (error) { throw functionError(error, "Rescue staff role update failed"); } }
export async function editOrganisationStaffHistory(organisationType: "rescue" | "business", organisationId: string, historyId: string, note: string) { const call = httpsCallable<{ organisationType: "rescue" | "business"; organisationId: string; historyId: string; note: string }, { success: boolean; historyId: string }>(functions, "editOrganisationStaffHistory"); try { return (await call({ organisationType, organisationId, historyId, note })).data; } catch (error) { throw functionError(error, "Staff history update failed"); } }
