import { execFileSync } from "node:child_process";

const commands = [
  ["Lint", ["run", "lint"]],
  ["BOT contract suite", ["run", "test:bot:contracts"]],
  ["Security contracts", ["run", "validate:security"]],
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
  console.log("PRODUCTION GATE: PASSED — all registered automated gates completed successfully.");
}
