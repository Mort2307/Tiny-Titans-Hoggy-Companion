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

function blockedIdentityCheck(id: string, name: string, descriptor: string, scope: string): TesterCheck {
  return {
    id,
    name,
    category: "security",
    severity: "critical",
    descriptor,
    run: async () => ({
      status: "blocked",
      message: `This ${scope} attack test requires a dedicated non-Creator security identity and cannot be safely executed from the Creator session.`,
      details: {
        descriptor,
        expected: "Dedicated non-Creator security identity performs the unauthorized operation",
        actual: "No dedicated security identity is configured",
        fixHint: "Configure a server-side security test runner with isolated Normal User/Moderator/Creator/Admin identities. Never store test-account passwords in the client bundle.",
      },
    }),
  };
}

export function createSecurityBoundaryChecks(uid: string, creatorClaim: boolean): TesterCheck[] {
  const probeId = `security-probe-${uid}`;
  return [
    {
      id: "security-creator-aggregate-write-denied",
      name: "Creator aggregate client write is denied",
      category: "security",
      severity: "critical",
      descriptor: "Creator Hub / creatorAggregates Firestore write boundary",
      run: async () => {
        const probe = doc(db, "creatorAggregates", probeId);
        const denied = await expectPermissionDenied(() => setDoc(probe, { securityProbe: true }, { merge: true }));
        return denied
          ? { status: "pass", message: "Client-side write to creatorAggregates was correctly denied by Firestore.", details: { descriptor: "Creator Hub / creatorAggregates Firestore write boundary", expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Creator aggregate write was accepted by Firestore when it should be server-only.", details: { descriptor: "Creator Hub / creatorAggregates Firestore write boundary", expected: "permission-denied", actual: "write accepted", fixHint: "Inspect firestore.rules match /creatorAggregates/{aggregateId}; client writes must remain denied." } };
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
      id: "security-tester-run-owner-spoof-denied",
      name: "Tester run owner UID spoof is denied",
      category: "security",
      severity: "critical",
      descriptor: "Tester Centre / testerRuns ownerUid write boundary",
      run: async () => {
        const probe = doc(db, "testerRuns", `security-owner-spoof-${uid}`);
        const denied = await expectPermissionDenied(() => setDoc(probe, { ownerUid: "not-the-authenticated-user", suite: "security-probe" }));
        return denied
          ? { status: "pass", message: "A Creator session cannot create a tester run claiming another user's ownerUid.", details: { descriptor: "Tester Centre / testerRuns ownerUid write boundary", expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Tester run ownerUid spoof was accepted.", details: { descriptor: "Tester Centre / testerRuns ownerUid write boundary", expected: "permission-denied", actual: "write accepted", fixHint: "Inspect firestore.rules match /testerRuns/{runId}; create must require request.resource.data.ownerUid == request.auth.uid." } };
      },
    },
    {
      id: "security-founder-application-owner-spoof-denied",
      name: "Founder application UID spoof is denied",
      category: "security",
      severity: "critical",
      descriptor: "Founder application / applicant UID ownership boundary",
      run: async () => {
        const probe = doc(db, "founderApplications", `security-founder-spoof-${uid}`);
        const denied = await expectPermissionDenied(() => setDoc(probe, { uid: "not-the-authenticated-user", status: "pending", securityProbe: true }));
        return denied
          ? { status: "pass", message: "Founder applications cannot be created on behalf of another UID.", details: { descriptor: "Founder application / applicant UID ownership boundary", expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Founder application UID spoof was accepted.", details: { descriptor: "Founder application / applicant UID ownership boundary", expected: "permission-denied", actual: "write accepted", fixHint: "Inspect firestore.rules match /founderApplications/{applicationId}; create must require request.resource.data.uid == request.auth.uid." } };
      },
    },
    {
      id: "security-morph-submission-owner-spoof-denied",
      name: "Morph image submission owner UID spoof is denied",
      category: "security",
      severity: "critical",
      descriptor: "Morph image submissions / submitter UID ownership boundary",
      run: async () => {
        const probe = doc(db, "morphImageSubmissions", `security-morph-spoof-${uid}`);
        const denied = await expectPermissionDenied(() => setDoc(probe, { userId: "not-the-authenticated-user", status: "pending", securityProbe: true }));
        return denied
          ? { status: "pass", message: "Morph image submissions cannot be created on behalf of another UID.", details: { descriptor: "Morph image submissions / submitter UID ownership boundary", expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Morph image submission UID spoof was accepted.", details: { descriptor: "Morph image submissions / submitter UID ownership boundary", expected: "permission-denied", actual: "write accepted", fixHint: "Inspect firestore.rules match /morphImageSubmissions/{submissionId}; create must require request.resource.data.userId == request.auth.uid." } };
      },
    },
    blockedIdentityCheck("security-firestore-cross-user", "Cross-user Firestore access test", "Security regression / Firestore ownership boundary", "Firestore"),
    blockedIdentityCheck("security-storage-cross-user", "Cross-user Storage access test", "Security regression / Firebase Storage ownership boundary", "Storage"),
    blockedIdentityCheck("security-role-matrix", "Role permission matrix test", "Security regression / Normal User vs Moderator vs Creator vs Admin", "role-matrix"),
    {
      id: "security-probe-cleanup",
      name: "Security probes leave no test document",
      category: "security",
      severity: "critical",
      descriptor: "Creator Hub / security probe cleanup",
      run: async () => {
        const probe = doc(db, "creatorAggregates", probeId);
        const denied = await expectPermissionDenied(() => deleteDoc(probe));
        if (denied) return { status: "pass", message: "Client-side cleanup of the server-owned aggregate was correctly denied.", details: { descriptor: "Creator Hub / security probe cleanup", expected: "permission-denied", actual: "permission-denied" } };
        return { status: "fail", message: "Client-side deletion of a protected creator aggregate was accepted.", details: { descriptor: "Creator Hub / security probe cleanup", expected: "permission-denied", actual: "delete accepted", fixHint: "Inspect firestore.rules match /creatorAggregates/{aggregateId}; all client writes and deletes must remain denied." } };
      },
    },
  ];
}
