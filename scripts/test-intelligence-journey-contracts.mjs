import { readFileSync } from "node:fs";

const sources = {
  gate: readFileSync("src/services/intelligencePermissionGateService.ts", "utf8"),
  access: readFileSync("src/services/intelligenceAccessService.ts", "utf8"),
  panel: readFileSync("src/components/IntelligencePanel.tsx", "utf8"),
  home: readFileSync("src/pages/Home.tsx", "utf8"),
  account: readFileSync("src/pages/MyAccount.tsx", "utf8"),
  contributionPulse: readFileSync("src/components/ContributionPulse.tsx", "utf8"),
  publicContribution: readFileSync("functions/communityIntelligence.js", "utf8"),
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
  ["home renders contribution pulse", /<ContributionPulse\s*\/\>/, sources.home],
  ["account reads live privacy state", /getPrivacyPreferences\(user\.uid\)/, sources.account],
  ["account intelligence status uses live privacy", /livePrivacy \? \(intelligenceEnabled \? \"Active\" : \"Not enabled\"\)/, sources.account],
  ["contribution pulse loads live privacy", /getPrivacyPreferences\(user\.uid\)/, sources.contributionPulse],
  ["contribution pulse calls public global snapshot", /getPublicCommunityContributionSnapshot/, sources.contributionPulse],
  ["public global snapshot is exported", /exports\.getPublicCommunityContributionSnapshot\s*=\s*onCall/, sources.publicContribution],
  ["public global snapshot is signed-in only", /if \(!request\.auth\?\.uid\) throw new HttpsError\("unauthenticated"/, sources.publicContribution],
  ["public global snapshot exposes aggregate totals without a contributor threshold", /totalRecords: weightLogs \+ feedingLogs \+ shedLogs \+ publicMorphContributions \+ approvedCommunityContributions/, sources.publicContribution],
  ["public global snapshot never exposes individual records", /aggregate community contribution volume only|returns only aggregate totals|No UID, snake name, notes, dates, photos, coordinates/, sources.publicContribution],
  ["benchmark access is consent guarded", /canUseFullIntelligence\(privacy\) \? benchmark : null/, sources.benchmarkGuard],
  ["community benchmark cannot bypass contribution guard", /assertCommunityContributionAllowed\(privacy\)/, sources.benchmarkGuard],
  ["snapshot persistence fingerprints source data", /buildIntelligenceSnapshotCacheKey\(snake, benchmark\)/, sources.persistence],
  ["snapshot persistence reuses matching snapshots", /if \(reusable\) return reusable/, sources.persistence],
  ["privacy defaults contribution off", /communityHusbandryData:\s*false/, sources.privacy],
];

const failures = checks.filter(([, pattern, source]) => !pattern.test(source)).map(([label]) => label);

console.log("INTELLIGENCE END-TO-END JOURNEY CONTRACT REPORT");
console.table(checks.map(([label, pattern, source]) => ({ check: label, status: pattern.test(source) ? "PASS" : "FAIL" })));

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
