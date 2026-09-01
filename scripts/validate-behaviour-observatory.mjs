import { readFileSync, existsSync } from "node:fs";

const requiredFiles = [
  "src/pages/BehaviourObservatory.tsx",
  "src/pages/CreatorObservationReview.tsx",
  "src/services/keeperObservationService.ts",
  "src/types/keeperObservation.ts",
  "src/styles/behaviour-observatory.css",
];
for (const file of requiredFiles) if (!existsSync(file)) throw new Error(`Missing observatory file: ${file}`);

const page = readFileSync("src/pages/BehaviourObservatory.tsx", "utf8");
const service = readFileSync("src/services/keeperObservationService.ts", "utf8");
const firestore = readFileSync("firestore.rules", "utf8");
const storage = readFileSync("storage.rules", "utf8");
const router = readFileSync("src/routes/AppRouter.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const checks = [
  ["route", router.includes("/behaviour-observatory")],
  ["creator review route", router.includes("/creator/observations")],
  ["resumable upload", service.includes("uploadBytesResumable")],
  ["media validation", service.includes("MAX_OBSERVATION_MEDIA_BYTES") && service.includes("MAX_OBSERVATION_MEDIA_ITEMS")],
  ["educational consent", page.includes("educationalConsent") && service.includes("Educational use permission")],
  ["pending review", service.includes('status: \"pending\"')],
  ["behaviour is not diagnosis", page.includes("Behaviour ≠ diagnosis")],
  ["community review state", firestore.includes("match /keeperObservations/{observationId}") && firestore.includes('resource.data.status == "approved"')],
  ["storage type/size rules", storage.includes("request.resource.size <= 100 * 1024 * 1024") && storage.includes("request.resource.contentType")],
  ["build contract registered", packageJson.scripts?.["validate:observatory"] === "node scripts/validate-behaviour-observatory.mjs"],
];

console.table(checks.map(([name, pass]) => ({ check: name, status: pass ? "PASS" : "FAIL" })));
const failed = checks.filter(([, pass]) => !pass);
if (failed.length) throw new Error(`${failed.length} behaviour observatory contract check(s) failed.`);
console.log(`Behaviour Observatory contracts: ${checks.length}/${checks.length} PASS`);
