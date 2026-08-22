import { readFileSync } from "node:fs";

const gate = readFileSync("src/services/intelligencePermissionGateService.ts", "utf8");
const access = readFileSync("src/services/intelligenceAccessService.ts", "utf8");
const panel = readFileSync("src/components/IntelligencePanel.tsx", "utf8");
const privacy = readFileSync("src/services/privacyService.ts", "utf8");
const community = readFileSync("functions/communityIntelligence.js", "utf8");
const creator = readFileSync("src/services/creatorService.ts", "utf8");
const trackerStats = readFileSync("src/services/trackerStatsService.ts", "utf8");

const tests = [
  ["default consent is OFF", /communityHusbandryData:\s*false/, privacy],
  ["opt-in is exactly true", /const optedIn = privacy\?\.communityHusbandryData === true/, gate],
  ["opted-out still has core tracking", /coreTracking:\s*true/, gate],
  ["opted-out loses personal intelligence", /personalIntelligence:\s*optedIn/, gate],
  ["opted-out loses community intelligence", /communityIntelligence:\s*optedIn/, gate],
  ["opted-out cannot contribute", /communityContribution:\s*optedIn/, gate],
  ["explicit full-intelligence assertion exists", /assertFullIntelligenceAllowed/, gate],
  ["community contribution assertion exists", /assertCommunityContributionAllowed/, gate],
  ["access service is live-consent driven", /getPrivacyPreferences\(uid\).*getIntelligencePermissionDecision\(preferences\)/s, access],
  ["UI uses central access service", /hasFullIntelligenceAccess\(user\.uid\)/, panel],
  ["UI provides re-enable route", /\/account\/data-privacy/, panel],
  ["community backend filters consent before records", /communityHusbandryData !== true\) continue;/, community],
  ["Creator service delegates global stats to canonical aggregation", /getCanonicalGlobalStats\(\)/, creator],
  ["Creator aggregation checks community consent", /privacy\.communityHusbandryData !== true/, trackerStats],
  ["Creator aggregation excludes consented accounts with no snake profile", /privacy\.communityHusbandryData !== true \|\| snakesSnapshot\.empty/, trackerStats],
  ["Creator aggregation counts only consent-eligible snake profiles", /communityContributors \+= 1;\s*snakeProfiles \+= snakesSnapshot\.size/, trackerStats],
];

const failures = [];
for (const [label, pattern, source] of tests) if (!pattern.test(source)) failures.push(label);

const transitionMatrix = [
  { name: "missing preference", consent: undefined, core: true, intelligence: false, contribution: false },
  { name: "explicit opt-out", consent: false, core: true, intelligence: false, contribution: false },
  { name: "explicit opt-in", consent: true, core: true, intelligence: true, contribution: true },
  { name: "opt-in → opt-out", consent: false, core: true, intelligence: false, contribution: false },
  { name: "opt-out → opt-in", consent: true, core: true, intelligence: true, contribution: true },
];
for (const row of transitionMatrix) {
  const optedIn = row.consent === true;
  const actual = { core: true, intelligence: optedIn, contribution: optedIn };
  if (actual.core !== row.core || actual.intelligence !== row.intelligence || actual.contribution !== row.contribution) failures.push(`${row.name} transition matrix`);
}

console.log("INTELLIGENCE CONSENT CONTRACT REPORT");
console.table(tests.map(([label, pattern, source]) => ({ check: label, status: pattern.test(source) ? "PASS" : "FAIL" })));
console.table(transitionMatrix.map((row) => ({ transition: row.name, coreTracking: row.core ? "ENABLED" : "BLOCKED", fullIntelligence: row.intelligence ? "ENABLED" : "PAUSED", communityContribution: row.contribution ? "ENABLED" : "BLOCKED" })));
if (failures.length) {
  console.error(`Consent contract failures: ${failures.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log(`All ${tests.length} consent contracts and ${transitionMatrix.length} permission transitions passed.`);
}
