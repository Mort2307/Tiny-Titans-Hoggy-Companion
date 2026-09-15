import fs from "node:fs";

const decisionPath = "src/services/titanDecisionStateService.ts";
const collectionPath = "src/pages/MySnakesTiles.tsx";
const homePath = "src/pages/Home.tsx";
const decision = fs.readFileSync(decisionPath, "utf8");
const collection = fs.readFileSync(collectionPath, "utf8");
const home = fs.readFileSync(homePath, "utf8");
const homeContract = home.replace(/\\s+/g, "");
const findings = [];

for (const symbol of [
  "refreshTitanDecisionStateForAnimals",
  "getSnakeIntelligence",
  "destinationForCategory",
  "insightToCandidate",
  "item.insights.map(insight=>insightToCandidate",
]) {
  if (!decision.includes(symbol)) findings.push(`Decision refresh contract missing: ${symbol}`);
}
for (const symbol of [
  "refreshTitanDecisionStateForAnimals",
  "subscribeToTitanIntelligenceUpdates",
  "hasFullIntelligenceAccess",
  "syncSnakes",
]) {
  if (!collection.includes(symbol)) findings.push(`Collection is not wired to canonical reactive refresh: ${symbol}`);
}
if (!/getTitanDecisionState\\(user\.uid\\)/.test(homeContract)) findings.push("Home is not reading the canonical decision state before refreshing.");
if (!/existing\.decisions\.length\s*>\s*0/.test(homeContract)) findings.push("Home refresh guard is missing; it may rewrite the decision state on every visit.");
if (!/if\s*\(\s*existing\.decisions\.length\s*>\s*0\s*\)[\\s\\S]*?setDecision\(existingActive\)[\\s\\S]*?else\s*\{[\\s\\S]*?refreshTitanDecisionStateForAnimals/.test(home)) findings.push("Home does not retain first-run decision generation when canonical state is empty.");
if (!/const\\s+event\\s*=\\s*detail\.event/.test(home) || !/event\?\.animalId\s*&&\s*event\.occurredAt/.test(home) || !/refreshTitanDecisionStateForAnimals\\(user\.uid,\\s*\\[event\.animalId\\]\\s*,\\s*\\{\\s*type:\\s*event\.type,\\s*occurredAt:\\s*event\.occurredAt\\s*\\}/.test(home)) findings.push("Home reactive event handling does not refresh the affected animal from the real event timestamp.");

const triggerGuardPattern = /const\s+triggerAt\s*=\s*trigger\?\.occurredAt\s*\?\s*Date\.parse\(trigger\.occurredAt\)\s*:\s*NaN/;
const guardedLastEventPattern = /lastEventAt\s*:\s*hasTriggerTimestamp\s*\?\s*triggerAt\s*:\s*undefined/;
if (!triggerGuardPattern.test(decision)) findings.push("Decision refresh still synthesises an event timestamp when no trigger is supplied.");
if (!guardedLastEventPattern.test(decision)) findings.push("Decision refresh does not guard lastEventAt behind a real trigger timestamp.");
if (!decision.includes("const nextIds=new Set(candidates.map(candidate=>`${candidate.animalId}:${candidate.recommendation.id}`))")) findings.push("Decision refresh does not reconcile the expanded per-insight queue by stable candidate id.");
if (!decision.includes('function insightPriority(insight:SnakeInsight):number{')) findings.push("Insight ranking does not have an explicit deterministic priority function.");
if (!decision.includes('reason:insight.action')) findings.push("Canonical decision 'next action' is not sourced from the insight action text.");
if (decision.includes("SnakeIntelligence[\"priority\"][\"category\"]")) findings.push("Decision refresh category type is incorrectly indexed through nullable priority.");

console.log(JSON.stringify({
  test: "titan-decision-refresh-contract",
  status: findings.length ? "fail" : "pass",
  findings,
}, null, 2));

if (findings.length) process.exit(1);
