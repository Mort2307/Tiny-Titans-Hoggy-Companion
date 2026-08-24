import { readFileSync } from "node:fs";

const source = readFileSync("src/services/tinyTitansLocalIntelligence.ts", "utf8");
const checks = [
  ["trend calculation exists", /export function calculateTrend/],
  ["insufficient data is explicit", /insufficient-data/],
  ["trend tolerance is explicit", /tolerance = 0\.02/],
  ["date interval calculation exists", /export function daysBetween/],
  ["insight builder exists", /export function buildLocalInsight/],
  ["confidence is clamped", /Math\.min\(1, Math\.max\(0/],
  ["evidence is supported", /evidence\?: EvidenceItem\[\]/],
];

const failed = checks.filter(([, pattern]) => !pattern.test(source));
console.log("LOCAL INTELLIGENCE CONTRACT REPORT");
for (const [label] of checks) console.log(`${failed.some(([name]) => name === label) ? "FAIL" : "PASS"}  ${label}`);
if (failed.length) process.exit(1);
console.log(`All ${checks.length} local intelligence contracts passed.`);
