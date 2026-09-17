import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");
const files = {
  package: "package.json",
  router: "src/routes/AppRouter.tsx",
  section: "src/pages/CreatorOperationsSection.tsx",
  viewer: "src/pages/CreatorQaEvidenceViewer.tsx",
  evidenceService: "src/services/creatorQaEvidenceService.ts",
  capture: "scripts/run-visual-review-bot.mjs",
  routeDiscovery: "scripts/prepare-visual-route-set.mjs",
  firebasePublisher: "scripts/publish-visual-qa-evidence.mjs",
  githubPublisher: "scripts/publish-visual-qa-to-github.mjs",
  workflow: ".github/workflows/visual-capture-bot.yml",
  functions: "functions/creatorOperationsData.js",
  storageRules: "storage.rules",
  visualContract: "docs/visual-design-contract.json",
};

const source = {};
for (const [key, relativePath] of Object.entries(files)) source[key] = await fs.readFile(path.join(root, relativePath), "utf8");

const findings = [];
function requireText(key, text, message) {
  if (!source[key].includes(text)) findings.push({ severity: "critical", message });
}

const packageJson = JSON.parse(source.package);
const contract = JSON.parse(source.visualContract);

requireText("package", '"test:visual-review":"node scripts/prepare-visual-route-set.mjs"', "package.json test:visual-review must run universal route discovery before capture.");
requireText("router", 'path="/creator/qa"', "AppRouter must keep the Creator QA route registered.");
requireText("section", "CreatorQaEvidenceViewer", "CreatorOperationsSection must route QA mode to the rendered evidence viewer.");
requireText("evidenceService", "export async function getQaEvidenceBlobUrl", "Creator QA service must load screenshots through authenticated blob URLs.");
requireText("viewer", "Open GitHub evidence", "Creator QA viewer must expose the current GitHub evidence handoff.");
requireText("capture", "recordVideo", "Visual capture must preserve real viewport journey recording.");
requireText("routeDiscovery", "router-plus-authenticated-runtime-discovery", "Universal route discovery must remain router + authenticated runtime based.");
requireText("firebasePublisher", "publishCreatorQaRun", "Firebase evidence publisher must call the secure Creator QA publication endpoint.");
requireText("githubPublisher", "qa-evidence", "GitHub evidence publisher must publish to the temporary qa-evidence branch.");
requireText("workflow", "permissions:\n  contents: write", "Visual workflow needs contents:write to replace the temporary GitHub evidence branch.");
requireText("workflow", "scripts/prepare-visual-route-set.mjs", "Visual workflow must use the universal route discovery runner.");
requireText("workflow", "scripts/publish-visual-qa-to-github.mjs", "Visual workflow must publish the current evidence to GitHub.");
requireText("workflow", "scripts/publish-visual-qa-evidence.mjs", "Visual workflow must publish the current evidence to creator-only Firebase storage and QA history.");
requireText("functions", "exports.publishCreatorQaRun", "Creator Operations functions must expose the QA publication endpoint.");
requireText("functions", "bucket.deleteFiles", "QA publication must remove the previous binary Firebase evidence after the new run is ready.");
requireText("storageRules", "match /qa-evidence/{runId}/{fileName=**}", "Creator-only QA evidence Storage rules must exist.");

if (!Array.isArray(contract.responsiveViewports) || contract.responsiveViewports.length < 6) findings.push({ severity: "critical", message: "Visual design contract must contain the full canonical responsive viewport matrix." });
const requiredViewports = ["mobile320", "mobile360", "mobile390", "mobile414", "tabletPortrait", "tabletLandscape", "laptop", "desktop", "desktopWide"];
for (const name of requiredViewports) if (!contract.responsiveViewports.some((viewport) => viewport.name === name)) findings.push({ severity: "critical", message: `Missing canonical viewport: ${name}.` });

if (!source.viewer.includes("getQaEvidenceBlobUrl")) findings.push({ severity: "critical", message: "Viewer must use authenticated screenshot blob loading rather than public download URLs." });
if (source.viewer.includes("getQaEvidenceUrl")) findings.push({ severity: "critical", message: "Viewer must not use tokenised public download URLs for creator-only screenshot evidence." });
if (!source.githubPublisher.includes("--force")) findings.push({ severity: "critical", message: "GitHub evidence publication must replace the temporary branch instead of accumulating stale captures." });
if (!source.githubPublisher.includes("qa/latest")) findings.push({ severity: "critical", message: "GitHub evidence must remain under qa/latest for a stable viewer path." });
if (!source.firebasePublisher.includes("qa-evidence/runs/")) findings.push({ severity: "critical", message: "Firebase QA evidence must remain under the dedicated QA storage prefix." });

const result = {
  test: "visual-qa-bridge-contract",
  status: findings.length ? "fail" : "pass",
  canonicalViewports: contract.responsiveViewports,
  checks: {
    creatorViewer: Boolean(source.viewer && source.section),
    authenticatedScreenshotAccess: source.viewer.includes("getQaEvidenceBlobUrl"),
    universalRouteDiscovery: source.routeDiscovery.includes("extractDeclaredRoutes") && source.routeDiscovery.includes("authenticated-runtime-discovery"),
    firebasePublishing: source.firebasePublisher.includes("publishCreatorQaRun"),
    githubPublishing: source.githubPublisher.includes("qa-evidence") && source.githubPublisher.includes("--force"),
    temporaryCleanup: source.functions.includes("bucket.deleteFiles"),
    creatorOnlyStorageRule: source.storageRules.includes("match /qa-evidence/{runId}/{fileName=**}"),
  },
  findings,
};

console.log(JSON.stringify(result, null, 2));
if (findings.length) process.exit(1);
