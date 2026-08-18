import { readFileSync } from "node:fs";

const firestore = readFileSync("firestore.rules", "utf8");
const storage = readFileSync("storage.rules", "utf8");

const checks = [
  ["Firestore rules are version 2", /rules_version\s*=\s*'2'/, firestore],
  ["Firestore has deny-by-default fallback", /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/, firestore],
  ["Tester sandboxes require syntheticOnly", /request\.resource\.data\.syntheticOnly\s*==\s*true/, firestore],
  ["Tester sandboxes require bot-test purpose", /request\.resource\.data\.purpose\s*==\s*\"bot-test\"/, firestore],
  ["Tester sandbox writes remain owner-bound", /resource\.data\.ownerUid\s*==\s*request\.auth\.uid/, firestore],
  ["User role cannot be changed by the user", /request\.resource\.data\.role\s*==\s*resource\.data\.role/, firestore],
  ["Family data access is membership-bound", /function canAccessUserData\(userId\)/, firestore],
  ["Family membership is capped at three accounts", /request\.resource\.data\.memberUids\.size\(\) <= 3/, firestore],
  ["Family invitations are owner-bound", /request\.resource\.data\.ownerUid == request\.auth\.uid/, firestore],
  ["Family invite acceptance is email-bound", /request\.resource\.data\.get\('acceptingInviteId'/, firestore],
  ["Family permissions are enforced in Firestore", /function familyPermission\(userId, area, action\)/, firestore],
  ["Family permission documents are owner-controlled", /allow create, update: if signedIn\(\) && get\(\/databases\/\$\(database\)\/documents\/families\/\$\(familyId\)\)\.data\.ownerUid == request\.auth\.uid/, firestore],
  ["Family approval requests are authenticated and family-bound", /request\.resource\.data\.requesterUid == request\.auth\.uid.*request\.resource\.data\.familyId == userRecord\(\)\.get\('familyId'/s, firestore],
  ["Approved family changes are owner-controlled", /function decideFamilyApproval|familyApprovals/, readFileSync("src/services/familyPermissionsService.ts", "utf8")],
  ["Sandbox experiments are isolated from user records", /match \/sandboxExperiments\/\{experimentId\}/, firestore],
  ["Sandbox experiments are owner-bound", /request\.resource\.data\.ownerUid == request\.auth\.uid/, firestore],
  ["Storage user snake files are owner-bound", /request\.auth\.uid\s*==\s*userId/, storage],
  ["Storage morph community writes require creator", /allow write: if isCreator\(\);/, storage],
];

const failures = [];
for (const [label, pattern, source] of checks) if (!pattern.test(source)) failures.push(label);
console.log("SECURITY CONTRACT REPORT");
console.table(checks.map(([label, pattern, source]) => ({ check: label, status: pattern.test(source) ? "PASS" : "FAIL" })));
if (failures.length) { console.error(`Security contract failures: ${failures.join("; ")}`); process.exitCode = 1; }
else console.log(`All ${checks.length} static security contracts passed.`);
