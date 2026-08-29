import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["functions/index.js exports keeper scheduler", /sendAllKeeperReminderNotifications\s*=\s*familyNotifications\.sendAllKeeperReminderNotifications/],
  ["functions/index.js exports equipment scheduler", /sendEquipmentReplacementNotifications\s*=\s*equipmentNotifications\.sendEquipmentReplacementNotifications/],
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
  "functions/notificationTest.js": read("functions/notificationTest.js"),
  "public/firebase-messaging-sw.js": read("public/firebase-messaging-sw.js"),
  "src/services/notificationService.ts": read("src/services/notificationService.ts"),
  "src/components/NotificationBridge.tsx": read("src/components/NotificationBridge.tsx"),
  "src/components/NotificationSettingsPanel.tsx": read("src/components/NotificationSettingsPanel.tsx"),
  "src/components/NotificationTestPanel.tsx": read("src/components/NotificationTestPanel.tsx"),
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
