import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";
import type { FamilyApproval, FamilyHistoryEvent } from "./familyPermissionsService";

export async function getFamilyApprovalsSecure(): Promise<FamilyApproval[]> {
  const callable = httpsCallable<void, { approvals: FamilyApproval[] }>(functions(), "getFamilyApprovalsSecure");
  return (await callable()).data.approvals ?? [];
}

export async function decideFamilyApprovalSecure(approvalId: string, status: "approved" | "rejected"): Promise<void> {
  const callable = httpsCallable<{ approvalId: string; status: "approved" | "rejected" }, { success: boolean }>(functions(), "decideFamilyApprovalSecure");
  await callable({ approvalId, status });
}

export async function getFamilyHistorySecure(): Promise<FamilyHistoryEvent[]> {
  const callable = httpsCallable<void, { events: FamilyHistoryEvent[] }>(functions(), "getFamilyHistorySecure");
  return (await callable()).data.events ?? [];
}
