export type OverhaulFindingSeverity = "info" | "warning" | "error" | "critical";
export type OverhaulFindingStatus = "observed" | "reproduced" | "blocked" | "fixed";

export type OverhaulFinding = {
  id: string;
  title: string;
  severity: OverhaulFindingSeverity;
  status: OverhaulFindingStatus;
  source: "manual" | "reported" | "observed";
  evidence: string[];
  affectedRoutes: string[];
  likelyRootCause?: string;
};

export type OverhaulFixPlan = {
  findingId: string;
  objective: string;
  constraints: string[];
  verificationSteps: string[];
  mutationMode: "review-required" | "sandbox";
};

/**
 * Evidence-first development planning for Creator workflows.
 *
 * This service does not edit application files. It turns confirmed human tester reports into reviewable fix plans.
 */
export function buildOverhaulFixPlan(finding: OverhaulFinding): OverhaulFixPlan {
  if (!finding.id || finding.status === "blocked") {
    throw new Error("A non-blocked finding with an evidence identifier is required.");
  }

  return {
    findingId: finding.id,
    objective: `Resolve the root cause of: ${finding.title}`,
    constraints: [
      "Preserve existing user data and public behaviour unless the finding requires a deliberate change.",
      "Do not create duplicate routes, components, services or parallel implementations.",
      "Prefer the existing canonical data and intelligence architecture.",
      "Do not treat an untested assumption as evidence.",
    ],
    verificationSteps: [
      "Reproduce the finding before changing code when safely possible.",
      "Implement the smallest root-cause fix in the existing architecture.",
      "Ask an in-app tester to repeat the affected journey and attach evidence.",
      "Run relevant regression checks.",
      "Confirm no new route, persistence, intelligence or security regressions.",
    ],
    mutationMode: "review-required",
  };
}
