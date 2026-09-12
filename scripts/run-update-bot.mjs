import { execFileSync } from "node:child_process";
import fs from "node:fs";

const checks = [
  ["TypeScript", ["run", "typecheck"]],
  ["Route contract", ["run", "validate:routes"]],
  ["Route coverage", ["run", "validate:route-coverage"]],
  ["Production build", ["run", "build"]],
];

function npm(args) {
  execFileSync("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function validateUpdateTargetSource() {
  const file = "src/services/testerUpdateSuitesService.ts";
  if (!fs.existsSync(file)) throw new Error(`${file} is missing.`);

  const source = fs.readFileSync(file, "utf8");
  const requiredExports = ["UPDATE_TARGETS", "createAllPageTargetChecks", "createUpdateSmokeChecks"];
  const missing = requiredExports.filter((name) => !source.includes(`export ${name}`) && !source.includes(`export const ${name}`) && !source.includes(`export async function ${name}`) && !source.includes(`export function ${name}`));
  if (missing.length) throw new Error(`Update BOT contract is missing required exports: ${missing.join(", ")}.`);

  const targetMatches = source.match(/\[\"\//g) || [];
  if (targetMatches.length < 100) throw new Error(`Update BOT target inventory unexpectedly contains only ${targetMatches.length} route entries.`);

  console.log(`Update target inventory: ${targetMatches.length} route literals detected.`);
}

const results = [];

try {
  const started = Date.now();
  validateUpdateTargetSource();
  results.push({ label: "Update target contract", status: "PASS", durationMs: Date.now() - started });
} catch (error) {
  results.push({ label: "Update target contract", status: "FAIL", durationMs: 0, message: error instanceof Error ? error.message : String(error) });
}

for (const [label, args] of checks) {
  const started = Date.now();
  try {
    npm(args);
    results.push({ label, status: "PASS", durationMs: Date.now() - started });
  } catch (error) {
    results.push({ label, status: "FAIL", durationMs: Date.now() - started, code: error?.status ?? 1 });
  }
}

console.log("\nTINY TITANS UPDATE BOT PREFLIGHT");
console.table(results);
console.log(`Checks attempted: ${results.length}`);
console.log(`Checks passed: ${results.filter((result) => result.status === "PASS").length}`);
console.log(`Checks failed: ${results.filter((result) => result.status === "FAIL").length}`);
console.log("Browser interaction evidence: not claimed by this preflight. Use the in-app Update BOT or the Playwright Route Crawl runner for real rendered clicks.");

if (results.some((result) => result.status === "FAIL")) {
  console.error("UPDATE BOT PREFLIGHT: FAILED");
  process.exitCode = 1;
} else {
  console.log("UPDATE BOT PREFLIGHT: PASSED");
}
