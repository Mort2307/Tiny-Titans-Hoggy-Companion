import { readFileSync } from 'node:fs';
const firestore = readFileSync('firestore.rules', 'utf8');
const storage = readFileSync('storage.rules', 'utf8');
const permissionGate = readFileSync('src/services/intelligencePermissionGateService.ts', 'utf8');
const accessService = readFileSync('src/services/intelligenceAccessService.ts', 'utf8');
const privacy = readFileSync('src/services/privacyService.ts', 'utf8');
const communityIntelligence = readFileSync('functions/communityIntelligence.js', 'utf8');
const communityComments = readFileSync('functions/communityComments.js', 'utf8');
const publicContributions = readFileSync('functions/publicContributions.js', 'utf8');
const communityLocations = readFileSync('functions/communityLocations.js', 'utf8');
const trackerStats = readFileSync('src/services/trackerStatsService.ts', 'utf8');
const feedback = readFileSync('functions/intelligenceFeedback.js', 'utf8');
const security = [
  ['Firestore rules are version 2', /rules_version\s*=\s*'2'/, firestore],
  ['Firestore has deny-by-default fallback', /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/, firestore],
  ['Tester sandboxes require syntheticOnly', /request\.resource\.data\.syntheticOnly\s*==\s*true/, firestore],
  ['Tester sandboxes require bot-test purpose', /request\.resource\.data\.purpose\s*==\s*"bot-test"/, firestore],
  ['Tester sandbox writes remain owner-bound', /resource\.data\.ownerUid\s*==\s*request\.auth\.uid/, firestore],
  ['User role cannot be changed by the user', /request\.resource\.data\.role\s*==\s*resource\.data\.role/, firestore],
  ['Family membership access is scoped', /familyMemberOf\(userId\)/, firestore],
  ['Family membership is capped at three accounts', /request\.resource\.data\.memberUids\.size\(\) <= 3/, firestore],
  ['Family invitations are owner-bound', /request\.resource\.data\.ownerUid == request\.auth\.uid/, firestore],
  ['Family invite acceptance is email-bound', /request\.resource\.data\.get\('acceptingInviteId'/, firestore],
  ['Family permissions are enforced in Firestore', /function familyPermission\(userId, area, action\)/, firestore],
  ['Sandbox experiments are isolated from user records', /match \/sandboxExperiments\/\{experimentId\}/, firestore],
  ['Storage user snake files are owner-bound', /request\.auth\.uid\s*==\s*userId/, storage],
  ['Storage morph community writes require creator', /allow write: if isCreator\(\);/, storage],
  ['Intelligence gate keeps core tracking enabled', /coreTracking:\s*true/, permissionGate],
  ['Personal Intelligence is independent', /personalIntelligence = permissionFlag\(privacy, "personalIntelligence"/, permissionGate],
  ['Community contribution is independent', /communityContribution = permissionFlag\(privacy, "communityContribution"/, permissionGate],
  ['Community Intelligence is independent', /communityIntelligence = permissionFlag\(privacy, "communityIntelligence"/, permissionGate],
  ['Community messaging is independent', /communityMessaging = permissionFlag\(privacy, "communityMessaging"/, permissionGate],
  ['Access service reads central permission decision', /getIntelligencePermissionDecision\(preferences\)/, accessService],
  ['Community intelligence backend requires contribution consent', /hasCommunityConsent\(privacy\)/, communityIntelligence],
  ['Creator aggregation requires current contribution permission', /privacy\.communityContribution !== true/, trackerStats],
  ['Public Community Intelligence requires caller permission', /privacy\.communityIntelligence !== true.*community-intelligence-disabled/s, publicContributions],
  ['Comment reads enforce post audience access', /canReadAudience\(request, audience\)/, communityComments],
  ['Comment creation requires messaging consent', /assertMessagingConsent\(request\.auth\.uid\)/, communityComments],
  ['Comment creation is rate limited', /enforceRateLimit\(request\.auth\.uid, 'comment'/, communityComments],
  ['Comment reports are rate limited', /enforceRateLimit\(request\.auth\.uid, 'report'/, communityComments],
  ['Moderation is claims-authoritative', /function isCreator\(request\).*claims\.admin === true \|\| claims\.creator === true/s, communityComments],
  ['Location rebuild is claims-authoritative', /if\(\!\(claims\.admin===true\|\|claims\.creator===true\|\|claims\.superAdmin===true\)\)throw/, communityLocations],
  ['Intelligence feedback is authenticated', /request\.auth\?\.uid/, feedback],
  ['Intelligence feedback is deduplicated per user/insight', /feedbackDocId\(request\.auth\.uid, insightId\)/, feedback],
  ['Feedback signals are aggregate-only', /positive.*negative/, feedback],
  ['Privacy writes preserve omitted permissions', /const current = await getPrivacyPreferences\(uid\)/, privacy],
];
const failures = [];
for (const [label, pattern, source] of security) if (!pattern.test(source)) failures.push(label);
console.log('SECURITY CONTRACT REPORT');
console.table(security.map(([label, pattern, source]) => ({ check: label, status: pattern.test(source) ? 'PASS' : 'FAIL' })));
if (failures.length) { console.error(`Security contract failures: ${failures.join('; ')}`); process.exitCode = 1; }
else console.log(`All ${security.length} static security contracts passed.`);
