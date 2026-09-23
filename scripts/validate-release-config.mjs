import { readFileSync } from "node:fs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const pkg = readJson("package.json");
const manifest = readJson("public/manifest.webmanifest");
const vite = readFileSync("vite.config.ts", "utf8");

const checks = [
  ["package has explicit typecheck script", typeof pkg.scripts?.typecheck === "string" && pkg.scripts.typecheck.includes("tsc -b")],
  ["package has release candidate script", typeof pkg.scripts?.["test:release-candidate"] === "string"],
  ["manifest allows responsive orientation", manifest.orientation === "any"],
  ["vite PWA allows responsive orientation", vite.includes('orientation: "any"')],
  ["release gate script exists", typeof pkg.scripts?.["test:production-gate"] === "string"],
  ["release candidate script runs gate", pkg.scripts?.["test:release-candidate"] === "npm run test:production-gate && npm run audit"],
  ["legacy portrait-only PWA setting removed", !vite.includes('orientation: "portrait-primary"') && manifest.orientation !== "portrait-primary"],
];

const failures = checks.filter(([, pass]) => !pass);
console.table(checks.map(([name, pass]) => ({ check: name, status: pass ? "PASS" : "FAIL" })));

if (failures.length) {
  console.error(`RELEASE CONFIG: FAILED (${failures.length} check(s))`);
  process.exitCode = 1;
} else {
  console.log("RELEASE CONFIG: PASSED");
}
