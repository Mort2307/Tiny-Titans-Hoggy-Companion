import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["functions/index.js exports keeper scheduler", /sendAllKeeperReminderNotifications\s*=\s*familyNotifications\.sendAllKeeperReminderNotifications/],
  ["functions/index.js exports equipment scheduler", /sendEquipmentReplacementNotifications\s*=\s*equipmentNotifications\.sendEquipmentReplacementNotifications/],
  ["functions/index.js registers Community Hub notifications", /Object\.assign\(exports, require\("\.\/communityNotifications"\)\)/],
  ["Community Hub notification trigger exists", /onDocumentCreated\(\{ region: "europe-west2", document: "communityPosts\/{postId}" \}/],
  ["Community Hub notification audience routing exists", /eligibleUserUids\(audience\)/],
  ["Community Hub release notifications exist", /category === "release"/],
  ["Community Hub update notifications exist", /category === "update"/],
  ["Creator bug notification trigger exists", /document: "issueReports\/{reportId}"/],
  ["Creator bug notification includes error detail", /Error:\s*\$\{description\}/],
  ["Creator feedback notification trigger exists", /document: "feedback\/{submissionId}"/],
  ["Creator morph image notification trigger exists", /document: "morphImageSubmissions\/{submissionId}"/],
  ["Creator morph terminology notification trigger exists", /document: "users\/{userId}\/morphSubmissions\/{submissionId}"/],
  ["Creator behaviour notification trigger exists", /document: "keeperObservations\/{observationId}"/],
  ["Creator mentor notification trigger exists", /document: "mentorApplications\/{applicationId}"/],
  ["Creator founder notification trigger exists", /document: "founderApplications\/{applicationId}"/],
  ["Creator community contribution notification trigger exists", /document: "communityContent\/{contentId}"/],
  ["Creator feature request notification trigger exists", /document: "featureRequests\/{requestId}"/],
  ["Creator notification recipients are admin/Creator accounts", /where\("role", "==", "admin"\)[\s\S]*where\("profileType", "==", "creator"\)/],
  ["Creator notifications deep-link to review queues", /url:\s*descriptor\.url/],
  ["Creator notifications are branded", /icon:\s*NOTIFICATION_ICON[\s\S]*badge:\s*NOTIFICATION_BADGE/],
  ["Creator notification events are deduplicated", /eventRef\.create\(eventPayload\)/],
  ["submission notification sweep module is exported", /Object\.assign\(exports, require\("\.\/submissionNotificationTest"\)\)/],
  ["submission notification sweep has all nine kinds", /"bug"[\s\S]*"feedback"[\s\S]*"morph-image"[\s\S]*"morph-terminology"[\s\S]*"behaviour"[\s\S]*"mentor"[\s\S]*"founder"[\s\S]*"community"[\s\S]*"feature"/],
  ["submission notification delay is clamped to 0–10", /Math\.max\(0, Math\.min\(10/],
  ["submission notification opening is recorded", /markSubmissionNotificationTestOpened/],
  ["submission notification acceptance requires opened", /if \(!item\.openedAt\) throw new HttpsError\("failed-precondition"/],
  ["submission notification final tally records passed and broken", /const passed = [\s\S]*const broken = expected - passed/],
  ["submission notification UI exists", /SubmissionNotificationTestBot/],
  ["submission notification UI has 0–10 selector", /Array\.from\(\{ length: 11 \}/],
  ["submission notification UI has Last One control", /LAST ONE — FINISH & TALLY/],
  ["submission notification client has start/send/open/accept/finish callables", /startSubmissionNotificationTest[\s\S]*sendNextSubmissionNotificationTest[\s\S]*markSubmissionNotificationTestOpened[\s\S]*markSubmissionNotificationTestAccepted[\s\S]*finishSubmissionNotificationTest/],
  ["notification test callable is exported", /Object\.assign\(exports, require\("\.\/notificationTest"\)\)/],
  ["notification test callable is defined", /exports\.sendNotificationTest\s*=\s*onCall/],
  ["feed test exists", /feed:\s*\{/],
  ["weight test exists", /weight:\s*\{/],
  ["shed test exists", /shed:\s*\{/],
  ["health test exists", /health:\s*\{/],
  ["FCM background worker exists", /messaging\.onBackgroundMessage/],
  ["foreground bridge exists", /onMessage\(messaging/],
  ["client test callable points at production function", /httpsCallable<[^>]*>\(functions, "sendNotificationTest"\)/],
  ["notification test UI is mounted", /<NotificationTestPanel\s*\/>/],
  ["live tracker styling is used", /trackerWorkspace\.css/],
];
const files = {
  "functions/index.js": read("functions/index.js"),
  "functions/communityNotifications.js": read("functions/communityNotifications.js"),
  "functions/notificationTest.js": read("functions/notificationTest.js"),
  "functions/submissionNotificationTest.js": read("functions/submissionNotificationTest.js"),
  "public/firebase-messaging-sw.js": read("public/firebase-messaging-sw.js"),
  "src/services/notificationService.ts": read("src/services/notificationService.ts"),
  "src/services/submissionNotificationTestService.ts": read("src/services/submissionNotificationTestService.ts"),
  "src/components/NotificationBridge.tsx": read("src/components/NotificationBridge.tsx"),
  "src/components/NotificationSettingsPanel.tsx": read("src/components/NotificationSettingsPanel.tsx"),
  "src/components/NotificationTestPanel.tsx": read("src/components/NotificationTestPanel.tsx"),
  "src/components/SubmissionNotificationTestBot.tsx": read("src/components/SubmissionNotificationTestBot.tsx"),
  "src/pages/TesterCentre.tsx": read("src/pages/TesterCentre.tsx"),
  "src/pages/Settings.tsx": read("src/pages/Settings.tsx"),
  "src/pages/WeightRecords.tsx": read("src/pages/WeightRecords.tsx"),
};

const results = [];
for (const [name, pattern] of checks) {
  const passed = Object.values(files).some((content) => pattern.test(content));
  results.push({ name, passed });
}
const failed = results.filter((item) => !item.passed);
for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} — ${result.name}`);
if (failed.length) process.exit(1);
console.log(`Notification delivery contract suite passed (${results.length} checks).`);
