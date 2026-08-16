import { getFunctions, httpsCallable } from "firebase/functions";
import type { TesterCheck } from "./testerBotService";

const functions = getFunctions(undefined, "europe-west2");

type SecurityAttackResult = {
  id: string;
  expected: number | string;
  actual: number | string;
  status: "pass" | "fail" | "blocked";
  descriptor: string;
};

type SecurityAttackResponse = {
  status: "passed" | "failed" | "blocked";
  reason?: string;
  securityUserUid?: string;
  targetUserUid?: string;
  results?: SecurityAttackResult[];
};

export function createServerSecurityAttackCheck(): TesterCheck {
  return {
    id: "security-server-cross-user-suite",
    name: "Server-side cross-user Firestore and Storage attack suite",
    category: "security",
    severity: "critical",
    descriptor: "Security Tester / dedicated non-Creator identity / Firestore + Storage",
    run: async () => {
      const callable = httpsCallable<Record<string, never>, SecurityAttackResponse>(functions, "runSecurityAttackSuite", { timeout: 120000 });
      const response = await callable({});
      const data = response.data;
      if (data.status === "blocked") {
        return {
          status: "blocked",
          message: data.reason ?? "Server-side security attack suite is blocked.",
          details: {
            expected: "Dedicated security identity and target user available",
            actual: data.reason ?? "Blocked",
            descriptor: "Security Tester / dedicated non-Creator identity / Firestore + Storage",
            fixHint: "Configure the TESTER_SECURITY_EMAIL and TESTER_SECURITY_PASSWORD Firebase secrets for the dedicated Normal User security account.",
          },
        };
      }

      const failed = (data.results ?? []).filter((item) => item.status === "fail");
      const blocked = (data.results ?? []).filter((item) => item.status === "blocked");
      if (failed.length || blocked.length) {
        const first = failed[0] ?? blocked[0];
        return {
          status: failed.length ? "fail" : "blocked",
          message: failed.length ? `${failed.length} server-side security boundary${failed.length === 1 ? "" : "ies"} failed.` : `${blocked.length} server-side security check${blocked.length === 1 ? "" : "s"} could not execute.`,
          details: {
            descriptor: first?.descriptor ?? "Security Tester / server-side attack suite",
            expected: first?.expected ?? "All unauthorized operations denied",
            actual: first?.actual ?? "Unknown",
            impact: failed.length ? "A Firebase authorization boundary did not behave as expected." : "The security suite could not establish a complete result.",
            results: data.results,
            targetUserUid: data.targetUserUid,
            fixHint: "Inspect the named Firestore/Storage rule and rerun Specific Security Test after the fix.",
          },
        };
      }

      return {
        status: "pass",
        message: "Dedicated non-Creator identity was unable to cross user Firestore/Storage boundaries.",
        details: {
          descriptor: "Security Tester / dedicated non-Creator identity / Firestore + Storage",
          results: data.results,
          targetUserUid: data.targetUserUid,
        },
      };
    },
  };
}
