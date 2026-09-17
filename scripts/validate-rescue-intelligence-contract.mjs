import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const requiredFiles = [
  "src/context/WorkspaceBrandingContext.tsx",
  "src/components/WorkspaceSwitcher.tsx",
  "src/components/WorkspaceIdentityStrip.tsx",
  "src/services/workspacePresentationService.ts",
  "src/services/tinyTitansEventBus.ts",
  "src/services/tinyTitansIntelligenceKernel.ts",
  "src/intelligence/v50/titanIntelligenceGrowthEngine.ts",
  "src/services/firebaseAiIntelligenceService.ts",
  "src/firebase/config.ts",
  "src/components/TitanIntelligence/TitanIntelligenceGrowthPanel.tsx",
];
for (const file of requiredFiles) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing intelligence/rescue contract file: ${file}`);

const workspaceProducts = read("src/config/workspaceProducts.ts");
const kernel = read("src/services/tinyTitansIntelligenceKernel.ts");
const events = read("src/services/tinyTitansEventBus.ts");
const ai = read("src/services/firebaseAiIntelligenceService.ts");
const firebase = read("src/firebase/config.ts");
const switcher = read("src/components/WorkspaceSwitcher.tsx");
const landing = read("src/pages/PartnerLanding.tsx");
const rescueService = read("src/services/rescueService.ts");

const assertions = [
  [workspaceProducts.includes("name:\"Rescue Centre Workspace\"") && workspaceProducts.includes("label:\"Intelligence & Growth\""), "Rescue workspace must be explicitly named and expose Intelligence & Growth."],
  [events.includes("RescueIntakeRecorded") && events.includes("RescueCareRecorded") && events.includes("RescueTransferRecorded") && events.includes("RescueFosterRecorded") && events.includes("RescueDocumentRecorded"), "Rescue operational events must enter the shared event bus."],
  [kernel.includes("for (const eventName of TINY_TITANS_EVENT_NAMES)") && kernel.includes("toIntelligenceGrowthEvent"), "The kernel must subscribe to all recognised events and feed Intelligence Growth."],
  [ai.includes('from "firebase/ai"') && ai.includes("getGenerativeModel") && ai.includes("gemini-3.8-flash"), "Firebase AI Logic Gemini explainer integration is missing."],
  [firebase.includes("initializeAppCheck") && firebase.includes("ReCaptchaEnterpriseProvider"), "Production Firebase AI Logic foundation must include App Check."],
  [switcher.includes("Personal profile") && switcher.includes("workType"), "Workspace selector must expose personal and work context."],
  [landing.includes("REGISTRATION &amp; COMPLIANCE") && landing.includes("Public TinyTitans profile does not by itself certify"), "Public rescue/business identity must expose factual credentials without implying automatic verification."],
  [rescueService.includes('emitRescueEvent("RescueIntakeRecorded"') && rescueService.includes('emitRescueEvent("RescueCareRecorded"'), "Rescue intake and care records must contribute to intelligence."],
];
for (const [ok, message] of assertions) if (!ok) throw new Error(message);
console.log("Rescue + Intelligence contract: PASS");
