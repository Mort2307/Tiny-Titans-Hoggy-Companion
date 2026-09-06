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
if (!home.includes("getTitanDecisionState")) findings.push("Home is not reading the canonical decision state before refreshing.");
if (!home.includes("existing.decisions.length>0")) findings.push("Home refresh guard is missing; it may rewrite the decision state on every visit.");
if (!home.includes("else{const refreshed=await refreshTitanDecisionStateForAnimals")) findings.push("Home does not retain first-run decision generation when canonical state is empty.");
if (!home.includes("const event=detail.event") || !home.includes("event?.animalId&&event.occurredAt") || !home.includes("refreshTitanDecisionStateForAnimals(user.uid,[event.animalId],{type:event.type,occurredAt:event.occurredAt})")) findings.push("Home reactive event handling does not refresh the affected animal from the real event timestamp.");
if (!decision.includes("const triggerAt=trigger?.occurredAt?Date.parse(trigger.occurredAt):NaN")) findings.push("Decision refresh still synthesises an event timestamp when no trigger is supplied.");
if (!decision.includes("lastEventAt:hasTriggerTimestamp?triggerAt:undefined")) findings.push("Decision refresh does not guard lastEventAt behind a real trigger timestamp.");
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
