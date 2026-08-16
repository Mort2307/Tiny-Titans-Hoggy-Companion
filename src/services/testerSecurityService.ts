import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { TesterCheck } from "./testerBotService";

async function expectPermissionDenied(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return false;
  } catch (error) {
    const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    const text = String(error).toLowerCase();
    return code === "permission-denied" || text.includes("permission-denied") || text.includes("missing or insufficient permissions");
  }
}

function blockedIdentityCheck(id: string, name: string, descriptor: string, scope: string): TesterCheck {
  return {
    id, name, category: "security", severity: "critical", descriptor,
    run: async () => ({
      status: "blocked",
      message: `This ${scope} attack test requires a dedicated non-Creator security identity and cannot be safely executed from the Creator session.`,
      details: {
        descriptor,
        expected: "Dedicated non-Creator security identity performs the unauthorized operation",
        actual: "No dedicated security identity is configured",
        fixHint: "Use the server-side security runner with isolated test identities; never store test-account passwords in the client bundle.",
      },
    }),
  };
}

export function createSecurityBoundaryChecks(uid: string, creatorClaim: boolean): TesterCheck[] {
  const probeId = `security-probe-${uid}`;
  const aggregateDescriptor = "Creator Hub / creatorAggregates Firestore write boundary";
  const privilegeDescriptor = "Authentication / users/{uid} privilege escalation boundary";
  const testerDescriptor = "Tester Centre / testerRuns ownerUid write boundary";
  const founderDescriptor = "Founder application / applicant UID ownership boundary";
  const morphDescriptor = "Morph image submissions / submitter UID ownership boundary";

  const checks: TesterCheck[] = [
    {
      id: "security-creator-aggregate-write-denied",
      name: "Creator aggregate client write is denied",
      category: "security", severity: "critical", descriptor: aggregateDescriptor,
      run: async () => {
        const denied = await expectPermissionDenied(() => setDoc(doc(db, "creatorAggregates", probeId), { securityProbe: true }, { merge: true }));
        return denied
          ? { status: "pass", message: "Client-side write to creatorAggregates was correctly denied by Firestore.", details: { descriptor: aggregateDescriptor, expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Creator aggregate write was accepted when it should be server-only.", details: { descriptor: aggregateDescriptor, expected: "permission-denied", actual: "write accepted", fixHint: "Keep client writes denied for /creatorAggregates/{aggregateId}." } };
      },
    },
    {
      id: "security-creator-claim-present",
      name: "Creator test session has an authorization claim",
      category: "security", severity: "critical", descriptor: "Creator Hub / Firebase custom claims",
      run: async () => ({
        status: creatorClaim ? "pass" : "fail",
        message: creatorClaim ? "Creator/admin authorization claim is available." : "Creator/admin authorization claim is missing.",
        details: { descriptor: "Creator Hub / Firebase custom claims", expected: "creator=true or admin=true", actual: creatorClaim ? "present" : "missing", fixHint: "Refresh the ID token after claim assignment and verify the claim-management flow." },
      }),
    },
    {
      id: "security-user-privilege-escalation-denied",
      name: "User cannot self-assign tester privileges",
      category: "security", severity: "critical", descriptor: privilegeDescriptor,
      run: async () => {
        const denied = await expectPermissionDenied(() => setDoc(doc(db, "users", uid), { isTester: true, isSecurityTestUser: true }, { merge: true }));
        return denied
          ? { status: "pass", message: "Client-side tester/security-test privilege escalation was denied.", details: { descriptor: privilegeDescriptor, expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "A client write was accepted that attempted to assign tester/security-test privileges.", details: { descriptor: privilegeDescriptor, expected: "permission-denied", actual: "write accepted", fixHint: "Keep isTester and isSecurityTestUser server-controlled." } };
      },
    },
    {
      id: "security-tester-run-owner-spoof-denied",
      name: "Tester run owner UID spoof is denied",
      category: "security", severity: "critical", descriptor: testerDescriptor,
      run: async () => {
        const denied = await expectPermissionDenied(() => setDoc(doc(db, "testerRuns", `security-owner-spoof-${uid}`), { ownerUid: "not-the-authenticated-user", suite: "security-probe" }));
        return denied
          ? { status: "pass", message: "A Creator session cannot create a tester run claiming another user's ownerUid.", details: { descriptor: testerDescriptor, expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Tester run ownerUid spoof was accepted.", details: { descriptor: testerDescriptor, expected: "permission-denied", actual: "write accepted", fixHint: "Require request.resource.data.ownerUid == request.auth.uid for testerRuns create." } };
      },
    },
    {
      id: "security-founder-application-owner-spoof-denied",
      name: "Founder application UID spoof is denied",
      category: "security", severity: "critical", descriptor: founderDescriptor,
      run: async () => {
        const denied = await expectPermissionDenied(() => setDoc(doc(db, "founderApplications", `security-founder-spoof-${uid}`), { uid: "not-the-authenticated-user", status: "pending", securityProbe: true }));
        return denied
          ? { status: "pass", message: "Founder applications cannot be created on behalf of another UID.", details: { descriptor: founderDescriptor, expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Founder application UID spoof was accepted.", details: { descriptor: founderDescriptor, expected: "permission-denied", actual: "write accepted", fixHint: "Require request.resource.data.uid == request.auth.uid for founderApplications create." } };
      },
    },
    {
      id: "security-morph-submission-owner-spoof-denied",
      name: "Morph image submission owner UID spoof is denied",
      category: "security", severity: "critical", descriptor: morphDescriptor,
      run: async () => {
        const denied = await expectPermissionDenied(() => setDoc(doc(db, "morphImageSubmissions", `security-morph-spoof-${uid}`), { userId: "not-the-authenticated-user", status: "pending", securityProbe: true }));
        return denied
          ? { status: "pass", message: "Morph image submissions cannot be created on behalf of another UID.", details: { descriptor: morphDescriptor, expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Morph image submission UID spoof was accepted.", details: { descriptor: morphDescriptor, expected: "permission-denied", actual: "write accepted", fixHint: "Require request.resource.data.userId == request.auth.uid for morphImageSubmissions create." } };
      },
    },
    blockedIdentityCheck("security-firestore-cross-user", "Cross-user Firestore access test", "Security regression / Firestore ownership boundary", "Firestore"),
    blockedIdentityCheck("security-storage-cross-user", "Cross-user Storage access test", "Security regression / Firebase Storage ownership boundary", "Storage"),
    blockedIdentityCheck("security-role-matrix", "Role permission matrix test", "Security regression / Normal User vs Moderator vs Creator vs Admin", "role-matrix"),
    {
      id: "security-probe-cleanup",
      name: "Security probes leave no test document",
      category: "security", severity: "critical", descriptor: "Creator Hub / security probe cleanup",
      run: async () => {
        const denied = await expectPermissionDenied(() => deleteDoc(doc(db, "creatorAggregates", probeId)));
        return denied
          ? { status: "pass", message: "Client-side deletion of the protected creator aggregate was denied.", details: { descriptor: "Creator Hub / security probe cleanup", expected: "permission-denied", actual: "permission-denied" } }
          : { status: "fail", message: "Client-side deletion of a protected creator aggregate was accepted.", details: { descriptor: "Creator Hub / security probe cleanup", expected: "permission-denied", actual: "delete accepted", fixHint: "Keep all client writes and deletes denied for creatorAggregates." } };
      },
    },
  ];
  return checks;
}
