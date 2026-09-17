import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { StaffHistoryEntry } from "./rescueWorkspaceService";

const functions = getFunctions(app, "europe-west2");

type WorkspaceSection = "hub" | "analytics" | "export" | "seller" | "marketplace" | "business" | "team" | "automation" | "support" | "api" | "branding";

type WorkspaceResponse = {
  success: boolean;
  section: WorkspaceSection;
  workspace: Record<string, unknown>;
  apiKeys: Array<Record<string, unknown>>;
  teamMembers: Array<Record<string, unknown>>;
  automations: Array<Record<string, unknown>>;
};

export type BusinessStaffMember = { id: string; email: string; displayName: string; role: string; status: string; note?: string; createdAt?: unknown; updatedAt?: unknown };
export type BusinessStaffManagement = { success: boolean; organisationId: string; tier: string; roleManage: boolean; members: BusinessStaffMember[]; history: StaffHistoryEntry[] };

const getWorkspaceCall = httpsCallable<{ section: WorkspaceSection }, WorkspaceResponse>(functions, "getPaidBusinessWorkspace");
const saveWorkspaceCall = httpsCallable<{ section: "seller" | "marketplace" | "business" | "branding"; payload: Record<string, unknown> }, { success: boolean; section: string; saved: Record<string, unknown> }>(functions, "savePaidBusinessWorkspace");
const upsertTeamCall = httpsCallable<{ payload: Record<string, unknown> }, { success: boolean; id: string }>(functions, "upsertPaidTeamMember");
const removeTeamCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "removePaidTeamMember");
const upsertAutomationCall = httpsCallable<{ payload: Record<string, unknown> }, { success: boolean; id: string }>(functions, "upsertPaidAutomation");
const removeAutomationCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "removePaidAutomation");
const createApiKeyCall = httpsCallable<{ name: string }, { success: boolean; id: string; name: string; secret: string }>(functions, "createPaidApiKey");
const revokeApiKeyCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "revokePaidApiKey");
const getBusinessStaffCall = httpsCallable<Record<string, never>, BusinessStaffManagement>(functions, "getBusinessStaffManagement");
const saveBusinessStaffCall = httpsCallable<{ payload: Record<string, unknown> }, { success: boolean; id: string }>(functions, "saveBusinessStaffMember");
const clearBusinessStaffCall = httpsCallable<{ id: string }, { success: boolean; id: string; cleared: boolean }>(functions, "clearBusinessStaffMember");

export async function getPaidBusinessWorkspace(section: WorkspaceSection): Promise<WorkspaceResponse> { return (await getWorkspaceCall({ section })).data; }
export async function savePaidBusinessWorkspace(section: "seller" | "marketplace" | "business" | "branding", payload: Record<string, unknown>) { return (await saveWorkspaceCall({ section, payload })).data; }
export async function upsertPaidTeamMember(payload: Record<string, unknown>) { return (await upsertTeamCall({ payload })).data; }
export async function removePaidTeamMember(id: string) { return (await removeTeamCall({ id })).data; }
export async function upsertPaidAutomation(payload: Record<string, unknown>) { return (await upsertAutomationCall({ payload })).data; }
export async function removePaidAutomation(id: string) { return (await removeAutomationCall({ id })).data; }
export async function createPaidApiKey(name: string) { return (await createApiKeyCall({ name })).data; }
export async function revokePaidApiKey(id: string) { return (await revokeApiKeyCall({ id })).data; }
export async function getBusinessStaffManagement(): Promise<BusinessStaffManagement> { return (await getBusinessStaffCall({})).data; }
export async function saveBusinessStaffMember(payload: Record<string, unknown>) { return (await saveBusinessStaffCall({ payload })).data; }
export async function clearBusinessStaffMember(id: string) { return (await clearBusinessStaffCall({ id })).data; }
