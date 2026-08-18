import { execFileSync } from "node:child_process";

const suites = [
  ["routes", "validate:routes"],
  ["route coverage", "validate:route-coverage"],
  ["morph database", "validate:morphs"],
  ["learning content", "validate:learning"],
  ["encoding", "validate:encoding"],
];

const results = [];

for (const [label, script] of suites) {
  const started = Date.now();
  try {
    execFileSync("npm", ["run", script], { stdio: "inherit", shell: process.platform === "win32" });
    results.push({ label, status: "PASS", durationMs: Date.now() - started });
  } catch (error) {
    results.push({ label, status: "FAIL", durationMs: Date.now() - started, code: error?.status ?? 1 });
  }
}

const failed = results.filter((result) => result.status === "FAIL");
console.log("\nBOT CONTRACT REPORT");
console.table(results);
console.log(`Executed: ${results.length}`);
console.log(`Passed: ${results.length - failed.length}`);
console.log(`Failed: ${failed.length}`);
console.log(`Coverage: 100% (all registered contract suites were attempted)`);
console.log(`Effective pass rate: ${results.length ? Math.round(((results.length - failed.length) / results.length) * 100) : 0}%`);

if (failed.length) {
  process.exitCode = 1;
}
