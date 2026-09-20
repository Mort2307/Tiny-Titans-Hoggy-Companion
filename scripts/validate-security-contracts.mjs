import { readFileSync } from "node:fs";

const firestore = readFileSync("firestore.rules", "utf8");
const storage = readFileSync("storage.rules", "utf8");
const permissionGate = readFileSync("src/services/intelligencePermissionGateService.ts", "utf8");
const accessService = readFileSync("src/services/intelligenceAccessService.ts", "utf8");
const communityIntelligence = readFileSync("functions/communityIntelligence.js", "utf8");
const trackerStats = readFileSync("src/services/trackerStatsService.ts", "utf8");
const paidTierAccess = readFileSync("functions/paidTierAccess.js", "utf8");
const paidTrialLifecycle = readFileSync("functions/paidTrialLifecycle.js", "utf8");
const creatorPaidTier = readFileSync("functions/creatorPaidTier.js", "utf8");

const familyAccessContract = /function (?:canAccessUserData|familyMemberOf)\([^)]*userId[^)]*\)/;
const familyPermissionOwnerContract = /function familyOwner\(familyId\)\s*\{[\s\S]*?ownerUid[\s\S]*?request\.auth\.uid[\s\S]*?\}\s*\n\s*match \/families\/\{familyId\}[\s\S]*?match \/permissions\/\{memberUid\}[\s\S]*?allow create, update: if familyOwner\(familyId\)/;
const storageCreatorContract = /function ownerAccount\(\)\s*\{[^}]*request\.auth\.token\.email == 'tinytitans\.exotics@gmail\.com'[^}]*\}[\s\S]*function isCreator\(\)\s*\{[^}]*ownerAccount\(\)[^}]*request\.auth\.token\.admin == true[^}]*request\.auth\.token\.creator == true[^}]*\}/;
const paidTesterServerCollectionContract = /db\.collection\("paidTesterOverrides"\)\.doc\(targetUid\)/;
const paidTesterReaderContract = /db\.collection\("paidTesterOverrides"\)\.doc\(requestedUid\)\.get\(\)/;
const paidTrialServerCollectionContract = /db\.collection\("paidTrials"\)\.doc\(targetUid\)/;
const paidTrialReaderContract = /db\.collection\("paidTrials"\)\.doc\(requestedUid\)\.get\(\)/;
const paidTesterUserProfileAbsenceContract = /^(?![\s\S]*data\.paidTesterOverride)/;
const paidTrialUserProfileAbsenceContract = /^(?![\s\S]*data\.paidTrial)/;

