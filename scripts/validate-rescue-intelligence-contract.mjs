import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function walkSource(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSource(full);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const requiredFiles = [
  "src/context/WorkspaceBrandingContext.tsx",
  "src/components/WorkspaceSwitcher.tsx",
  "src/components/WorkspaceIdentityStrip.tsx",
  "src/services/workspacePresentationService.ts",
  "src/services/tinyTitansEventBus.ts",
  "src/services/tinyTitansIntelligenceKernel.ts",
  "src/intelligence/v50/titanIntelligenceGrowthEngine.ts",
  "src/firebase/config.ts",
  "src/components/TitanIntelligence/TitanIntelligenceGrowthPanel.tsx",
  "retirement/gemini/firebaseAiIntelligenceService.ts",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`Missing intelligence/rescue contract file: ${file}`);
  }
}

const workspaceProducts = read("src/config/workspaceProducts.ts");
const kernel = read("src/services/tinyTitansIntelligenceKernel.ts");
const events = read("src/services/tinyTitansEventBus.ts");
const firebase = read("src/firebase/config.ts");
const switcher = read("src/components/WorkspaceSwitcher.tsx");
const landing = read("src/pages/PartnerLanding.tsx");
const rescueService = read("src/services/rescueService.ts");
const retiredAi = read("retirement/gemini/firebaseAiIntelligenceService.ts");

const productionAiImports = walkSource(path.join(root, "src"))
  .filter((file) => /from\s+["']firebase\/ai["']/.test(fs.readFileSync(file, "utf8")))
  .map((file) => path.relative(root, file).replaceAll("\\", "/"));

const assertions = [
  [
    workspaceProducts.includes('name:"Rescue Centre Workspace"') &&
      workspaceProducts.includes('label:"Titan Intelligence"'),
    "Rescue workspace must be explicitly named and expose Titan Intelligence.",
  ],
  [
    events.includes("RescueIntakeRecorded") &&
      events.includes("RescueCareRecorded") &&
      events.includes("RescueTransferRecorded") &&
      events.includes("RescueFosterRecorded") &&
      events.includes("RescueDocumentRecorded"),
    "Rescue operational events must enter the shared event bus.",
  ],
  [
    kernel.includes("for (const eventName of TINY_TITANS_EVENT_NAMES)") &&
      kernel.includes("toIntelligenceGrowthEvent"),
    "The kernel must subscribe to all recognised events and feed Intelligence Growth.",
  ],
  [
    !fs.existsSync(path.join(root, "src/services/firebaseAiIntelligenceService.ts")),
    "The retired Firebase AI service must not return to the production services directory.",
  ],
  [
    productionAiImports.length === 0,
    `Production source must not import firebase/ai. Found: ${productionAiImports.join(", ") || "none"}`,
  ],
  [
    retiredAi.includes('from "firebase/ai"') &&
      retiredAi.includes("getGenerativeModel") &&
      retiredAi.includes("gemini-3.8-flash"),
    "The retired Gemini implementation must remain clearly archived under retirement/gemini.",
  ],
  [
    firebase.includes("initializeAppCheck") &&
      firebase.includes("ReCaptchaEnterpriseProvider"),
    "Production Firebase foundation must retain App Check.",
  ],
  [
    switcher.includes("Personal profile") && switcher.includes("workType"),
    "Workspace selector must expose personal and work context.",
  ],
  [
    landing.includes("REGISTRATION &amp; COMPLIANCE") &&
      landing.includes("A public TinyTitans profile does not by itself certify"),
    "Public rescue/business identity must expose factual credentials without implying automatic verification.",
  ],
  [
    rescueService.includes('emitRescueEvent("RescueIntakeRecorded"') &&
      rescueService.includes('emitRescueEvent("RescueCareRecorded"'),
    "Rescue intake and care records must contribute to intelligence.",
  ],
];

for (const [ok, message] of assertions) {
  if (!ok) throw new Error(message);
}

console.log("Rescue + Intelligence contract: PASS");
