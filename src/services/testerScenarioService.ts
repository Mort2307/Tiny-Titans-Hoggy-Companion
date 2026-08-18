import type { TesterSandboxContext } from "./testerSandboxService";
import { assertTesterMutationAllowed, getSandboxDocumentPath } from "./testerSandboxService";

export type TesterScenarioStep = {
  id: string;
  label: string;
  operation: "create" | "read" | "update" | "delete" | "verify";
  path: string;
};

/**
 * Builds a deterministic synthetic keeper workflow for mutation-capable BOTs.
 * This is deliberately data-only: execution remains in the runner so every
 * step can record evidence and failures independently.
 */
export function buildSyntheticKeeperScenario(context: TesterSandboxContext): TesterScenarioStep[] {
  assertTesterMutationAllowed("sandbox", context);

  const snakePath = getSandboxDocumentPath(context.sandboxId, "snakes", "synthetic-mort");
  const weightPath = getSandboxDocumentPath(context.sandboxId, "snakes", "synthetic-mort", "weights", "weight-001");
  const feedingPath = getSandboxDocumentPath(context.sandboxId, "snakes", "synthetic-mort", "feedings", "feeding-001");
  const timelinePath = getSandboxDocumentPath(context.sandboxId, "snakes", "synthetic-mort", "timeline", "feeding-001");

  return [
    { id: "create-snake", label: "Create synthetic snake", operation: "create", path: snakePath },
    { id: "verify-snake", label: "Verify synthetic snake persisted", operation: "verify", path: snakePath },
    { id: "create-weight", label: "Record synthetic weight", operation: "create", path: weightPath },
    { id: "verify-weight", label: "Verify weight persisted", operation: "verify", path: weightPath },
    { id: "create-feeding", label: "Record synthetic feeding", operation: "create", path: feedingPath },
    { id: "verify-feeding", label: "Verify feeding persisted", operation: "verify", path: feedingPath },
    { id: "verify-timeline", label: "Verify connected timeline event", operation: "verify", path: timelinePath },
    { id: "update-snake", label: "Update synthetic snake", operation: "update", path: snakePath },
    { id: "verify-update", label: "Verify synthetic update", operation: "verify", path: snakePath },
    { id: "delete-feeding", label: "Delete synthetic feeding", operation: "delete", path: feedingPath },
    { id: "delete-weight", label: "Delete synthetic weight", operation: "delete", path: weightPath },
    { id: "delete-snake", label: "Delete synthetic snake", operation: "delete", path: snakePath },
  ];
}
