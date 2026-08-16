import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export type TesterSeverity = "critical" | "high" | "medium" | "low";
export type TesterStatus = "pass" | "fail" | "blocked";
export type TesterCategory = "auth" | "security" | "data" | "feeding" | "weight" | "shed" | "genetics" | "privacy" | "analytics" | "mobile";

export type TesterCheck = {
  id: string;
  name: string;
  category: TesterCategory;
  severity: TesterSeverity;
  descriptor?: string;
  run: () => Promise<{ status: TesterStatus; message: string; details?: Record<string, unknown> }>;
};

export type TesterResult = {
  checkId: string;
  name: string;
  category: TesterCategory;
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

export async function runTesterSuite(ownerUid: string, suite: string, checks: TesterCheck[]): Promise<TesterRun> {
  const started = Date.now();
  const results: TesterResult[] = [];
  for (const check of checks) {
    const checkStarted = Date.now();
    try {
      const outcome = await check.run();
      results.push({ checkId: check.id, name: check.name, category: check.category, severity: check.severity, ...outcome, details: { descriptor: check.descriptor, ...(outcome.details ?? {}) }, durationMs: Date.now() - checkStarted });
    } catch (error) {
      results.push({ checkId: check.id, name: check.name, category: check.category, severity: "critical", status: "fail", message: error instanceof Error ? error.message : "Tester Bot encountered an unexpected error.", details: { descriptor: check.descriptor, fixHint: "Inspect the Firebase/service call used by this check and reproduce the failing operation in the named area." }, durationMs: Date.now() - checkStarted });
    }
  }
  const run: TesterRun = {
    ownerUid,
    suite,
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date().toISOString(),
    status: results.some((result) => result.status === "fail" || result.status === "blocked") ? "failed" : "passed",
    results,
  };
  const saved = await addDoc(collection(db, "testerRuns"), { ...run, createdAt: serverTimestamp() });
  return { ...run, id: saved.id };
}

export function createCoreDiagnosticChecks(context: { uid: string; authenticated: boolean; creatorClaim: boolean; analyticsConsent: boolean }): TesterCheck[] {
  return [
    { id: "auth-authenticated", name: "Authentication state", category: "auth", severity: "critical", descriptor: "Login / authenticated app session", run: async () => ({ status: context.authenticated ? "pass" : "fail", message: context.authenticated ? "Firebase authentication is active." : "No authenticated Firebase user is available.", details: { expected: "Authenticated Firebase user", actual: context.authenticated ? "Authenticated" : "Not authenticated", fixHint: "Inspect AuthContext, Firebase sign-in and auth hydration/navigation." } }) },
    { id: "auth-creator-claim", name: "Creator authorization claim", category: "security", severity: "critical", descriptor: "Creator Hub / authorization", run: async () => ({ status: context.creatorClaim ? "pass" : "fail", message: context.creatorClaim ? "Creator/admin custom claim is present." : "Creator/admin custom claim is missing.", details: { expected: "creator=true or admin=true custom claim", actual: context.creatorClaim ? "Claim present" : "Claim missing", fixHint: "Check Firebase custom-claim assignment, token refresh and Creator security rules." } }) },
    { id: "privacy-analytics-consent", name: "Analytics consent state", category: "privacy", severity: "high", descriptor: "Privacy Settings / analytics consent", run: async () => ({ status: context.analyticsConsent ? "pass" : "blocked", message: context.analyticsConsent ? "Anonymous analytics are permitted for this test user." : "Analytics checks are blocked because consent is disabled.", details: { expected: "Analytics consent enabled for analytics tests", actual: context.analyticsConsent ? "Enabled" : "Disabled", fixHint: "If unexpected, inspect Privacy Settings and consent persistence." } }) },
    { id: "identity-uid", name: "Authenticated UID integrity", category: "security", severity: "critical", descriptor: "Authentication identity / user data boundary", run: async () => ({ status: context.uid.trim().length > 0 ? "pass" : "fail", message: context.uid.trim().length > 0 ? "Authenticated UID is available." : "Authenticated UID is missing.", details: { expected: "Non-empty authenticated UID", actual: context.uid.trim().length > 0 ? "UID present" : "UID missing", fixHint: "Inspect AuthContext and Firebase currentUser propagation." } }) },
    {
      id: "mobile-runtime-basics",
      name: "Mobile/PWA runtime foundation",
      category: "mobile",
      severity: "high",
      descriptor: "App shell / viewport / PWA branding",
      run: async () => {
        const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "";
        const manifest = document.querySelector('link[rel="manifest"]')?.getAttribute("href") ?? "";
        const favicon = document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? "";
        const root = document.getElementById("root");
        const mobileViewport = window.innerWidth <= 768;
        const horizontalOverflow = mobileViewport ? document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 : false;
        const failures: string[] = [];
        if (!viewport.includes("width=device-width")) failures.push("viewport meta is missing width=device-width");
        if (!viewport.includes("viewport-fit=cover")) failures.push("viewport-fit=cover is missing");
        if (!manifest) failures.push("PWA manifest link is missing");
        if (!favicon) failures.push("Tiny Titans favicon link is missing");
        if (!root) failures.push("#root mount element is missing");
        if (horizontalOverflow) failures.push(`mobile horizontal overflow detected (${document.documentElement.scrollWidth}px content vs ${document.documentElement.clientWidth}px viewport)`);
        return failures.length
          ? { status: "fail", message: failures.join("; "), details: { expected: "Mobile-safe viewport, manifest, favicon, root mount and no horizontal overflow", actual: failures, viewport, manifest, favicon, mobileViewport, horizontalOverflow, descriptor: "App shell / viewport / PWA branding", fixHint: "Inspect index.html, PWA metadata and the page/component producing horizontal overflow." } }
          : { status: "pass", message: "Mobile/PWA runtime foundation is present and no horizontal overflow was detected in the current viewport.", details: { viewport, manifest, favicon, mobileViewport, horizontalOverflow, descriptor: "App shell / viewport / PWA branding" } };
      },
    },
  ];
}
