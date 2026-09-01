import { getFunctions, httpsCallable } from "firebase/functions";

export type FamilyJoinRequest = {
  id: string;
  familyId: string;
  ownerUid: string;
  requesterUid: string;
  requesterDisplayName: string;
  requesterEmail: string;
  requesterRole: "adult" | "child" | string;
  status: "pending" | "approved" | "rejected" | string;
  createdAt?: unknown;
};

type GeneratedJoinCode = { code: string; expiresAt: string; familyId: string };
type CurrentJoinCode = { code: string; expiresAt: string };
type JoinResult = { requestId: string; familyId: string; status: string; familyOwnerUid?: string };

function functions() { return getFunctions(undefined, "europe-west2"); }

export async function getFamilyJoinCode(): Promise<CurrentJoinCode> {
  const callable = httpsCallable<void, CurrentJoinCode>(functions(), "getFamilyJoinCode");
  return (await callable()).data;
}
export async function generateFamilyJoinCode(): Promise<GeneratedJoinCode> { const callable = httpsCallable<void, GeneratedJoinCode>(functions(), "generateFamilyJoinCode"); return (await callable()).data; }
export async function revokeFamilyJoinCode(): Promise<void> { const callable = httpsCallable<void, { success: boolean }>(functions(), "revokeFamilyJoinCode"); await callable(); }
export async function requestFamilyJoinByCode(code: string): Promise<JoinResult> { const callable = httpsCallable<{ code: string }, JoinResult>(functions(), "requestFamilyJoinByCode"); return (await callable({ code })).data; }
export async function getFamilyJoinRequests(): Promise<FamilyJoinRequest[]> { const callable = httpsCallable<void, { requests: FamilyJoinRequest[] }>(functions(), "getFamilyJoinRequests"); return (await callable()).data.requests ?? []; }
export async function decideFamilyJoinRequest(requestId: string, decision: "approved" | "rejected"): Promise<{ status: string; requesterUid: string }> { const callable = httpsCallable<{ requestId: string; decision: "approved" | "rejected" }, { status: string; requesterUid: string }>(functions(), "decideFamilyJoinRequest"); return (await callable({ requestId, decision })).data; }
