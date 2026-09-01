import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { FamilyApproval, FamilyHistoryEvent } from "./familyPermissionsService";

const familyFunctions = getFunctions(app, "europe-west2");

export async function getFamilyApprovalsSecure(): Promise<FamilyApproval[]> {
  const callable = httpsCallable<void, { approvals: FamilyApproval[] }>(familyFunctions, "getFamilyApprovalsSecure");
  return (await callable()).data.approvals ?? [];
}

export async function decideFamilyApprovalSecure(approvalId: string, status: "approved" | "rejected"): Promise<void> {
  const callable = httpsCallable<{ approvalId: string; status: "approved" | "rejected" }, { success: boolean }>(familyFunctions, "decideFamilyApprovalSecure");
  await callable({ approvalId, status });
}

export async function getFamilyHistorySecure(): Promise<FamilyHistoryEvent[]> {
  const callable = httpsCallable<void, { events: FamilyHistoryEvent[] }>(familyFunctions, "getFamilyHistorySecure");
  return (await callable()).data.events ?? [];
}
