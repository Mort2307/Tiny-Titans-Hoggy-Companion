import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export type TesterSeverity = "critical" | "high" | "medium" | "low";
export type TesterStatus = "pass" | "fail" | "blocked";

export type TesterCheck = {
  id: string;
  name: string;
  category: "auth" | "data" | "feeding" | "weight" | "shed" | "genetics" | "privacy" | "analytics" | "mobile";
  severity: TesterSeverity;
  run: () => Promise<{ status: TesterStatus; message: string; details?: Record<string, unknown> }>;
};

export type TesterResult = {
  checkId: string;
  name: string;
  category: TesterCheck["category"];
  severity: TesterSeverity;
  status: TesterStatus;
  message: string;
  details?: Record<string, unknown>;
  durationMs: number;
};

export type TesterRun = {
  id?: string;
  ownerUid: string;
  suite: string;
  startedAt: unknown;
  finishedAt?: unknown;
  status: "running" | "passed" | "failed";
  results: TesterResult[];
};

export async function runTesterSuite(
  ownerUid: string,
  suite: string,
  checks: TesterCheck[],
): Promise<TesterRun> {
  const started = Date.now();
  const results: TesterResult[] = [];

  for (const check of checks) {
    const checkStarted = Date.now();
    try {
      const outcome = await check.run();
      results.push({
        checkId: check.id,
        name: check.name,
        category: check.category,
        severity: check.severity,
        ...outcome,
        durationMs: Date.now() - checkStarted,
      });
    } catch (error) {
      results.push({
        checkId: check.id,
        name: check.name,
        category: check.category,
        severity: "critical",
        status: "fail",
        message: error instanceof Error ? error.message : "Tester Bot encountered an unexpected error.",
        durationMs: Date.now() - checkStarted,
      });
    }
  }

  const run: TesterRun = {
    ownerUid,
    suite,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date().toISOString(),
    status: results.some((result) => result.status === "fail") ? "failed" : "passed",
    results,
  };

  const saved = await addDoc(collection(db, "testerRuns"), {
    ...run,
    createdAt: serverTimestamp(),
  });

  return { ...run, id: saved.id };
}

export function createCoreDiagnosticChecks(context: {
  uid: string;
  authenticated: boolean;
  creatorClaim: boolean;
  analyticsConsent: boolean;
}): TesterCheck[] {
  return [
    {
      id: "auth-authenticated",
      name: "Authentication state",
      category: "auth",
      severity: "critical",
      run: async () => ({
        status: context.authenticated ? "pass" : "fail",
        message: context.authenticated ? "Firebase authentication is active." : "No authenticated Firebase user is available.",
      }),
    },
    {
      id: "auth-creator-claim",
      name: "Creator authorization claim",
      category: "auth",
      severity: "critical",
      run: async () => ({
        status: context.creatorClaim ? "pass" : "fail",
        message: context.creatorClaim ? "Creator/admin custom claim is present." : "Creator/admin custom claim is missing.",
      }),
    },
    {
      id: "privacy-analytics-consent",
      name: "Analytics consent state",
      category: "privacy",
      severity: "high",
      run: async () => ({
        status: context.analyticsConsent ? "pass" : "blocked",
        message: context.analyticsConsent ? "Anonymous analytics are permitted for this test user." : "Analytics checks are blocked because consent is disabled.",
      }),
    },
    {
      id: "identity-uid",
      name: "Authenticated UID integrity",
      category: "auth",
      severity: "critical",
      run: async () => ({
        status: context.uid.trim().length > 0 ? "pass" : "fail",
        message: context.uid.trim().length > 0 ? "Authenticated UID is available." : "Authenticated UID is missing.",
      }),
    },
  ];
}
