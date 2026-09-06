import fs from "node:fs";

const decisionPath = "src/services/titanDecisionStateService.ts";
const queuePath = "src/components/TitanIntelligence/TitanDecisionQueue.tsx";
const animalPanelPath = "src/components/TitanIntelligence/TitanAnimalIntelligencePanel.tsx";
const homePath = "src/pages/Home.tsx";
const decision = fs.readFileSync(decisionPath, "utf8");
const queue = fs.readFileSync(queuePath, "utf8");
const animalPanel = fs.readFileSync(animalPanelPath, "utf8");
const home = fs.readFileSync(homePath, "utf8");

const checks = [
  ["Canonical decision state promotes all current insights", decision.includes("intelligence.flatMap(item=>item.insights.map(insight=>insightToCandidate" )],
  ["Decision queue supports animal scoping", queue.includes("animalId?: string") && queue.includes("decision.animalId === animalId")],
  ["Decision queue supports excluding the primary decision", queue.includes("excludeDecisionId") && queue.includes("decision.id !== excludeDecisionId")],
  ["Animal Master Record renders its scoped queue", animalPanel.includes("<TitanDecisionQueue animalId={snake.id}")],
  ["Home renders the secondary decision queue", home.includes("<TitanDecisionQueue excludeDecisionId={attentionDecision?.id}")],
  ["Decision destinations stay contextualised per animal", decision.includes("contextualDestination(r.destination,candidate.animalId)")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
if (failed.length) {
  console.error(`\nTitan decision queue validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nTitan decision queue validation passed.");
