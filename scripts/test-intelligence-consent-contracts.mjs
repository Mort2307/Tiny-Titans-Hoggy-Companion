import { readFileSync } from 'node:fs';
const gate = readFileSync('src/services/intelligencePermissionGateService.ts', 'utf8');
const access = readFileSync('src/services/intelligenceAccessService.ts', 'utf8');
const panel = readFileSync('src/components/IntelligencePanel.tsx', 'utf8');
const privacy = readFileSync('src/services/privacyService.ts', 'utf8');
const dataPrivacy = readFileSync('src/pages/DataPrivacy.tsx', 'utf8');
const community = readFileSync('functions/communityIntelligence.js', 'utf8');
const creator = readFileSync('src/services/creatorService.ts', 'utf8');
const trackerStats = readFileSync('src/services/trackerStatsService.ts', 'utf8');

const tests = [
  ['default consent is OFF', /communityHusbandryData:\s*false/, privacy],
  ['personal Intelligence is independently permissioned', /const personalIntelligence = permissionFlag\(privacy, "personalIntelligence", legacy\)/, gate],
  ['community contribution is independently permissioned', /const communityContribution = permissionFlag\(privacy, "communityContribution", legacy\)/, gate],
  ['community Intelligence is independently permissioned', /const communityIntelligence = permissionFlag\(privacy, "communityIntelligence", legacy\)/, gate],
  ['community messaging is independently permissioned', /const communityMessaging = permissionFlag\(privacy, "communityMessaging", false\)/, gate],
  ['basic tracking is always enabled', /basicTracking:\s*true/, gate],
  ['core tracking is always enabled', /coreTracking:\s*true/, gate],
  ['full intelligence assertion exists', /assertFullIntelligenceAllowed/, gate],
  ['community contribution assertion exists', /assertCommunityContributionAllowed/, gate],
  ['community messaging assertion exists', /assertCommunityMessagingAllowed/, gate],
  ['access service is live-consent driven', /getPrivacyPreferences\(uid\).*getIntelligencePermissionDecision\(preferences\)/s, access],
  ['UI uses central access service', /hasFullIntelligenceAccess\(user\.uid\)/, panel],
  ['UI provides re-enable route', /\/account\/data-privacy/, panel],
  ['privacy page exposes Personal Intelligence separately', /Personal Titan Intelligence/, dataPrivacy],
  ['privacy page exposes Community contribution separately', /Community Intelligence contribution/, dataPrivacy],
  ['privacy page exposes Community Intelligence separately', /Community Intelligence access/, dataPrivacy],
  ['privacy page exposes Community Messaging separately', /Community Messaging &amp; Comments/, dataPrivacy],
  ['community backend uses contribution consent', /hasCommunityConsent\(privacy\)/, community],
  ['Creator service delegates global stats to canonical aggregation', /getCanonicalGlobalStats\(\)/, creator],
  ['Creator aggregation checks current contribution permission', /privacy\.communityContribution !== true/, trackerStats],
];

const failures = [];
for (const [label, pattern, source] of tests) if (!pattern.test(source)) failures.push(label);

const transitionMatrix = [
  { name: 'missing preference', personal: false, contribution: false, community: false, messaging: false },
  { name: 'personal only', personal: true, contribution: false, community: false, messaging: false },
  { name: 'contribution only', personal: false, contribution: true, community: false, messaging: false },
  { name: 'community only', personal: false, contribution: false, community: true, messaging: false },
  { name: 'all intelligence + messaging', personal: true, contribution: true, community: true, messaging: true },
];
for (const row of transitionMatrix) {
  if (row.name === 'missing preference' && /legacy = privacy\?\.communityHusbandryData === true/.test(gate)) failures.push(`${row.name} still uses legacy master-switch gate`);
  if (row.personal && !/personalIntelligence/.test(gate)) failures.push(`${row.name} personal permission missing`);
}

console.log('INTELLIGENCE CONSENT CONTRACT REPORT');
console.table(tests.map(([label, pattern, source]) => ({ check: label, status: pattern.test(source) ? 'PASS' : 'FAIL' })));
console.table(transitionMatrix.map((row) => ({ transition: row.name, personalIntelligence: row.personal ? 'ENABLED' : 'OFF', communityContribution: row.contribution ? 'ENABLED' : 'OFF', communityIntelligence: row.community ? 'ENABLED' : 'OFF', communityMessaging: row.messaging ? 'ENABLED' : 'OFF', coreTracking: 'ENABLED', basicTracking: 'ENABLED' })));
if (failures.length) { console.error(`Consent contract failures: ${failures.join('; ')}`); process.exitCode = 1; }
else console.log(`All ${tests.length} consent contracts and ${transitionMatrix.length} permission states passed.`);
