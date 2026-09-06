import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matrix = fs.readFileSync(path.join(root, "src/intelligence/v50/titanV50FeatureMatrix.ts"), "utf8");
const router = fs.readFileSync(path.join(root, "src/routes/AppRouter.tsx"), "utf8");
const experience = fs.readFileSync(path.join(root, "src/pages/TitanFeatureExperience.tsx"), "utf8");
const geneticsWorkspace = fs.readFileSync(path.join(root, "src/components/TitanIntelligence/TitanGeneticsWorkspace.tsx"), "utf8");
const animalMasterRecord = fs.readFileSync(path.join(root, "src/intelligence/v50/animalMasterRecordEngine.ts"), "utf8");

const ids = [...matrix.matchAll(/\{ id: (\d+), name:/g)].map((m) => Number(m[1]));
const findings = [];
const canonicalRoute = "/titan-intelligence/feature/:featureId";
if (!router.includes(canonicalRoute)) findings.push(`Router is missing canonical feature experience route: ${canonicalRoute}`);
if (!experience.includes("featureById")) findings.push("Feature experience does not resolve through the canonical matrix.");
if (!experience.includes("TitanGeneticsWorkspace") || !geneticsWorkspace.includes("searchGeneticsIntelligence")) findings.push("Feature experience is missing shared genetics intelligence integration.");
if (!experience.includes("getGrowthInsight")) findings.push("Feature experience is missing animal/growth integration.");
if (!experience.includes("buildAnimalMasterRecord") || !experience.includes("TitanAnimalMasterRecord") || !animalMasterRecord.includes("buildAnimalMasterRecord")) findings.push("Feature experience is missing connected animal Master Record integration.");
if (!experience.includes("buildMissingDataFindings")) findings.push("Feature experience is missing husbandry evidence boundary integration.");
if (new Set(ids).size !== 50) findings.push(`Canonical matrix must contain 50 unique features; found ${new Set(ids).size}.`);

console.log(JSON.stringify({
  test: "v50-feature-experience-coverage",
  evidence: { canonicalFeatures: new Set(ids).size, dedicatedRoute: router.includes(canonicalRoute), matrixResolution: experience.includes("featureById"), sharedGeneticsWorkspace: experience.includes("TitanGeneticsWorkspace") && geneticsWorkspace.includes("searchGeneticsIntelligence"), animalMasterRecord: experience.includes("TitanAnimalMasterRecord") && animalMasterRecord.includes("buildAnimalMasterRecord") },
  status: findings.length ? "fail" : "pass",
  findings,
  limitation: "A dedicated experience route proves navigability and rendering architecture, not full domain completeness of every feature. Feature-level acceptance remains required before status can become validated.",
}, null, 2));

if (findings.length) process.exit(1);
