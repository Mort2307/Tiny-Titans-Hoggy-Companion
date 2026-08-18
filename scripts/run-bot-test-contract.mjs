import { execFileSync } from "node:child_process";

const suites = [
  ["routes", "validate:routes"],
  ["route coverage", "validate:route-coverage"],
  ["morph database", "validate:morphs"],
  ["learning content", "validate:learning"],
  ["encoding", "validate:encoding"],
  ["security contracts", "validate:security"],
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
const attempted = results.length;

console.log("\nBOT CONTRACT REPORT");
console.table(results);
console.log(`Registered: ${suites.length}`);
console.log(`Attempted: ${attempted}`);
console.log(`Passed: ${attempted - failed.length}`);
console.log(`Failed: ${failed.length}`);
console.log(`Coverage: ${Math.round((attempted / suites.length) * 100)}% of registered contract suites attempted`);
console.log(`Effective pass rate: ${attempted ? Math.round(((attempted - failed.length) / attempted) * 100) : 0}%`);

if (failed.length) process.exitCode = 1;
