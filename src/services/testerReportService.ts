import type { TesterRun } from "./testerBotService";

const PREFERRED_DETAIL_KEYS = [
  "issueId",
  "descriptor",
  "classification",
  "recordId",
  "databasePath",
  "operation",
  "expected",
  "actual",
  "impact",
  "fixHint",
  "regression",
];

function stringify(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDetails(details?: Record<string, unknown>) {
  if (!details) return "";
  const entries = [
    ...PREFERRED_DETAIL_KEYS.filter((key) => key in details).map((key) => [key, details[key]] as const),
    ...Object.entries(details).filter(([key]) => !PREFERRED_DETAIL_KEYS.includes(key)),
  ];

  return entries
    .map(([key, value]) => `  ${key}: ${stringify(value)}`)
    .join("\n");
}

function severityRank(severity: TesterRun["results"][number]["severity"]) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
}

function classify(result: TesterRun["results"][number]) {
  if (typeof result.details?.classification === "string") return result.details.classification;
  if (result.category === "security") return "security-or-authorization";
  if (result.category === "privacy") return "privacy-or-consent";
  if (result.category === "mobile") return "mobile-or-ui";
  if (result.category === "data") return "data-or-persistence";
  return "feature-or-persistence";
}

function buildMachineReadableIssue(result: TesterRun["results"][number]) {
  return JSON.stringify(
    {
      issueId: result.checkId,
      name: result.name,
      category: result.category,
      severity: result.severity,
      status: result.status,
      classification: classify(result),
      message: result.message,
      durationMs: result.durationMs,
      details: result.details ?? {},
    },
    null,
    2,
  );
}

export function buildTesterReport(run: TesterRun): string {
  const failures = run.results.filter((result) => result.status === "fail").sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const blocked = run.results.filter((result) => result.status === "blocked");
  const critical = failures.filter((result) => result.severity === "critical");
  const high = failures.filter((result) => result.severity === "high");

  if (!failures.length && !blocked.length) {
    return [
      "TINY TITANS HOGGY COMPANION — TESTER BOT",
      "==========================================",
      `Suite: ${run.suite}`,
      `Run ID: ${run.id ?? "unsaved"}`,
      `Started: ${run.startedAt}`,
      `Finished: ${run.finishedAt ?? "unknown"}`,
      "",
      "🟢 NO ISSUES DETECTED",
      "",
      "The completed test suite found no actionable failures or blocked checks.",
      "Nothing requires fixing from this run.",
      "",
      "END OF REPORT",
    ].join("\n");
  }

  const lines = [
    "TINY TITANS HOGGY COMPANION — ACTIONABLE TESTER BOT REPORT",
    "===========================================================",
    `Suite: ${run.suite}`,
    `Run ID: ${run.id ?? "unsaved"}`,
    `Started: ${run.startedAt}`,
    `Finished: ${run.finishedAt ?? "unknown"}`,
    `Overall: ${run.status.toUpperCase()}`,
    "",
    `ISSUES REQUIRING ATTENTION: ${failures.length}`,
    `RELEASE BLOCKERS: ${critical.length} critical | ${high.length} high | ${blocked.length} blocked`,
    "",
  ];

  failures.forEach((result, index) => {
    lines.push(`ISSUE #${index + 1} — ${result.severity.toUpperCase()}`);
    lines.push(`Issue ID: ${result.checkId}`);
    lines.push(`Area: ${result.category}`);
    lines.push(`Test: ${result.name}`);
    lines.push(`Classification: ${classify(result)}`);
    lines.push(`Result: ${result.message}`);
    lines.push(`Duration: ${result.durationMs}ms`);
    const details = formatDetails(result.details);
    if (details) {
      lines.push("Evidence:");
      lines.push(details);
    }
    lines.push("");
  });

  if (blocked.length) {
    lines.push("BLOCKED TESTS — NOT PASSED");
    lines.push("----------------------------");
    blocked.forEach((result) => {
      lines.push(`BLOCKED: ${result.checkId}`);
      lines.push(`Area: ${result.category}`);
      lines.push(`Reason: ${result.message}`);
      const details = formatDetails(result.details);
      if (details) lines.push(`Evidence:\n${details}`);
      lines.push("");
    });
  }

  lines.push("PRIORITY FIX LIST");
  lines.push("------------------");
  failures.forEach((result, index) => {
    lines.push(`${index + 1}. [${result.severity.toUpperCase()}] ${result.name}`);
    lines.push(`   Issue ID: ${result.checkId}`);
    lines.push(`   Classification: ${classify(result)}`);
    if (result.details?.descriptor) lines.push(`   Page/feature: ${String(result.details.descriptor)}`);
    if (result.details?.recordId) lines.push(`   Record ID: ${stringify(result.details.recordId)}`);
    if (result.details?.databasePath) lines.push(`   Database path: ${String(result.details.databasePath)}`);
    if (result.details?.operation) lines.push(`   Operation: ${String(result.details.operation)}`);
    if (result.details?.expected) lines.push(`   Expected: ${stringify(result.details.expected)}`);
    if (result.details?.actual) lines.push(`   Actual: ${stringify(result.details.actual)}`);
    if (result.details?.fixHint) lines.push(`   FIX: ${String(result.details.fixHint)}`);
    lines.push("");
  });

  lines.push("COPY/PASTE MACHINE-READABLE DIAGNOSTICS");
  lines.push("-----------------------------------------");
  failures.forEach((result) => lines.push(buildMachineReadableIssue(result)));
  lines.push("");
  lines.push("END OF REPORT");
  return lines.join("\n");
}
