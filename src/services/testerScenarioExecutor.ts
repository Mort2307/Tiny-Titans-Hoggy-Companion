import {
  deleteSandboxDocument,
  readSandboxDocument,
  writeSandboxDocument,
  type TesterSandboxContext,
} from "./testerSandboxService";
import {
  buildSyntheticKeeperScenario,
  type TesterScenarioStep,
} from "./testerScenarioService";

export type TesterScenarioStatus = "PASS" | "FAIL" | "BLOCKED";

export type TesterScenarioEvidence = {
  stepId: string;
  label: string;
  operation: TesterScenarioStep["operation"];
  status: TesterScenarioStatus;
  durationMs: number;
  expected: string;
  actual: string;
  path: string;
  error?: string;
};

const syntheticSnake = {
  name: "BOT Synthetic Mort",
  species: "Western Hognose",
  syntheticOnly: true,
  createdBy: "tester-bot",
};

const syntheticWeight = {
  grams: 100,
  syntheticOnly: true,
  createdBy: "tester-bot",
};

const syntheticFeeding = {
  response: "accepted",
  preyType: "mouse",
  preySize: "pinkie",
  syntheticOnly: true,
  createdBy: "tester-bot",
};

async function executeStep(
  context: TesterSandboxContext,
  step: TesterScenarioStep,
): Promise<TesterScenarioEvidence> {
  const started = performance.now();
  try {
    const segments = step.path.split("/").slice(2);
    const payload = step.id === "create-snake" || step.id === "update-snake" || step.id === "verify-update"
      ? syntheticSnake
      : step.id.includes("weight")
        ? syntheticWeight
        : syntheticFeeding;

    if (step.operation === "create" || step.operation === "update") {
      await writeSandboxDocument(context, segments, payload);
      return {
        stepId: step.id,
        label: step.label,
        operation: step.operation,
        status: "PASS",
        durationMs: Math.round(performance.now() - started),
        expected: "Sandbox write succeeds",
        actual: "Sandbox write completed",
        path: step.path,
      };
    }

    if (step.operation === "verify") {
      const value = await readSandboxDocument(context, segments);
      const exists = Boolean(value);
      return {
        stepId: step.id,
        label: step.label,
        operation: step.operation,
        status: exists ? "PASS" : "FAIL",
        durationMs: Math.round(performance.now() - started),
        expected: "Synthetic document exists",
        actual: exists ? "Synthetic document found" : "Synthetic document missing",
        path: step.path,
      };
    }

    await deleteSandboxDocument(context, segments);
    return {
      stepId: step.id,
      label: step.label,
      operation: step.operation,
      status: "PASS",
      durationMs: Math.round(performance.now() - started),
      expected: "Sandbox document is deleted",
      actual: "Sandbox delete completed",
      path: step.path,
    };
  } catch (error) {
    return {
      stepId: step.id,
      label: step.label,
      operation: step.operation,
      status: "FAIL",
      durationMs: Math.round(performance.now() - started),
      expected: "Sandbox operation completes without crossing isolation boundary",
      actual: "Sandbox operation failed",
      path: step.path,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function executeSyntheticKeeperScenario(
  context: TesterSandboxContext,
): Promise<TesterScenarioEvidence[]> {
  const steps = buildSyntheticKeeperScenario(context);
  const results: TesterScenarioEvidence[] = [];

  for (const step of steps) {
    const result = await executeStep(context, step);
    results.push(result);
    if (result.status === "FAIL") break;
  }

  return results;
}
