import fs from "node:fs";
const backend = fs.readFileSync("functions/serviceDirectory.js", "utf8");
const service = fs.readFileSync("src/services/serviceDirectoryService.ts", "utf8");
const page = fs.readFileSync("src/pages/ServiceDirectory.tsx", "utf8");
const creator = fs.readFileSync("src/pages/CreatorServiceDirectory.tsx", "utf8");
const routes = fs.readFileSync("src/routes/AuthenticatedRoutes.tsx", "utf8");
const index = fs.readFileSync("functions/index.js", "utf8");
const checks = [
  ["directory backend is exported", index.includes('require("./serviceDirectory")')],
  ["public records are Creator reviewed", backend.includes('status: "verified"') && backend.includes('verificationMethod: "creator_review"')],
  ["submissions never auto-publish", backend.includes('status: "pending"') && backend.includes("reviewServiceDirectorySubmission")],
  ["moderation requires privileged claim", backend.includes('token?.creator !== true') && backend.includes('token?.admin !== true')],
  ["directory does not depend on paid places APIs", !backend.includes("googleapis") && !backend.includes("places.googleapis.com") && !service.includes("Google Places")],
  ["duplicate submissions are checked", backend.includes("duplicateKey") && backend.includes('"already-exists"')],
  ["submission spam is bounded", backend.includes("MAX_PENDING_PER_USER")],
  ["service categories are specialist", backend.includes('"exotics_vet"') && backend.includes('"rescue"') && backend.includes('"reptile_shop"')],
  ["keeper directory route exists", routes.includes('path="/services"') && page.includes("Exotic Services Directory")],
  ["creator review route exists", routes.includes('path="/creator/services"') && creator.includes("Service submissions")],
];
let failed = 0;
for (const [label, pass] of checks) { console.log((pass ? "PASS" : "FAIL") + " " + label); if (!pass) failed += 1; }
if (failed) { console.error("Service Directory contract failed with " + failed + " issue(s)."); process.exit(1); }
console.log("Service Directory contract: PASS");
