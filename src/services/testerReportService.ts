import type { TesterRun } from "./testerBotService";

function formatDetails(details?: Record<string, unknown>) {
  if (!details) return "";
  const preferred = ["descriptor", "action", "databasePath", "operation", "expected", "actual", "impact", "fixHint", "regression"];
  const entries = preferred.filter((key) => key in details).map((key) => [key, details[key]] as const);
  const remaining = Object.entries(details).filter(([key]) => !preferred.includes(key));
  return [...entries, ...remaining]
    .map(([key, value]) => `  ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

function severityRank(severity: TesterRun["results"][number]["severity"]) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity];
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
    lines.push(`Test ID: ${result.checkId}`);
    lines.push(`Area: ${result.category}`);
    lines.push(`Test: ${result.name}`);
    lines.push(`Result: ${result.message}`);
    lines.push(`Duration: ${result.durationMs}ms`);
    lines.push(formatDetails(result.details));
    lines.push("");
  });

  if (blocked.length) {
    lines.push("BLOCKED TESTS — NOT PASSED");
    lines.push("----------------------------");
    blocked.forEach((result) => {
      lines.push(`BLOCKED: ${result.checkId}`);
      lines.push(`Area: ${result.category}`);
      lines.push(`Reason: ${result.message}`);
      lines.push(formatDetails(result.details));
      lines.push("");
    });
  }

  lines.push("PRIORITY FIX LIST");
  lines.push("------------------");
  failures.forEach((result, index) => {
    lines.push(`${index + 1}. [${result.severity.toUpperCase()}] ${result.name}`);
    lines.push(`   Test ID: ${result.checkId}`);
    if (result.details?.descriptor) lines.push(`   Page/feature: ${String(result.details.descriptor)}`);
    if (result.details?.databasePath) lines.push(`   Database path: ${String(result.details.databasePath)}`);
    if (result.details?.operation) lines.push(`   Operation: ${String(result.details.operation)}`);
    if (result.details?.expected) lines.push(`   Expected: ${String(result.details.expected)}`);
    if (result.details?.actual) lines.push(`   Actual: ${String(result.details.actual)}`);
    if (result.details?.fixHint) lines.push(`   FIX: ${String(result.details.fixHint)}`);
    lines.push("");
  });

  lines.push("END OF REPORT");
  return lines.join("\n");
}
