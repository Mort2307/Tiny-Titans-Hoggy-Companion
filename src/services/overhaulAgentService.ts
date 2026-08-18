import type { TesterSandboxContext } from "./testerSandboxService";
import { assertTesterMutationAllowed } from "./testerSandboxService";

export type OverhaulFindingSeverity = "info" | "warning" | "error" | "critical";
export type OverhaulFindingStatus = "observed" | "reproduced" | "blocked" | "fixed";

export type OverhaulFinding = {
  id: string;
  title: string;
  severity: OverhaulFindingSeverity;
  status: OverhaulFindingStatus;
  source: "creator-bot" | "user-bot" | "app-bot" | "security-bot" | "manual";
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
 * This service intentionally does NOT edit application files. It converts
 * confirmed tester evidence into an explicit, reviewable fix plan. Any future
 * mutation-capable implementation must execute through the tester sandbox and
 * retain the resulting evidence before a production/master change is accepted.
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
      "Run the targeted BOT scenario and capture evidence.",
      "Run relevant regression checks.",
      "Confirm no new route, persistence, intelligence or security regressions.",
    ],
    mutationMode: "review-required",
  };
}

/**
 * Explicitly gates any future automated mutation against the isolated tester
 * sandbox. Production/master mutation is never an implicit fallback.
 */
export function assertAutomatedFixSandbox(context: TesterSandboxContext | undefined): void {
  assertTesterMutationAllowed("sandbox", context);
}
