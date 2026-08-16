import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase/config";

export type TesterStatus = "pass" | "fail" | "blocked";
export type TesterSeverity = "info" | "low" | "medium" | "high" | "critical";
export type TesterCategory =
  | "auth"
  | "account"
  | "firebase"
  | "snakes"
  | "weights"
  | "feeding"
  | "sheds"
  | "genetics"
  | "morphs"
  | "community"
  | "mobile"
  | "creator";

export type TesterCheck = {
  checkId: string;
  name: string;
  category: TesterCategory;
  severity: TesterSeverity;
  run: () => Promise<{ status: TesterStatus; message: string }>;
};

export type TesterResult = {
  checkId: string;
  name: string;
  suite: string;
  category: TesterCategory;
  status: TesterStatus;
  severity: TesterSeverity;
  message: string;
  durationMs: number;
  timestamp: string;
};

export type TesterRun = {
  id: string;
  ownerUid: string;
  suite: string;
  status: "passed" | "failed" | "blocked";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  results: TesterResult[];
};

function makeRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getResultStatus(results: TesterResult[]): TesterRun["status"] {
  if (results.some((result) => result.status === "fail")) return "failed";
  if (results.some((result) => result.status === "blocked")) return "blocked";
  return "passed";
}

async function persistTesterRun(uid: string, run: TesterRun): Promise<void> {
  if (!uid) throw new Error("Tester run cannot be persisted without an owner UID.");

  const runRef = doc(collection(db, "users", uid, "testerRuns"), run.id);
  await setDoc(runRef, {
    ...run,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: serverTimestamp(),
    resultCount: run.results.length,
    passedCount: run.results.filter((result) => result.status === "pass").length,
    failedCount: run.results.filter((result) => result.status === "fail").length,
    blockedCount: run.results.filter((result) => result.status === "blocked").length,
  });
}

export function createCoreDiagnosticChecks(input: {
  uid: string;
  authenticated: boolean;
  creatorClaim: boolean;
  analyticsConsent?: boolean;
}): TesterCheck[] {
  const { uid, authenticated, creatorClaim } = input;

  return [
    {
      checkId: "auth-current-user",
      name: "Authenticated user is available",
      category: "auth",
      severity: "critical",
      run: async () => {
        const currentUser = auth.currentUser;
        if (!authenticated || !currentUser) return { status: "fail", message: "Firebase Auth does not report an authenticated user." };
        if (currentUser.uid !== uid) return { status: "fail", message: "Authenticated UID does not match the tester owner UID." };
        return { status: "pass", message: "Authenticated user and tester UID match." };
      },
    },
    {
      checkId: "auth-creator-claim",
      name: "Creator authorization claim is present",
      category: "creator",
      severity: "critical",
      run: async () => creatorClaim
        ? { status: "pass", message: "Creator/admin authorization claim is active." }
        : { status: "fail", message: "Creator/admin authorization claim is missing." },
    },
    {
      checkId: "auth-token-refresh",
      name: "Firebase ID token can be refreshed",
      category: "auth",
      severity: "high",
      run: async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return { status: "blocked", message: "No authenticated Firebase user is available." };
        try {
          const token = await getIdTokenResult(currentUser, true);
          return token.token ? { status: "pass", message: "A fresh Firebase ID token was obtained." } : { status: "fail", message: "Firebase returned an empty ID token." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Unable to refresh Firebase ID token." };
        }
      },
    },
    {
      checkId: "account-profile-readable",
      name: "Current account profile is readable",
      category: "account",
      severity: "high",
      run: async () => {
        try {
          const snapshot = await getDoc(doc(db, "users", uid));
          if (!snapshot.exists()) return { status: "fail", message: "The authenticated user's Firestore profile document does not exist." };
          const data = snapshot.data() as Record<string, unknown>;
          if (data.setupComplete !== true) return { status: "blocked", message: "The account profile exists but setupComplete is not true." };
          return { status: "pass", message: "Account profile exists and setup is complete." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "Unable to read the account profile." };
        }
      },
    },
    {
      checkId: "firebase-user-scope",
      name: "User-scoped Firestore access works",
      category: "firebase",
      severity: "critical",
      run: async () => {
        try {
          await getDoc(doc(db, "users", uid));
          return { status: "pass", message: "The tester can read its own Firebase user scope." };
        } catch (error) {
          return { status: "fail", message: error instanceof Error ? error.message : "User-scoped Firestore access failed." };
        }
      },
    },
  ];
}

export async function runTesterSuite(uid: string, suite: string, checks: TesterCheck[]): Promise<TesterRun> {
  if (!uid) throw new Error("Tester Bot requires an authenticated UID.");
  if (!checks.length) throw new Error(`Tester suite '${suite}' contains no checks.`);

  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const results: TesterResult[] = [];

  for (const check of checks) {
    const checkStarted = Date.now();
    let outcome: { status: TesterStatus; message: string };
    try {
      outcome = await check.run();
    } catch (error) {
      outcome = {
        status: "fail",
        message: error instanceof Error ? error.message : "Tester check threw an unknown error.",
      };
    }

    results.push({
      checkId: check.checkId,
      name: check.name,
      suite,
      category: check.category,
      status: outcome.status,
      severity: check.severity,
      message: outcome.message,
      durationMs: Date.now() - checkStarted,
      timestamp: new Date().toISOString(),
    });
  }

  const completedAt = new Date().toISOString();
  const run: TesterRun = {
    id: makeRunId(),
    ownerUid: uid,
    suite,
    status: getResultStatus(results),
    startedAt,
    completedAt,
    durationMs: Date.now() - started,
    results,
  };

  await persistTesterRun(uid, run);
  return run;
}
