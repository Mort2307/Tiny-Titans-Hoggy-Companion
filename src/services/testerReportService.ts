import type { TesterRun } from "./testerBotService";

function formatDetails(details?: Record<string, unknown>) {
  if (!details) return "";
  return Object.entries(details)
    .map(([key, value]) => `  ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

export function buildTesterReport(run: TesterRun): string {
  const failures = run.results.filter((result) => result.status === "fail");
  const blocked = run.results.filter((result) => result.status === "blocked");
  const passed = run.results.filter((result) => result.status === "pass");
  const critical = failures.filter((result) => result.severity === "critical");
  const high = failures.filter((result) => result.severity === "high");

  const lines = [
    "TINY TITANS HOGGY COMPANION — TESTER BOT REPORT",
    "================================================",
    `Suite: ${run.suite}`,
    `Run ID: ${run.id ?? "unsaved"}`,
    `Started: ${run.startedAt}`,
    `Finished: ${run.finishedAt ?? "unknown"}`,
    `Overall: ${run.status.toUpperCase()}`,
    "",
    `SUMMARY: ${passed.length} passed | ${failures.length} failed | ${blocked.length} blocked`,
    `RELEASE BLOCKERS: ${critical.length} critical | ${high.length} high`,
    "",
  ];

  for (const result of run.results) {
    lines.push(`${result.status === "pass" ? "PASS" : result.status === "blocked" ? "BLOCKED" : "FAIL"} [${result.severity.toUpperCase()}] ${result.name}`);
    lines.push(`  Test ID: ${result.checkId}`);
    lines.push(`  Area: ${result.category}`);
    lines.push(`  Duration: ${result.durationMs}ms`);
    lines.push(`  Result: ${result.message}`);
    const descriptor = result.details?.descriptor;
    if (descriptor) lines.push(`  Page/feature: ${String(descriptor)}`);
    const action = result.details?.action;
    if (action) lines.push(`  Action: ${String(action)}`);
    const expected = result.details?.expected;
    if (expected) lines.push(`  Expected: ${String(expected)}`);
    const actual = result.details?.actual;
    if (actual) lines.push(`  Actual: ${String(actual)}`);
    const fix = result.details?.fixHint;
    if (fix) lines.push(`  FIX HINT: ${String(fix)}`);
    const raw = formatDetails(result.details);
    if (raw) lines.push(raw);
    lines.push("");
  }

  lines.push("PRIORITY FIX LIST");
  lines.push("------------------");
  if (!failures.length) lines.push("No failed checks.");
  failures
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] - { critical: 0, high: 1, medium: 2, low: 3 }[b.severity]))
    .forEach((result, index) => {
      lines.push(`${index + 1}. [${result.severity.toUpperCase()}] ${result.name}`);
      lines.push(`   ${result.message}`);
      if (result.details?.descriptor) lines.push(`   Page/feature: ${String(result.details.descriptor)}`);
      if (result.details?.action) lines.push(`   Action: ${String(result.details.action)}`);
      if (result.details?.expected) lines.push(`   Expected: ${String(result.details.expected)}`);
      if (result.details?.actual) lines.push(`   Actual: ${String(result.details.actual)}`);
      if (result.details?.fixHint) lines.push(`   Fix: ${String(result.details.fixHint)}`);
    });

  lines.push("", "END OF REPORT");
  return lines.join("\n");
}
