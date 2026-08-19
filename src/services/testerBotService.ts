import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase/config";

export type TesterStatus = "pass" | "fail" | "blocked" | "not-tested";
export type TesterSeverity = "info" | "low" | "medium" | "high" | "critical";
export type TesterCategory =
  | "auth" | "account" | "firebase" | "snakes" | "weights" | "feeding" | "sheds"
  | "genetics" | "morphs" | "community" | "mobile" | "creator" | "feedback"
  | "notifications" | "application" | "learning" | "trackers" | "breeding"
  | "permissions" | "visual";

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
  botId?: string;
  status: TesterStatus;
  results: TesterResult[];
  startedAt: string;
  completedAt?: string;
};

export type CoreDiagnosticOptions = { uid: string; authenticated: boolean; creatorClaim: boolean };

export async function createCoreDiagnosticChecks(options: CoreDiagnosticOptions): Promise<TesterCheck[]> {
  return [
    { checkId: "auth-current-user", name: "Authenticated user is present", category: "auth", severity: "critical", run: async () => ({ status: options.authenticated && Boolean(auth.currentUser?.uid === options.uid) ? "pass" : "fail", message: options.authenticated && auth.currentUser?.uid === options.uid ? "Authenticated user matches the tester UID." : "The current Firebase user does not match the tester UID." }) },
    { checkId: "auth-token-refresh", name: "Authentication token is readable", category: "auth", severity: "high", run: async () => { if (!auth.currentUser) return { status: "fail", message: "No authenticated Firebase user is available." }; try { const token = await getIdTokenResult(auth.currentUser, true); return token.token ? { status: "pass", message: "Firebase authentication token refreshed successfully." } : { status: "fail", message: "Firebase returned no usable token." }; } catch (error) { return { status: "fail", message: error instanceof Error ? error.message : "Unable to refresh the Firebase token." }; } } },
    { checkId: "auth-creator-claim", name: "Creator tester claim matches expected role", category: "creator", severity: "high", run: async () => ({ status: options.creatorClaim === Boolean((await getIdTokenResult(auth.currentUser!, true)).claims.creator) ? "pass" : "fail", message: options.creatorClaim ? "Creator claim is present." : "Creator claim is not required for this bot." }) },
    { checkId: "tester-run-write-boundary", name: "Tester run records are scoped to the authenticated owner", category: "firebase", severity: "critical", run: async () => ({ status: options.uid ? "pass" : "fail", message: "Tester diagnostics are constructed with an authenticated owner UID." }) },
  ];
}

export async function saveTesterRun(run: TesterRun): Promise<void> {
  if (!run.ownerUid) throw new Error("Tester runs require an authenticated owner UID.");
  await setDoc(doc(collection(db, "testerRuns"), run.id), { ...run, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getTesterRun(uid: string, runId: string): Promise<TesterRun | null> {
  if (!uid || !runId) return null;
  const snapshot = await getDoc(doc(db, "testerRuns", runId));
  if (!snapshot.exists() || snapshot.data().ownerUid !== uid) return null;
  return { ...(snapshot.data() as Omit<TesterRun, "id">), id: snapshot.id };
}