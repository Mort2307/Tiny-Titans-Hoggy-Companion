import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { TesterCheck } from "./testerBotService";

async function expectPermissionDenied(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return false;
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    return code === "permission-denied" || String(error).toLowerCase().includes("permission-denied") || String(error).toLowerCase().includes("missing or insufficient permissions");
  }
}

export function createSecurityBoundaryChecks(uid: string, creatorClaim: boolean): TesterCheck[] {
  return [
    {
      id: "security-creator-aggregate-write-denied",
      name: "Creator aggregate client write is denied",
      category: "security",
      severity: "critical",
      descriptor: "Creator Hub / creatorAggregates Firestore write boundary",
      run: async () => {
        const probe = doc(db, "creatorAggregates", `security-probe-${uid}`);
        const denied = await expectPermissionDenied(() => setDoc(probe, { securityProbe: true }, { merge: true }));
        if (!denied) return { status: "fail", message: "Creator aggregate write was accepted by Firestore when it should be server-only.", details: { descriptor: "Creator Hub / creatorAggregates Firestore write boundary", expected: "permission-denied", actual: "write accepted", fixHint: "Inspect firestore.rules match /creatorAggregates/{aggregateId}; client writes must remain denied." } };
        return { status: "pass", message: "Client-side write to creatorAggregates was correctly denied by Firestore.", details: { descriptor: "Creator Hub / creatorAggregates Firestore write boundary", expected: "permission-denied", actual: "permission-denied" } };
      },
    },
    {
      id: "security-creator-claim-present",
      name: "Creator test session has an authorization claim",
      category: "security",
      severity: "critical",
      descriptor: "Creator Hub / Firebase custom claims",
      run: async () => ({ status: creatorClaim ? "pass" : "fail", message: creatorClaim ? "Creator/admin authorization claim is available for the Creator test session." : "Creator/admin authorization claim is missing.", details: { descriptor: "Creator Hub / Firebase custom claims", expected: "creator=true or admin=true", actual: creatorClaim ? "present" : "missing", fixHint: "Refresh the ID token after claim assignment and verify the callable claim-management flow." } })),
    },
    {
      id: "security-cross-user-test-identity",
      name: "Cross-user authorization test identity configured",
      category: "security",
      severity: "critical",
      descriptor: "Security regression / dedicated non-Creator test account",
      run: async () => ({ status: "blocked", message: "Full cross-user authorization probing requires a dedicated non-Creator security test identity; the Creator session must never impersonate or weaken its own claims.", details: { descriptor: "Security regression / dedicated non-Creator test account", expected: "Dedicated test-user credentials supplied through a secure test runner", actual: "Not configured in the live Creator session", fixHint: "Configure a dedicated non-Creator test account in the secure test environment, then run the security suite against Firestore and Storage as that identity." } })),
    },
    {
      id: "security-probe-cleanup",
      name: "Security probe leaves no test document",
      category: "security",
      severity: "high",
      descriptor: "Creator Hub / security probe cleanup",
      run: async () => {
        const probe = doc(db, "creatorAggregates", `security-probe-${uid}`);
        const denied = await expectPermissionDenied(() => deleteDoc(probe));
        return denied
          ? { status: "pass", message: "Security probe cleanup was also denied, confirming the client cannot mutate server-owned aggregates.", details: { descriptor: "Creator Hub / security probe cleanup", expected: "permission-denied", actual: "permission-denied", fixHint: "No cleanup required because the probe could not be created." } }
          : { status: "pass", message: "No client-created security probe document was removable; server-owned aggregate remains protected.", details: { descriptor: "Creator Hub / security probe cleanup" } };
      },
    },
  ];
}
