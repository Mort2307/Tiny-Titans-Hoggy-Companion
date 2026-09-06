import fs from "node:fs";

const decisionPath = "src/services/titanDecisionStateService.ts";
const collectionPath = "src/pages/MySnakesTiles.tsx";
const homePath = "src/pages/Home.tsx";
const decision = fs.readFileSync(decisionPath, "utf8");
const collection = fs.readFileSync(collectionPath, "utf8");
const home = fs.readFileSync(homePath, "utf8");
const findings = [];

for (const symbol of [
  "refreshTitanDecisionStateForAnimals",
  "getSnakeIntelligence",
  "destinationForCategory",
]) {
  if (!decision.includes(symbol)) findings.push(`Decision refresh contract missing: ${symbol}`);
}
for (const symbol of [
  "refreshTitanDecisionStateForAnimals",
  "subscribeToTitanIntelligenceUpdates",
  "hasFullIntelligenceAccess",
]) {
  if (!collection.includes(symbol)) findings.push(`Collection is not wired to canonical reactive refresh: ${symbol}`);
}
if (!home.includes("refreshTitanDecisionStateForAnimals")) findings.push("Home is not using the canonical decision refresh entry point.");
if (decision.includes("SnakeIntelligence[\"priority\"][\"category\"]")) findings.push("Decision refresh category type is incorrectly indexed through nullable priority.");

console.log(JSON.stringify({
  test: "titan-decision-refresh-contract",
  status: findings.length ? "fail" : "pass",
  findings,
}, null, 2));

if (findings.length) process.exit(1);
