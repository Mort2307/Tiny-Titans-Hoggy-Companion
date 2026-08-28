import { readFileSync } from "node:fs";

const sources = {
  gate: readFileSync("src/services/intelligencePermissionGateService.ts", "utf8"),
  access: readFileSync("src/services/intelligenceAccessService.ts", "utf8"),
  panel: readFileSync("src/components/IntelligencePanel.tsx", "utf8"),
  home: readFileSync("src/pages/Home.tsx", "utf8"),
  benchmarkGuard: readFileSync("src/services/intelligenceBenchmarkGuardService.ts", "utf8"),
  persistence: readFileSync("src/services/intelligenceSnapshotPersistenceService.ts", "utf8"),
  privacy: readFileSync("src/services/privacyService.ts", "utf8"),
};

const checks = [
  ["core tracking is always enabled", /coreTracking:\s*true/, sources.gate],
  ["basic keeper tracking is always enabled", /basicTracking:\s*true/, sources.gate],
  ["full intelligence follows live consent", /personalIntelligence:\s*optedIn/, sources.gate],
  ["community contribution follows live consent", /communityContribution:\s*optedIn/, sources.gate],
  ["community intelligence follows live consent", /communityIntelligence:\s*optedIn/, sources.gate],
  ["access reads current privacy preferences", /getPrivacyPreferences\(uid\)/, sources.access],
  ["locked UI is shown without access", /if \(!fullAccess\)/, sources.panel],
  ["locked UI preserves core tracking message", /core tracking still works without optional sharing/, sources.panel],
  ["locked UI exposes privacy settings route", /\/account\/data-privacy/, sources.panel],
  ["home loads canonical keeper records before intelligence gating", /getUserSnakes\(user\.uid\)/, sources.home],
  ["home derives snapshot counts from tracker history", /weightHistory\?\.length|feedingHistory\?\.length|shedHistory\?\.length/, sources.home],
  ["home snapshot is not zeroed when intelligence is unavailable", /intelligenceAccess \? totalRecords : 0/, sources.home, true],
  ["home presents basic tracking when intelligence is off", /Basic Keeper Intelligence is active/, sources.home],
  ["benchmark access is consent guarded", /canUseFullIntelligence\(privacy\) \? benchmark : null/, sources.benchmarkGuard],
  ["community benchmark cannot bypass contribution guard", /assertCommunityContributionAllowed\(privacy\)/, sources.benchmarkGuard],
  ["snapshot persistence fingerprints source data", /buildIntelligenceSnapshotCacheKey\(snake, benchmark\)/, sources.persistence],
  ["snapshot persistence reuses matching snapshots", /if \(reusable\) return reusable/, sources.persistence],
  ["privacy defaults contribution off", /communityHusbandryData:\s*false/, sources.privacy],
];

const failures = checks.filter(([, pattern, source, inverted]) => inverted ? pattern.test(source) : !pattern.test(source)).map(([label]) => label);

console.log("INTELLIGENCE END-TO-END JOURNEY CONTRACT REPORT");
console.table(checks.map(([label, pattern, source, inverted]) => ({ check: label, status: (inverted ? !pattern.test(source) : pattern.test(source)) ? "PASS" : "FAIL" })));

const journey = [
  ["new/missing preference", "CORE TRACKING", "BASIC ONLY", "INTELLIGENCE PAUSED", "CONTRIBUTION BLOCKED"],
  ["opt-out", "CORE TRACKING", "BASIC ONLY", "INTELLIGENCE PAUSED", "CONTRIBUTION BLOCKED"],
  ["opt-in", "CORE TRACKING", "BASIC + INTELLIGENCE", "FULL INTELLIGENCE", "CONTRIBUTION ENABLED"],
  ["opt-in → opt-out", "CORE TRACKING", "BASIC ONLY", "INTELLIGENCE PAUSED", "CONTRIBUTION BLOCKED"],
  ["opt-out → opt-in", "CORE TRACKING", "BASIC + INTELLIGENCE", "FULL INTELLIGENCE", "CONTRIBUTION ENABLED"],
];
console.table(journey.map(([transition, tracking, basicMode, intelligence, contribution]) => ({ transition, tracking, basicMode, intelligence, contribution })));

if (failures.length) {
  console.error(`Journey contract failures: ${failures.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log(`All ${checks.length} journey contracts passed.`);
}
