import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config", "integration-cost-policy.json");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const integrationBackend = fs.readFileSync(path.join(root, "functions", "integrationHub.js"), "utf8");

const failures = [];
const assert = (pass, message) => { if (!pass) failures.push(message); };

assert(policy.mode === "zero-cost-optional-integrations", "Integration policy mode must remain zero-cost-optional-integrations.");
assert(policy.optionalThirdPartyBudgetGbpMonthly === 0, "Optional third-party integration budget must remain £0.");
assert(Array.isArray(policy.allowedOptionalProviders) && policy.allowedOptionalProviders.length > 0, "Allowed provider registry is required.");

const allowedIds = new Set(policy.allowedOptionalProviders.map((provider) => provider.id));
const providerBlockMatch = integrationBackend.match(/providers:\s*\[([\s\S]*?)\]\s*,?\s*\};/);
assert(Boolean(providerBlockMatch), "Integration Hub provider registry could not be located.");
if (providerBlockMatch) {
  const ids = [...providerBlockMatch[1].matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
  for (const id of ids) assert(allowedIds.has(id), `Integration Hub provider "${id}" is not approved by config/integration-cost-policy.json.`);
  assert(!/cost:\s*"(?!free")[^"]+"/.test(providerBlockMatch[1]), "Every optional Integration Hub provider must remain cost=free.");
}

const guardedFiles = [
  "functions/integrationHub.js",
  "functions/iNaturalistEcology.js",
  "functions/serviceDirectory.js",
  "functions/communityLocations.js",
  "src/services/integrationHubService.ts",
  "src/services/iNaturalistEcologyService.ts",
  "src/services/serviceDirectoryService.ts",
  "src/services/communityLocationResolver.ts",
].filter((relative) => fs.existsSync(path.join(root, relative)));

const forbiddenSignatures = [
  ["places.googleapis.com", "Google Places paid API"],
  ["maps.googleapis.com/maps/api", "Google Maps paid usage API"],
  ["api.mapbox.com", "Mapbox metered API"],
  ["api.twilio.com", "Twilio usage-priced API"],
  ["api.sendgrid.com", "SendGrid optional SaaS API"],
  ["api.mailgun.net", "Mailgun optional SaaS API"],
  ["api.weatherapi.com", "WeatherAPI paid/metered service"],
  ["api.openweathermap.org", "OpenWeather metered service"],
  ["hooks.zapier.com", "Zapier paid automation dependency"],
  ["hook.eu1.make.com", "Make paid automation dependency"],
  ["hook.us1.make.com", "Make paid automation dependency"],
];

for (const relative of guardedFiles) {
  const source = fs.readFileSync(path.join(root, relative), "utf8").toLowerCase();
  for (const [signature, label] of forbiddenSignatures) {
    if (source.includes(signature.toLowerCase())) failures.push(`${relative} contains ${label} (${signature}); this violates the £0 optional-integration policy.`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const runtimePackages = { ...(packageJson.dependencies || {}) };
const forbiddenPackages = [
  "@googlemaps/google-maps-services-js",
  "@mapbox/mapbox-sdk",
  "twilio",
  "@sendgrid/mail",
  "mailgun.js",
  "zapier-platform-core",
];
for (const dependency of forbiddenPackages) {
  assert(!runtimePackages[dependency], `Runtime dependency ${dependency} is not allowed under the £0 optional-integration policy.`);
}

// Stripe is intentionally not forbidden: payment processing is a transaction cost that only
// occurs when Tiny Titans receives money, and it is not an optional Integration Hub provider.
assert(!providerBlockMatch || !/id:\s*"stripe"/.test(providerBlockMatch[1]), "Stripe must not be exposed as an optional Integration Hub provider.");

if (failures.length) {
  console.error("\nTiny Titans zero-cost integration policy FAILED:\n");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("Tiny Titans zero-cost integration policy: PASS");
console.log(`Approved optional providers: ${policy.allowedOptionalProviders.map((provider) => provider.id).join(", ")}`);