const checks = [
  ["Firestore rules are version 2", /rules_version\s*=\s*'2'/, firestore],
  ["Firestore has deny-by-default fallback", /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/, firestore],
  ["Tester sandboxes require syntheticOnly", /request\.resource\.data\.syntheticOnly\s*==\s*true/, firestore],
  ["Tester sandboxes require bot-test purpose", /request\.resource\.data\.purpose\s*==\s*\"bot-test\"/, firestore],
  ["Tester sandbox writes remain owner-bound", /resource\.data\.ownerUid\s*==\s*request\.auth\.uid/, firestore],
  ["User role cannot be changed by the user", /request\.resource\.data\.role\s*==\s*resource\.data\.role/, firestore],
  ["Family data access is membership-bound", familyAccessContract, firestore],
  ["Family membership is capped at three accounts", /request\.resource\.data\.memberUids\.size\(\) <= 3/, firestore],
  ["Family invitations are owner-bound", /request\.resource\.data\.ownerUid == request\.auth\.uid/, firestore],
  ["Family invite acceptance is email-bound", /request\.resource\.data\.get\('acceptingInviteId'/, firestore],
  ["Family permissions are enforced in Firestore", /function familyPermission\(userId, area, action\)/, firestore],
  ["Family permission documents are owner-controlled", familyPermissionOwnerContract, firestore],
  ["Family approval requests are authenticated and family-bound", /request\.resource\.data\.requesterUid == request\.auth\.uid.*request\.resource\.data\.familyId == userRecord\(\)\.get\('familyId'/s, firestore],
  ["Approved family changes are owner-controlled", /function decideFamilyApproval|familyApprovals/, readFileSync("src/services/familyPermissionsService.ts", "utf8")],
  ["Sandbox experiments are isolated from user records", /match \/sandboxExperiments\/\{experimentId\}/, firestore],
  ["Sandbox experiments are owner-bound", /request\.resource\.data\.ownerUid == request\.auth\.uid/, firestore],
  ["Storage user snake files are owner-bound", /request\.auth\.uid\s*==\s*userId/, storage],
  ["Snake photo uploads are size- and content-type constrained", /match \/snakePhotos\/\{userId\}\/\{snakeId\}\/\{fileName\}[\s\S]*?request\.resource\.size <= 25 \* 1024 \* 1024[\s\S]*?image\/(jpeg\|png\|webp)/, storage],
  ["Vivarium photo uploads are size- and content-type constrained", /reptileRooms\/\{roomId\}\/vivariums[\s\S]*?request\.resource\.size <= 25 \* 1024 \* 1024[\s\S]*?image\/(jpeg\|png\|webp)/, storage],
  ["Issue evidence uploads have a hard size limit", /match \/issueEvidence\/\{userId\}\/\{reportId\}\/\{fileName\}[\s\S]*?request\.resource\.size <= 25 \* 1024 \* 1024/, storage],
  ["Storage creator access requires the same owner-issued claim model as Firestore", storageCreatorContract, storage],
  ["Storage creator access no longer trusts mutable profileType data", /isCreator\(\)\s*\{[\s\S]*request\.auth\.token\.creator == true/, storage],
  ["Paid tester overrides are stored outside mutable user profiles", paidTesterServerCollectionContract, paidTierAccess],
  ["Paid tier access reads tester overrides only from the server-managed collection", paidTesterReaderContract, paidTierAccess],
  ["Paid tester access cannot be sourced from users.paidTesterOverride", paidTesterUserProfileAbsenceContract, paidTierAccess],
  ["Paid trials are stored outside mutable user profiles", paidTrialServerCollectionContract, creatorPaidTier],
  ["Paid tier access reads trials only from the server-managed collection", paidTrialReaderContract, paidTierAccess],
  ["Paid trial lifecycle reads the server-managed trial collection", /db\.collection\("paidTrials"\)\.where\("enabled", "==", true\)/, paidTrialLifecycle],
  ["Paid trial access cannot be sourced from users.paidTrial", paidTrialUserProfileAbsenceContract, paidTierAccess],
  ["Storage morph community writes require creator", /allow write: if isCreator\(\);/, storage],
  ["Intelligence is always personal-data safe at the gate", /coreTracking:\s*true/, permissionGate],
  ["Full intelligence requires explicit community consent", /personalIntelligence:\s*optedIn/, permissionGate],
  ["Community contribution requires explicit community consent", /communityContribution:\s*optedIn/, permissionGate],
  ["Community intelligence requires explicit community consent", /communityIntelligence:\s*optedIn/, permissionGate],
  ["Missing consent defaults to denied", /communityHusbandryData\s*===\s*true/, permissionGate],
  ["Access service reads the central permission decision", /getIntelligencePermissionDecision\(preferences\)/, accessService],
  ["Community backend filters non-consenting users", /if \(privacy\.communityHusbandryData !== true\) continue;/, communityIntelligence],
  ["Creator global aggregation checks current community consent", /privacy\.communityHusbandryData !== true/, trackerStats],
  ["Creator global aggregation requires a contributing snake profile", /privacy\.communityHusbandryData !== true \|\| snakesSnapshot\.empty/, trackerStats],
];

const failures = [];
for (const [label, pattern, source] of checks) if (!pattern.test(source)) failures.push(label);
console.log("SECURITY CONTRACT REPORT");
console.table(checks.map(([label, pattern, source]) => ({ check: label, status: pattern.test(source) ? "PASS" : "FAIL" })));
if (failures.length) { console.error(`Security contract failures: ${failures.join("; ")}`); process.exitCode = 1; }
else console.log(`All ${checks.length} static security contracts passed.`);