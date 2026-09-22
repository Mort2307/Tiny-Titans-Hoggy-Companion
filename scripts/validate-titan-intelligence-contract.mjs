import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);
const envExample = exists(".env.example") ? read(".env.example") : "";
const master = read("src/intelligence/v50/animalMasterRecordEngine.ts");
const confidence = read("src/intelligence/v50/titanDataConfidenceEngine.ts");
const changes = read("src/intelligence/v50/titanChangeDetector.ts");
const cross = read("src/intelligence/v50/titanCrossDomainEngine.ts");
const panel = read("src/components/TitanIntelligence/TitanAnimalMasterRecord.tsx");
const runtime = read("src/intelligence/v50/titanV50Runtime.ts");
const titanPage = read("src/pages/TitanIntelligence.tsx");
const snakePage = read("src/pages/SnakeTitanIntelligencePage.tsx");
const data = read("functions/titanIntelligenceData.js");
const tools = read("functions/titanIntelligenceTools.js");
const access = read("functions/titanIntelligenceAccess.js");
const model = read("functions/titanIntelligenceModel.js");
const titanChatBackend = read("functions/titanIntelligence.js");
const feedback = read("functions/titanIntelligenceFeedback.js");
const goals = read("functions/titanGoals.js");
const chatContracts = read("src/intelligence/askTitan/titanChatContracts.ts");
const parkedChat = read("src/components/TitanIntelligence/AskTitan.tsx");
const failures = [];
if (exists("src/services/firebaseAiIntelligenceService.ts")) failures.push("Firebase AI Logic/Gemini explainer is still present in the active source tree.");
if (!exists("retirement/gemini/firebaseAiIntelligenceService.ts")) failures.push("Parked Firebase AI Logic/Gemini explainer is missing from the retirement shelf.");
if (envExample.includes("VITE_TT_GEMINI_MODEL")) failures.push("The active environment example still exposes the retired Gemini model setting.");
if (envExample.includes("Firebase AI Logic / Gemini")) failures.push("The active environment example still advertises the retired Gemini integration.");
if (/require\(\"\.\/titanIntelligence\"\)/.test(read("functions/index.js"))) failures.push("Gemini-backed Titan chat is still exported through functions/index.js.");
if (/require\(\"\.\/titanIntelligenceFeedback\"\)/.test(read("functions/index.js"))) failures.push("Titan chat feedback is still exported through functions/index.js.");

const required = [
  [master, "buildAnimalMasterRecord", "Master Record builder is missing."],
  [master, "dataConfidence", "Master Record is not connected to evidence confidence."],
  [master, "crossDomainSignals", "Master Record is not connected to cross-domain signals."],
  [master, "detectTitanChanges", "Master Record is not connected to change detection."],
  [confidence, "calculateTitanDataConfidence", "Data confidence engine is missing."],
  [confidence, "evidence quality", "Data confidence does not explain what its score means."],
  [changes, "detectTitanChanges", "Change detector is missing."],
  [changes, "not a diagnosis", "Change detector is missing its non-diagnostic boundary."],
  [cross, "detectCrossDomainSignals", "Cross-domain engine is missing."],
  [cross, "causalClaim", "Cross-domain engine is not explicitly non-causal."],
  [cross, "explainCrossDomainSignal", "Cross-domain explanation path is missing."],
  [cross, "buildHolyShitSummary", "HOLY SHIT summary path is missing."],
  [panel, "What Tiny Titans sees next", "Proactive surface is missing from the Master Record."],
  [panel, "Why am I seeing this?", "Cross-domain signals are missing an explanation path."],
  [runtime, "runTitanV50", "V50 Powerhouse runtime is missing."],
  [runtime, "featureReady", "V50 capability readiness logic is missing."],
  [titanPage, "POWERHOUSE INTELLIGENCE · V50", "Powerhouse Intelligence page branding is missing."],
  [snakePage, "POWERHOUSE INTELLIGENCE", "Individual Powerhouse Intelligence surface is missing."],
  [data, "listRescueAnimals", "Rescue animal retrieval is missing."],
  [data, "getRescueAnimalRecords", "Rescue record retrieval is missing."],
  [data, "getRescueCollectionOverview", "Rescue intelligence overview is missing."],
  [data, "rescueAnimals", "Rescue collection boundary is missing."],
  [data, "Medical/private records are omitted from lower-privilege views", "Rescue visibility boundary is missing."],
  [data, "function serialiseItems", "Rescue record serialisation helper is missing."],
  [tools, "get_workspace_animal_records", "Rescue workspace tool declaration is missing from the reusable intelligence data layer."],
  [tools, "Personal animal records are not substituted into Rescue context", "Cross-workspace data isolation is missing."],
  [access, "workspaceKind === \"rescue\"", "Rescue access boundary is missing from the reusable intelligence access layer."],
  [access, "effectiveTier: \"rescue\"", "Rescue access does not resolve to the Rescue tier."],
  [model, "GEMINI_API_KEY", "Parked Gemini model adapter is missing its secret binding."],
  [titanChatBackend, "consumeTitanUsage", "Parked Titan chat backend lost its usage enforcement."],
  [titanChatBackend, "executeTool", "Parked Titan chat backend lost its tool execution path."],
  [titanChatBackend, "buildTitanProvenance", "Parked Titan chat backend lost its provenance path."],
  [titanChatBackend, "responseId: crypto.randomUUID()", "Parked Titan chat backend lost response identity."],
  [feedback, "recordTitanFeedback", "Parked Titan feedback callable is missing."],
  [feedback, "titanFeedback", "Parked Titan feedback persistence is missing."],
  [chatContracts, "TitanWorkspaceKind", "Parked Titan chat workspace contract is missing."],
  [parkedChat, "useTitanChat", "Parked Ask Titan surface is missing."],
];

for (const [source, needle, message] of required) {
  if (!source.toLowerCase().includes(String(needle).toLowerCase())) failures.push(message);
}

if (data.includes(".map(serialise)")) failures.push("Rescue intelligence contains an unsafe Array.map(serialise) recursion-depth call.");

const feedbackPersistenceBlock = feedback.match(/db\.collection\("titanFeedback"\)[\s\S]*?\.set\(\{([\s\S]*?)\},\s*\{\s*merge:\s*true\s*\}\)/)?.[1] || "";
if (/\b(?:question|answer)\s*:/.test(feedbackPersistenceBlock)) {
  failures.push("Titan feedback must not persist raw private question/answer content.");
}

if (/AskTitan/.test(titanPage) || /TitanAdvancedChatPreview/.test(titanPage)) failures.push("Main Powerhouse Intelligence page still actively mounts the parked Titan chat surface.");
if (/AskTitan/.test(snakePage)) failures.push("Individual Powerhouse Intelligence page still actively mounts the parked Titan chat surface.");
if (/require\(\"\.\/titanIntelligence\"\)/.test(goals)) failures.push("Gemini-backed Ask Titan callable is still exported through titanGoals.js.");
if (/require\(\"\.\/titanIntelligenceFeedback\"\)/.test(goals)) failures.push("Titan chat feedback callable is still exported through titanGoals.js.");
if (!/Gemini-backed Ask Titan is intentionally parked/.test(goals)) failures.push("The production function boundary does not document that Gemini chat is parked.");

if (failures.length) {
  console.error(`Titan intelligence contract failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Titan intelligence contract passed: Powerhouse V50 intelligence remains active, core data/rescue intelligence layers remain present, and Gemini-backed chat is parked outside the production function/UI surface.");