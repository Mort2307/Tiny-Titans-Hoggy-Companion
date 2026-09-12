import type { TesterResult, TesterRun } from "./testerBotService";

export type QaDiagnosisSeverity = "critical" | "high" | "medium";

export type QaDiagnosisItem = {
  severity: QaDiagnosisSeverity;
  title: string;
  summary: string;
  impact: string;
  action: string;
};

export type QaBlockedReason = {
  label: string;
  count: number;
  meaning: string;
};

export type QaNarrative = {
  verdict: "PASSED" | "ATTENTION REQUIRED" | "INCOMPLETE" | "CRITICAL FAILURE";
  headline: string;
  diagnosis: QaDiagnosisItem[];
  blockedReasons: QaBlockedReason[];
  verified: string[];
  nextPriority: string;
};

function hasText(result: TesterResult, pattern: RegExp): boolean {
  return pattern.test(`${result.checkId} ${result.name} ${result.message}`);
}

function diagnoseFailure(result: TesterResult): QaDiagnosisItem {
  const context = `${result.checkId} ${result.name} ${result.message}`.toLowerCase();

  if (context.includes("notifications-event-records-readable") || /invalid event identity\/type/i.test(result.message)) {
    return {
      severity: "high",
      title: "Notification event schema mismatch",
      summary: result.message,
      impact: "Notification history and de-duplication cannot safely rely on the affected event records until their identity/type fields match the current contract.",
      action: "Inspect the affected records, migrate or quarantine malformed historical entries, and validate event identity/type on every new write.",
    };
  }

  if (context.includes("creator-global-stats-reconcile") || /creator metric reconciliation mismatch/i.test(result.message)) {
    return {
      severity: "critical",
      title: "Creator statistics do not reconcile with canonical tracker data",
      summary: result.message,
      impact: "Creator dashboards can report incomplete totals even though the underlying Firebase tracker records are readable and other Creator invariants pass.",
      action: "Trace the aggregation filters and consent/inclusion rules. Make Creator statistics consume the same canonical dataset contract as the reconciliation check, then rerun the comparison.",
    };
  }

  if (context.includes("family-permission-model") || /missing or insufficient permissions/i.test(result.message)) {
    return {
      severity: "critical",
      title: "Family permission matrix is incomplete",
      summary: result.message,
      impact: "A family member may not have an explicit Allow, Deny or Verify decision for every supported data-area/action combination.",
      action: "Diff the live permission matrix against the canonical permission contract and restore every required decision rather than adding arbitrary fallback permissions.",
    };
  }

  if (context.includes("family-default-permission-contract") || /permission defaults are incomplete/i.test(result.message)) {
    return {
      severity: "high",
      title: "Family default permission policies are out of contract",
      summary: result.message,
      impact: "New child/adult members may receive stale or retired permission keys, which can cause inconsistent sharing behaviour.",
      action: "Reconcile the default policies against the current canonical key set, remove stale/duplicate entries, and add a schema/count assertion to prevent drift.",
    };
  }

  if (context.includes("family-invite-records-readable") || /invalid owner, family, email or status/i.test(result.message)) {
    return {
      severity: "high",
      title: "Family invitation records contain invalid fields",
      summary: result.message,
      impact: "Invitation state cannot be trusted for the affected records, creating risk around family binding, recipient identity and acceptance handling.",
      action: "Identify the malformed historical invitations, quarantine or migrate them safely, and enforce owner/family/email/status validation when invitations are created or updated.",
    };
  }

  return {
    severity: result.severity === "critical" ? "critical" : result.severity === "high" ? "high" : "medium",
    title: result.name,
    summary: result.message,
    impact: "This check did not meet its expected contract and requires investigation before the corresponding feature can be considered fully healthy.",
    action: "Inspect the failing check and its underlying data or runtime path, correct the root cause, and rerun the affected suite.",
  };
}

function buildBlockedReasons(blocked: TesterResult[]): QaBlockedReason[] {
  const noControls = blocked.filter((result) => /no safe actionable controls were found/i.test(result.message)).length;
  const dynamicFixture = blocked.filter((result) => /requires a runtime entity fixture/i.test(result.message)).length;
  const crossAccountRunner = blocked.filter((result) => /multi-identity journey runner is not yet wired|cross-account/i.test(result.message)).length;
  const other = blocked.length - noControls - dynamicFixture - crossAccountRunner;

  const reasons: QaBlockedReason[] = [];
  if (noControls) reasons.push({ label: "Browser runner could not establish safe controls", count: noControls, meaning: "These are not application failures; the runner did not obtain actionable UI evidence." });
  if (dynamicFixture) reasons.push({ label: "Dynamic route needs a real runtime fixture", count: dynamicFixture, meaning: "The BOT deliberately refuses to invent entity IDs, so the route remains unexecuted." });
  if (crossAccountRunner) reasons.push({ label: "Multi-identity journey runner is not wired", count: crossAccountRunner, meaning: "Owner → member → acceptance → shared-data permission flow has not yet been exercised end-to-end." });
  if (other) reasons.push({ label: "Other blocked checks", count: other, meaning: "A blocked state means the check could not establish valid evidence; it is not treated as a pass." });
  return reasons;
}

