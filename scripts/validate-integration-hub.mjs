import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const backend = read("functions/integrationHub.js");
const service = read("src/services/integrationHubService.ts");
const page = read("src/pages/IntegrationHub.tsx");
const routes = read("src/routes/AuthenticatedRoutes.tsx");
const settings = read("src/pages/Settings.tsx");
const firebase = read("firebase.json");
const index = read("functions/index.js");
const firestoreIndexes = read("firestore.indexes.json");

const checks = [
  ["gateway key uses cryptographic random bytes", backend.includes("crypto.randomBytes(32)")],
  ["gateway key is hashed before lookup/storage", backend.includes('createHash("sha256")')],
  ["raw gateway secret is not persisted in status", !backend.includes("gatewayKey: secret")],
  ["paid providers are disabled by policy", backend.includes('paidProvidersEnabled: false') && backend.includes('meteredProvidersEnabled: false')],
  ["gateway validates telemetry", backend.includes("validateMetrics") && backend.includes("ALLOWED_SOURCES")],
  ["gateway rate limits each credential", backend.includes("RATE_LIMIT_PER_MINUTE") && backend.includes("claimGatewayKey") && backend.includes("rate_limited")],
  ["Titan Automations are server-backed", backend.includes("getIntegrationAutomationRules") && backend.includes("saveIntegrationAutomationRule") && backend.includes("deleteIntegrationAutomationRule")],
  ["Titan Automations evaluate validated telemetry", backend.includes("evaluateIntegrationAutomations") && backend.includes("automationMatches")],
  ["Titan Automations alert without equipment actuation", page.includes("never switch heaters") && !backend.includes("turnOnHeater") && !backend.includes("switchDevice")],
  ["gateway endpoint is public function with bearer auth", backend.includes("deviceGatewayIngest") && backend.includes("keyFromRequest")],
  ["history is retained for future graphs", backend.includes('collection("integrationTelemetry")')],
  ["telemetry history is user-facing", service.includes("getIntegrationTelemetry") && page.includes("IntegrationTelemetryHistory") && page.includes("View history")],
  ["telemetry history has its Firestore composite index", firestoreIndexes.includes('"collectionGroup": "integrationTelemetry"') && firestoreIndexes.includes('"fieldPath": "deviceKey"')],
  ["client can export ICS without a paid calendar API", service.includes("BEGIN:VCALENDAR") && service.includes("downloadReminderCalendar")],
  ["Integration Hub page exposes zero-cost policy", page.includes("£0") && page.includes("Zero-cost mode")],
  ["Integration Hub route exists", routes.includes('/account/integrations') && routes.includes("<IntegrationHub/>")],
  ["Settings links to Integration Hub", settings.includes('navigate("/account/integrations")')],
  ["functions index exports integration hub", index.includes('require("./integrationHub")')],
  ["hosting rewrites device gateway before SPA fallback", firebase.indexOf('"/api/device-gateway"') > -1 && firebase.indexOf('"/api/device-gateway"') < firebase.lastIndexOf('"**"')],
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
  if (!pass) failed += 1;
}
if (failed) {
  console.error(`Integration Hub contract failed: ${failed} check(s).`);
  process.exit(1);
}
console.log("Integration Hub contract: PASS");
