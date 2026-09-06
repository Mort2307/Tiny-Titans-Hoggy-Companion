import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrixPath = path.join(root, "src/intelligence/v50/titanV50FeatureMatrix.ts");
const runtimePath = path.join(root, "src/intelligence/v50/titanV50Runtime.ts");
const matrix = fs.readFileSync(matrixPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");

const ids = [...matrix.matchAll(/\{ id: (\d+), name:/g)].map((match) => Number(match[1]));
const missingSummary = ids.filter((id) => !new RegExp(`\\b${id}: \\\"`).test(runtime));
const missingReadiness = [
  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,
  26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,
].filter((id) => !new RegExp(`case ${id}:`).test(runtime));

const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
const uniqueIds = [...new Set(ids)];
const findings = [];
if (uniqueIds.length !== 50) findings.push(`Expected 50 unique feature IDs, found ${uniqueIds.length}.`);
if (duplicateIds.length) findings.push(`Duplicate feature IDs detected: ${[...new Set(duplicateIds)].join(", ")}.`);
if (missingSummary.length) findings.push(`Missing feature summaries: ${missingSummary.join(", ")}.`);
if (missingReadiness.length) findings.push(`Missing runtime readiness cases: ${missingReadiness.join(", ")}.`);
if (!runtime.includes("TITAN_V50_FEATURES.map")) findings.push("Runtime does not iterate the canonical V50 matrix.");
if (!runtime.includes("buildTitanProactiveIntelligence")) findings.push("Runtime is not connected to the proactive intelligence engine.");

console.log(JSON.stringify({
  test: "v50-runtime-contract",
  evidence: {
    featureCount: uniqueIds.length,
    featureIds: uniqueIds,
    summaryCoverage: 50 - missingSummary.length,
    readinessCaseCoverage: 50 - missingReadiness.length,
    connectedToCanonicalMatrix: runtime.includes("TITAN_V50_FEATURES.map"),
    connectedToProactiveEngine: runtime.includes("buildTitanProactiveIntelligence"),
  },
  status: findings.length ? "fail" : "pass",
  findings,
  limitation: "This validates runtime adapter coverage and wiring statically. It does not prove every feature's browser UX or domain-specific output is production-correct; those require feature-level behavioural tests.",
}, null, 2));

if (findings.length) process.exit(1);
