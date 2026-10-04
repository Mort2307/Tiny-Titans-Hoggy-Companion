import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const backend = read("functions/keeperServices.js");
const service = read("src/services/keeperServicesService.ts");
const index = read("functions/index.js");
const routes = read("src/routes/AuthenticatedRoutes.tsx");
const settings = read("src/pages/Settings.tsx");
const creator = read("src/pages/CreatorOperationsHub.tsx");

const checks = [
  ["services use free Open-Meteo geocoding", backend.includes("geocoding-api.open-meteo.com") && backend.includes("open-meteo-geocoding")],
  ["published directory is callable-backed", backend.includes("listKeeperServices") && service.includes("listKeeperServices")],
  ["submissions are authenticated and rate bounded", backend.includes("requireAuth(request)") && backend.includes("MAX_PENDING_PER_USER")],
  ["professional claims are not silently inferred", backend.includes("professionalRegistration") && backend.includes("creator-reviewed-listing")],
  ["Creator review gates publication", backend.includes("requireCreator(request)") && backend.includes("reviewKeeperServiceSubmission") && backend.includes('status: "approved"')],
  ["review actions are audited", backend.includes('collection("keeperServiceAudit")')],
  ["submitter identity is absent from public projection", !backend.slice(backend.indexOf("function publicService"), backend.indexOf("function creatorSubmission")).includes("submittedByUid")],
  ["keeper service functions are exported", index.includes('require("./keeperServices")')],
  ["keeper services route exists", routes.includes('path="/services"') && routes.includes("<KeeperServicesDirectory/>")],
  ["creator review route exists", routes.includes('path="/creator/services"') && routes.includes("<CreatorKeeperServices/>")],
  ["Settings exposes service discovery", settings.includes('navigate("/services")')],
  ["Creator Centre exposes service review", creator.includes('"/creator/services"')],
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
  if (!pass) failed += 1;
}
if (failed) {
  console.error(`Keeper Services contract failed: ${failed} check(s).`);
  process.exit(1);
}
console.log("Keeper Services contract: PASS");
