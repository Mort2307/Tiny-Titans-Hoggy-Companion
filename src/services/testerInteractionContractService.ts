export type TesterInteractionKind =
  | "route"
  | "control"
  | "input"
  | "submit"
  | "persistence"
  | "integration"
  | "destination";

export type TesterInteractionContract = {
  id: string;
  label: string;
  kind: TesterInteractionKind;
  route: string;
  required: boolean;
  expected?: string;
  nextRoute?: string;
};

export type TesterInteractionEvidence = TesterInteractionContract & {
  status: "PASS" | "FAIL" | "BLOCKED" | "NOT_TESTED";
  actual?: string;
  error?: string;
  durationMs?: number;
};

export function createInteractionContract(
  contract: TesterInteractionContract,
): TesterInteractionContract {
  if (!contract.id.trim() || !contract.label.trim() || !contract.route.trim()) {
    throw new Error("Invalid tester interaction contract: id, label and route are required.");
  }

  if (contract.kind === "destination" && !contract.nextRoute) {
    throw new Error("Destination contracts require an expected next route.");
  }

  return { ...contract };
}

export function summariseInteractionEvidence(
  evidence: TesterInteractionEvidence[],
): { passed: number; failed: number; blocked: number; notTested: number; requiredFailures: number } {
  return evidence.reduce(
    (summary, item) => {
      if (item.status === "PASS") summary.passed += 1;
      if (item.status === "FAIL") summary.failed += 1;
      if (item.status === "BLOCKED") summary.blocked += 1;
      if (item.status === "NOT_TESTED") summary.notTested += 1;
      if (item.required && item.status === "FAIL") summary.requiredFailures += 1;
      return summary;
    },
    { passed: 0, failed: 0, blocked: 0, notTested: 0, requiredFailures: 0 },
  );
}
