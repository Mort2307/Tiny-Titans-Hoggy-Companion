export type TesterMutationMode = "read-only" | "sandbox";

export type TesterSandboxContext = {
  enabled: boolean;
  sandboxId?: string;
  ownerUid: string;
};

/**
 * Central guard for every future BOT operation that can mutate application state.
 *
 * The BOT system must never silently fall back to a real user's records. A
 * mutation is permitted only when an explicit sandbox context exists and is
 * enabled. This service intentionally does not create or mutate Firestore data
 * itself; it defines the safety boundary that mutation-capable suites must use.
 */
export function assertTesterMutationAllowed(
  mode: TesterMutationMode,
  context: TesterSandboxContext | undefined,
): asserts context is TesterSandboxContext {
  if (mode !== "sandbox") {
    throw new Error("BOT mutation blocked: this test is not declared as sandbox-safe.");
  }

  if (!context?.enabled || !context.sandboxId) {
    throw new Error("BOT mutation blocked: an explicit isolated sandbox context is required.");
  }

  if (!context.ownerUid) {
    throw new Error("BOT mutation blocked: sandbox owner identity is missing.");
  }
}

export function getSandboxDocumentPath(sandboxId: string, ...segments: string[]): string {
  if (!sandboxId || /(^|[./])\.\.?($|[./])/.test(sandboxId) || sandboxId.includes("users/")) {
    throw new Error("Invalid sandbox identifier.");
  }

  const safeSegments = segments.filter(Boolean);
  return ["testerSandboxes", sandboxId, ...safeSegments].join("/");
}
