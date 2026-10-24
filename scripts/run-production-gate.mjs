import { execFileSync } from "node:child_process";

const commands = [
  ["Release configuration", ["run", "validate:release-config"]],
  ["Account deletion contract", ["run", "validate:account-deletion"]],
  ["App-wide keeper journeys", ["run", "validate:app-wide-keeper"]],
  ["Avian and universal mutation journeys", ["run", "validate:avian-picker-morph"]],
  ["Public source credential guard", ["run", "validate:public-source"]],
  ["TypeScript typecheck", ["run", "typecheck"]],
  ["Lint", ["run", "lint"]],
  ["BOT contract suite", ["run", "test:bot:contracts"]],
  ["UI hardening contract", ["run", "validate:ui-hardening"]],
  ["Security contracts", ["run", "validate:security"]],
  ["Paid-tier contract", ["run", "validate:paid-tiers"]],
  ["Play billing boundary", ["run", "validate:play-billing-boundary"]],
  ["Route contract", ["run", "validate:routes"]],
  ["Route coverage", ["run", "validate:route-coverage"]],
  ["Morph database validation", ["run", "validate:morphs"]],
  ["Species integration validation", ["run", "validate:species-integration"]],
  ["Genetics runtime contract", ["run", "test:genetics-runtime"]],
  ["Intelligence consent contracts", ["run", "validate:intelligence-consent"]],
  ["Intelligence journey contracts", ["run", "validate:intelligence-journey"]],
  ["Notifications contract", ["run", "test:notifications"]],
  ["Feeding reminder contract", ["run", "test:feeding-reminders"]],
  ["Water change reminder contract", ["run", "test:water-change-reminders"]],
  ["Room photo contract", ["run", "test:room-photo"]],
  ["Visual QA contract", ["run", "validate:visual-qa"]],
  ["Production build", ["run", "build"]],
];

const results = [];

for (const [label, args] of commands) {
  const started = Date.now();
  try {
    execFileSync("npm", args, { stdio: "inherit", shell: process.platform === "win32" });
    results.push({ label, status: "PASS", durationMs: Date.now() - started });
  } catch (error) {
    results.push({ label, status: "FAIL", durationMs: Date.now() - started, code: error?.status ?? 1 });
  }
}

const failures = results.filter((result) => result.status === "FAIL");
console.log("\nTINY TITANS PRODUCTION GATE");
console.table(results);
console.log(`Checks attempted: ${results.length}`);
console.log(`Checks passed: ${results.length - failures.length}`);
console.log(`Checks failed: ${failures.length}`);

if (failures.length) {
  console.error("PRODUCTION GATE: FAILED");
  process.exitCode = 1;
} else {
  console.log("PRODUCTION GATE: PASSED — all registered release gates completed successfully.");
}
