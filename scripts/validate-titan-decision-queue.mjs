import fs from "node:fs";

const decisionPath = "src/services/titanDecisionStateService.ts";
const queuePath = "src/components/TitanIntelligence/TitanDecisionQueue.tsx";
const animalPanelPath = "src/components/TitanIntelligence/TitanAnimalIntelligencePanel.tsx";
const homePath = "src/pages/Home.tsx";
const weightPath = "src/pages/WeightRecords.tsx";
const feedingPath = "src/pages/FeedingTracker.tsx";
const shedPath = "src/pages/ShedTrackerIntelligent.tsx";
const behaviourPath = "src/pages/BehaviourTracker.tsx";
const healthPath = "src/pages/HealthTracker.tsx";
const decision = fs.readFileSync(decisionPath, "utf8");
const queue = fs.readFileSync(queuePath, "utf8");
const animalPanel = fs.readFileSync(animalPanelPath, "utf8");
const home = fs.readFileSync(homePath, "utf8");
const weight = fs.readFileSync(weightPath, "utf8");
const feeding = fs.readFileSync(feedingPath, "utf8");
const shed = fs.readFileSync(shedPath, "utf8");
const behaviour = fs.readFileSync(behaviourPath, "utf8");
const health = fs.readFileSync(healthPath, "utf8");
const homeAttention = fs.readFileSync("src/components/Home/HomeAttentionSection.tsx", "utf8");
const weightHook = fs.readFileSync("src/hooks/useWeightRecords.ts", "utf8");
const feedingHook = fs.readFileSync("src/hooks/useFeedingTracker.ts", "utf8");
const shedHook = fs.readFileSync("src/hooks/useShedTrackerIntelligent.ts", "utf8");
const healthHook = fs.readFileSync("src/hooks/useHealthTracker.ts", "utf8");

const checks = [
  ["Canonical decision state promotes all current insights", decision.includes("intelligence.flatMap(item=>item.insights.map(insight=>insightToCandidate")],
  ["Decision queue supports animal scoping", queue.includes("animalId?: string") && queue.includes("decision.animalId === animalId")],
  ["Decision queue supports excluding the primary decision", queue.includes("excludeDecisionId") && queue.includes("decision.id !== excludeDecisionId")],
  ["Animal Master Record renders its scoped queue", animalPanel.includes("<TitanDecisionQueue animalId={snake.id}")],
  ["Home renders the secondary decision queue", homeAttention.includes("<TitanDecisionQueue excludeDecisionId={attentionDecision?.id}")],
  ["Decision destinations stay contextualised per animal", decision.includes("contextualDestination(r.destination,candidate.animalId)")],
  ["Weight decisions deep-link into the log action", decision.includes('case\"weight\":return\"/weights?action=log\"')],
  ["Feeding decisions deep-link into the log action", decision.includes('case\"feeding\":return\"/feeding?action=log\"')],
  ["Shedding decisions deep-link into the log action", decision.includes('case\"shedding\":return\"/shedding?action=log\"')],
  ["Behaviour decisions deep-link into the journal action", decision.includes('case\"behaviour\":return\"/behaviour?action=log\"')],
  ["Health decisions deep-link into the care action", decision.includes('case\"health\":return\"/health?action=log\"')],
  ["Weight tracker consumes the action deep-link", weightHook.includes('searchParams.get("action")') && weightHook.includes('action === "log"') && weightHook.includes('current.delete("action")')],
  ["Feeding tracker consumes the action deep-link", feedingHook.includes('searchParams.get("action")') && feedingHook.includes('searchParams.get("action") !== "log"') && feedingHook.includes('current.delete("action")')],
  ["Shedding tracker consumes the action deep-link", shedHook.includes('searchParams.get("action")') && shedHook.includes('searchParams.get("action") !== "log"') && shedHook.includes('current.delete("action")')],
  ["Behaviour tracker consumes the action deep-link", behaviour.includes('searchParams.get("action")') && behaviour.includes('searchParams.get("action") !== "log"') && behaviour.includes('current.delete("action")')],
  ["Health tracker consumes the action deep-link", /searchParams\.get\("action"\)/.test(healthHook) && /current\.delete\("action"\)/.test(healthHook)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
if (failed.length) {
  console.error(`\nTitan decision queue validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nTitan decision queue validation passed.");
