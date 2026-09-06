import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const graphPath = path.join(root, "src", "intelligence", "v50", "titanV50ImpactGraph.ts");
const graph = fs.readFileSync(graphPath, "utf8");

const ids = new Set();
for (const match of graph.matchAll(/\[(.*?)\]/gs)) {
  for (const value of match[1].matchAll(/\b([1-9]|[1-4][0-9]|50)\b/g)) ids.add(Number(value[1]));
}

const missing = [];
for (let id = 1; id <= 50; id += 1) {
  if (!ids.has(id)) missing.push(id);
}

const eventTypes = [...graph.matchAll(/^\s{2}([A-Za-z]+): \[/gm)].map((match) => match[1]);
const requiredEvents = [
  "WeightRecorded", "FeedingRecorded", "ShedRecorded", "BehaviourObserved",
  "HealthRecordCreated", "BreedingProjectCreated", "MorphConfirmed", "EnclosureUpdated",
  "MicroclimateRecorded", "LearningCompleted", "CommunityContribution", "SpeciesAdded",
];
const missingEvents = requiredEvents.filter((event) => !eventTypes.includes(event));
const findings = [];
if (missing.length) findings.push(`Features absent from impact graph: ${missing.join(", ")}.`);
if (missingEvents.length) findings.push(`Required event types absent from impact graph: ${missingEvents.join(", ")}.`);
if (!graph.includes("buildV50ImpactResult")) findings.push("Public impact builder is missing.");
if (!graph.includes("TITAN_V50_FEATURES.filter")) findings.push("Impact graph is not resolving against the canonical V50 feature matrix.");

console.log(JSON.stringify({
  test: "v50-impact-graph",
  evidence: {
    featureIdsReferenced: ids.size,
    missingFeatureIds: missing,
    eventTypesReferenced: eventTypes.length,
    missingRequiredEvents: missingEvents,
    canonicalMatrixResolution: graph.includes("TITAN_V50_FEATURES.filter"),
  },
  status: findings.length ? "fail" : "pass",
  findings,
}, null, 2));

if (findings.length) process.exit(1);
