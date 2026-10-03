import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const errors = [];

const seed = read("src/data/husbandrySafetySeed.ts");
const sources = read("src/data/husbandrySafetySources.ts");
const library = read("src/pages/HusbandrySafetyLibrary.tsx");
const creator = read("src/pages/CreatorHusbandrySafety.tsx");
const routes = read("src/routes/AuthenticatedRoutes.tsx");
const rules = read("firestore.rules");

for (const token of [
  '"oak-leaves"',
  '"magnolia-leaves"',
  '"sea-grape-leaves"',
  '"yew-leaves"',
  '"oleander-leaves"',
  '"poison-ivy-leaves"',
  '"heterodon-nasicus"',
]) {
  if (!seed.includes(token)) errors.push(`Seed dataset is missing required token ${token}.`);
}

for (const status of ["safe:", "caution:", "avoid:", "unknown:"]) {
  if (!library.includes(status)) errors.push(`Keeper library is missing status definition ${status}.`);
}

const sourceIds = [...seed.matchAll(/hognoseAssessment\(\s*"[^"]+"\s*,\s*"[^"]*"\s*,\s*"[^"]+"\s*,\s*\[([^\]]*)\]/g)]
  .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]));
if (sourceIds.length === 0) errors.push("No evidence source IDs were detected in the Husbandry Safety seed.");
for (const sourceId of new Set(sourceIds)) {
  if (!sources.includes(`${sourceId}:`)) errors.push(`Seed references missing source ID: ${sourceId}.`);
}

if (!routes.includes('path="/husbandry/safety"')) errors.push("Keeper Husbandry Safety route is missing.");
if (!routes.includes('path="/creator/husbandry-safety"')) errors.push("Creator Husbandry Safety route is missing.");
if (!routes.includes("<CreatorRouteGuard><CreatorHusbandrySafety/></CreatorRouteGuard>")) errors.push("Creator Husbandry Safety route is not creator-guarded.");
if (!rules.includes("match /husbandrySafetyLibrary/{itemId}")) errors.push("Firestore Husbandry Safety collection rule is missing.");
if (!rules.includes("allow create, update, delete: if hasCapability('creator');")) errors.push("Husbandry Safety writes are not restricted to creator capability.");
if (!creator.includes("saveHusbandrySafetyItem") || !creator.includes("archiveHusbandrySafetyItem")) errors.push("Creator editor is missing write/archive integration.");
if (!library.includes("resolveHusbandrySafetyAssessment")) errors.push("Keeper library is not resolving species-aware assessments.");
if (!library.includes("evidenceLevel")) errors.push("Keeper library is not displaying evidence confidence.");
if (!library.includes("identificationWarning")) errors.push("Keeper library is not displaying identification warnings.");

if (errors.length) {
  console.error("\nTiny Titans Husbandry Safety validation FAILED:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Tiny Titans Husbandry Safety validation passed: routes, security, evidence states, source IDs and core Western Hognose seed coverage are present.");
