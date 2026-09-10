import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

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

const getWorkspaceCall = httpsCallable<{ section: WorkspaceSection }, WorkspaceResponse>(functions, "getPaidBusinessWorkspace");
const saveWorkspaceCall = httpsCallable<{ section: "seller" | "marketplace" | "business" | "branding"; payload: Record<string, unknown> }, { success: boolean; section: string; saved: Record<string, unknown> }>(functions, "savePaidBusinessWorkspace");
const upsertTeamCall = httpsCallable<{ payload: Record<string, unknown> }, { success: boolean; id: string }>(functions, "upsertPaidTeamMember");
const removeTeamCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "removePaidTeamMember");
const upsertAutomationCall = httpsCallable<{ payload: Record<string, unknown> }, { success: boolean; id: string }>(functions, "upsertPaidAutomation");
const removeAutomationCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "removePaidAutomation");
const createApiKeyCall = httpsCallable<{ name: string }, { success: boolean; id: string; name: string; secret: string }>(functions, "createPaidApiKey");
const revokeApiKeyCall = httpsCallable<{ id: string }, { success: boolean; id: string }>(functions, "revokePaidApiKey");

export async function getPaidBusinessWorkspace(section: WorkspaceSection): Promise<WorkspaceResponse> { return (await getWorkspaceCall({ section })).data; }
export async function savePaidBusinessWorkspace(section: "seller" | "marketplace" | "business" | "branding", payload: Record<string, unknown>) { return (await saveWorkspaceCall({ section, payload })).data; }
export async function upsertPaidTeamMember(payload: Record<string, unknown>) { return (await upsertTeamCall({ payload })).data; }
export async function removePaidTeamMember(id: string) { return (await removeTeamCall({ id })).data; }
export async function upsertPaidAutomation(payload: Record<string, unknown>) { return (await upsertAutomationCall({ payload })).data; }
export async function removePaidAutomation(id: string) { return (await removeAutomationCall({ id })).data; }
export async function createPaidApiKey(name: string) { return (await createApiKeyCall({ name })).data; }
export async function revokePaidApiKey(id: string) { return (await revokeApiKeyCall({ id })).data; }
