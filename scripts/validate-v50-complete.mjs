import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrix = fs.readFileSync(path.join(root, "src/intelligence/v50/titanV50FeatureMatrix.ts"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src/intelligence/v50/titanV50Runtime.ts"), "utf8");
const experience = fs.readFileSync(path.join(root, "src/pages/TitanFeatureExperience.tsx"), "utf8");
const router = fs.readFileSync(path.join(root, "src/routes/AppRouter.tsx"), "utf8");
const files = [
  "src/intelligence/v50/titanV50UnifiedRuntime.ts",
  "src/intelligence/v50/titanV50ImpactGraph.ts",
  "src/intelligence/v50/titanKnowledgeGraph.ts",
  "src/intelligence/v50/titanExplainability.ts",
  "src/intelligence/v50/titanContextSnapshot.ts",
  "src/intelligence/v50/animalIntelligenceEngine.ts",
  "src/intelligence/v50/geneticsIntegrityEngine.ts",
  "src/intelligence/v50/geneticsJourneyEngine.ts",
  "src/intelligence/v50/husbandryIntelligenceEngine.ts",
  "src/intelligence/v50/learningCommunityIntelligenceEngine.ts",
  "src/intelligence/v50/animalRecordsIntelligence.ts",
  "src/intelligence/v50/geneticsSearchIntelligence.ts",
  "src/services/titanMicroclimateService.ts",
  "src/components/TitanIntelligence/TitanLiveIntelligencePanel.tsx",
  "src/components/TitanIntelligence/TitanGeneticsWorkspace.tsx",
  "src/components/TitanIntelligence/TitanCommunityLearningPanel.tsx",
  "src/components/TitanIntelligence/TitanExplanationModes.tsx",
  "src/components/TitanIntelligence/TitanKnowledgeGraphPanel.tsx",
];

const missingFiles = files.filter((file) => !fs.existsSync(path.join(root, file)));
const ids = [...matrix.matchAll(/\{ id: (\d+), name:/g)].map((m) => Number(m[1]));
const unique = new Set(ids);
const findings = [];
if (unique.size !== 50) findings.push(`Canonical V50 matrix contains ${unique.size} unique features, expected 50.`);
if (!router.includes('/titan-intelligence/feature/:featureId')) findings.push('Dedicated all-feature route is missing.');
if (!experience.includes('TITAN_V50_FEATURES') || !experience.includes('featureById')) findings.push('Feature experience is not matrix-driven.');
if (!runtime.includes('TITAN_V50_FEATURES.map')) findings.push('Runtime is not evaluating the canonical matrix.');
if (missingFiles.length) findings.push(`Missing V50 engine/UI files: ${missingFiles.join(', ')}`);
for (let id = 1; id <= 50; id += 1) {
  if (!matrix.includes(`id: ${id},`)) findings.push(`Feature #${id} is absent from matrix.`);
}

console.log(JSON.stringify({
  test: 'v50-complete-gate',
  evidence: {
    canonicalFeatureCount: unique.size,
    featureIdsComplete: unique.size === 50 && [...unique].every((id) => id >= 1 && id <= 50),
    dedicatedFeatureRoute: router.includes('/titan-intelligence/feature/:featureId'),
    runtimeMatrixDriven: runtime.includes('TITAN_V50_FEATURES.map'),
    missingFiles,
    domainEngineFamilies: 6,
  },
  status: findings.length ? 'fail' : 'pass',
  findings,
  limitation: 'This gate proves structural V50 coverage. Production validation still depends on TypeScript/build, browser journey tests, live data permissions and domain review.',
}, null, 2));

if (findings.length) process.exit(1);
