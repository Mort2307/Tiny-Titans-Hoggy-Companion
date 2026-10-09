import { readFileSync } from "node:fs";
function read(path) { return readFileSync(path, "utf8"); }
const checks = [
  ["account deletion callable is exported", read("functions/accountDeletion.js").includes("exports.deleteMyAccount = onCall")],
  ["external deletion request callable is exported", read("functions/accountDeletion.js").includes("exports.requestAccountDeletion = onCall")],
  ["recent authentication is required", read("functions/accountDeletion.js").includes("assertRecentAuth(request)")],
  ["Stripe subscription cancellation is attempted before deletion", read("functions/accountDeletion.js").indexOf("await cancelStripeSubscription(userData)") < read("functions/accountDeletion.js").indexOf("await adminAuth.deleteUser(uid)")],
  ["user Firestore document is recursively deleted", read("functions/accountDeletion.js").includes('db.recursiveDelete(db.collection("users").doc(uid))')],
  ["user storage prefixes are cleaned", read("functions/accountDeletion.js").includes("`users/${uid}/`") && read("functions/accountDeletion.js").includes("`snakePhotos/${uid}/`")],
  ["rescue-owner safeguard exists", read("functions/accountDeletion.js").includes("Transfer ownership of your Rescue Centre organisation")],
  ["sandbox data is cleaned", read("functions/accountDeletion.js").includes('deleteMatchingDocs("sandboxExperiments", "ownerUid", uid)') && read("functions/accountDeletion.js").includes('deleteMatchingDocs("testerSandboxes", "ownerUid", uid)')],
  ["shared mentorship participants are scrubbed", read("functions/accountDeletion.js").includes("removeMentorshipParticipant(uid)")],
  ["variation proposal records are cleaned", read("functions/accountDeletion.js").includes('deleteMatchingDocs("variationCardSubmissions", "userId", uid)')],
  ["approved Morph Library media and credited files are removed", read("functions/accountDeletion.js").includes("deletePublishedMorphMedia(uid)") && read("functions/accountDeletion.js").includes('approvedMorphImages') && read("functions/accountDeletion.js").includes('sourceSubmissionId')],
  ["in-app Security control exists", read("src/pages/Security.tsx").includes("deleteMyAccount") && read("src/pages/Security.tsx").includes("DELETE")],
  ["external deletion route exists", read("src/routes/AppRouter.tsx").includes('path="/delete-account"')],
  ["public privacy route exists", read("src/routes/AppRouter.tsx").includes('path="/privacy"')],
  ["external request page uses deletion service", read("src/pages/DeleteAccountRequest.tsx").includes("requestAccountDeletion")],
];
const failures = checks.filter(([, pass]) => !pass);
console.table(checks.map(([check, pass]) => ({ check, status: pass ? "PASS" : "FAIL" })));
if (failures.length) { console.error(`ACCOUNT DELETION CONTRACT: FAILED (${failures.length} check(s))`); process.exitCode = 1; } else { console.log("ACCOUNT DELETION CONTRACT: PASSED"); }