function buildVerified(results: TesterResult[]): string[] {
  const verified: string[] = [];
  const checks = [
    { pattern: /firebase-user-scope|tracker-cross-device-persistence/i, label: "Firebase user scope and cross-device persistence" },
    { pattern: /auth-current-user|auth-token-refresh/i, label: "Authentication and ID-token refresh" },
    { pattern: /notifications-live-bot-probe|notifications-live-event-record/i, label: "Live notification delivery and event persistence" },
    { pattern: /morph-library-ids-unique|morph-gene-classification|morph-verification-values/i, label: "Morph library identifiers and classifications" },
    { pattern: /tracker-feeding-count|tracker-shed-count|tracker-shed-length|tracker-shed-date-integrity/i, label: "Feeding and shedding tracker integrity" },
    { pattern: /creator-statistics-invariants|creator-submissions-readable|creator-approved-morphs-readable/i, label: "Creator data invariants and submission access" },
    { pattern: /family-membership-integrity|family-capacity|family-role-integrity|family-sandbox-isolation/i, label: "Family membership, roles, capacity and sandbox isolation" },
    { pattern: /app-route-inventory-complete|app-core-surfaces-covered|app-learning-surfaces-covered|app-creator-surfaces-covered/i, label: "Application route and surface inventory coverage" },
  ];

  for (const check of checks) {
    if (results.some((result) => result.status === "pass" && hasText(result, check.pattern))) verified.push(check.label);
  }
  return verified;
}

export function buildQaNarrative(run: TesterRun): QaNarrative {
  const results = run.results ?? [];
  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.filter((result) => result.status === "fail");
  const blocked = results.filter((result) => result.status === "blocked");
  const notTested = results.filter((result) => result.status === "not-tested").length;
  const criticalFailures = failed.filter((result) => result.severity === "critical").length;

  const verdict = criticalFailures > 0
    ? "CRITICAL FAILURE"
    : failed.length > 0
      ? "ATTENTION REQUIRED"
      : blocked.length > 0 || notTested > 0
        ? "INCOMPLETE"
        : "PASSED";

  const headline = failed.length > 0
    ? `${failed.length} genuine failure${failed.length === 1 ? "" : "s"} require attention; ${blocked.length} other checks are blocked by evidence/test-runner limitations.`
    : blocked.length > 0
      ? `${passed} checks passed, but ${blocked.length} checks remain blocked because the BOT could not establish runtime evidence.`
      : `${passed} checks passed with no failures.`;

  const diagnosis = failed.map(diagnoseFailure);
  const verified = buildVerified(results);
  const blockedReasons = buildBlockedReasons(blocked);

  const nextPriority = diagnosis.length
    ? `Fix the highest-impact failure first: ${diagnosis[0].title}. Then rerun the affected suite before treating the overall BOT run as clean.`
    : blocked.length
      ? "Improve browser/runtime fixture coverage so blocked checks become executable evidence rather than remaining unknowns."
      : "No immediate remediation is indicated by this run.";

  return { verdict, headline, diagnosis, blockedReasons, verified, nextPriority };
}

export function formatQaNarrative(run: TesterRun): string {
  const narrative = buildQaNarrative(run);
  const results = run.results ?? [];
  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.filter((result) => result.status === "fail").length;
  const blocked = results.filter((result) => result.status === "blocked").length;
  const notTested = results.filter((result) => result.status === "not-tested").length;
  const tested = passed + failed;
  const coverage = results.length ? Math.round((tested / results.length) * 100) : 0;
  const passRate = tested ? Math.round((passed / tested) * 100) : 0;

  return [
    "BOT DIAGNOSIS",
    "------------",
    `VERDICT: ${narrative.verdict}`,
    `PASS: ${passed} · FAIL: ${failed} · BLOCKED: ${blocked} · NOT TESTED: ${notTested}`,
    `COVERAGE: ${coverage}% · EFFECTIVE PASS RATE: ${passRate}%`,
    "",
    "WHAT IS ACTUALLY GOING ON",
    narrative.headline,
    "",
    ...(narrative.diagnosis.length
      ? ["REAL FAILURES", ...narrative.diagnosis.flatMap((item, index) => [
        `${index + 1}. ${item.title} [${item.severity.toUpperCase()}]`,
        `   Summary: ${item.summary}`,
        `   Impact: ${item.impact}`,
        `   Action: ${item.action}`,
      ]), ""]
      : []),
    ...(narrative.blockedReasons.length
      ? ["BLOCKED TEST INFRASTRUCTURE", ...narrative.blockedReasons.flatMap((reason) => [
        `• ${reason.label}: ${reason.count}`,
        `  ${reason.meaning}`,
      ]), "  Blocked checks are not failures and never count as passes.", ""]
      : []),
    ...(narrative.verified.length ? ["VERIFIED HEALTH", ...narrative.verified.map((item) => `• ${item}`), ""] : []),
    `NEXT PRIORITY: ${narrative.nextPriority}`,
  ].join("\n");
}
