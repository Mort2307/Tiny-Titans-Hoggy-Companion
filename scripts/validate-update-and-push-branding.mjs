import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const service = read("src/services/tinyTitansReleaseUpdate.ts");
const control = read("src/components/TinyTitansUpdateControl.tsx");
const settings = read("src/pages/Settings.tsx");
const vite = read("vite.config.ts");
const sw = read("public/firebase-messaging-sw.js");
const backend = read("functions/notificationBranding.js");
const foreground = read("src/components/NotificationBridge.tsx");
const pkg = JSON.parse(read("package.json"));

assert.match(service, /\/version\.json\?update-check=/, "Update comparison must use no-cache release stamp");
assert.match(service, /sourceCommit/, "Both versions must be linked to their source commits");
assert.match(service, /getRegistrations\(\)/, "Force refresh must review registered workers");
assert.match(service, /filter\(isAppShellWorker\)/, "Never revoke the FCM messaging worker during a force refresh");
assert.match(service, /SKIP_WAITING/, "Safe updates should activate a waiting app worker");
const prompt = read("src/components/AppUpdatePrompt.tsx");
const header = read("src/components/Layout/Header.tsx");
const worker = read("src/services/messagingWorkerRegistration.ts");
const notificationService = read("src/services/notificationService.ts");
const notificationSettings = read("src/components/NotificationSettingsPanel.tsx");
const manifest = JSON.parse(read("public/manifest.webmanifest"));
assert.match(header, /Check TinyTitans for updates now/, "Header must expose a global manual update check");
assert.match(header, /tiny-titans-manual-update-check/, "Header check must invoke update monitor");
assert.match(prompt, /MANUAL_UPDATE_CHECK_EVENT/, "Update monitor must respond to manual checks");
assert.match(prompt, /checkTinyTitansRelease/, "Update monitor must compare its running release stamp");
assert.match(prompt, /void check\(\)/, "Update monitor must check as soon as it mounts");
assert.match(prompt, /RELEASE_POLL_MS = 20 \* 1000/, "Update checks cannot take five minutes");
assert.match(prompt, /visibilitychange/, "Updates must check when app returns to foreground");
assert.match(worker, /waitForActiveWorker/, "FCM worker activation must be awaited");
assert.match(worker, /statechange/, "FCM activation wait must observe worker state changes");
assert.match(worker, /registration\.active\?\.state === "activated"/, "FCM worker must be activated before token registration");
assert.doesNotMatch(worker, /navigator\.serviceWorker\.ready/, "Do not wait on app-shell SW for Firebase-scoped worker");
assert.match(notificationService, /return registerActiveMessagingWorker\(\)/, "All registration paths must await Firebase worker");
assert.match(notificationSettings, /Preview notification logo/, "Device-specific monochrome badge preview required");
assert.ok(manifest.icons.some(icon => icon.purpose === "monochrome" && icon.type === "image/png" && icon.src.includes("tiny-titans-notification-badge.png")), "PWA manifest must specify transparent monochrome icon");
assert.match(vite, /purpose: "monochrome"/, "Generated manifest must include monochrome icon");

assert.match(control, /Check for update/);
assert.match(control, /Force refresh/);
assert.match(control, /Update now/);
assert.match(settings, /<TinyTitansUpdateControl\s*\/>/, "Update control must be discoverable in Settings");
assert.match(vite, /__TINY_TITANS_SOURCE_COMMIT__/, "Build commit must be embedded in running app");
assert.equal(pkg.scripts.prebuild, "node scripts/generate-notification-badge.mjs");
for (const [path, content] of [
  ["background", sw], ["foreground", foreground], ["backend", backend],
]) {
  assert.match(content, /tiny-titans-notification-badge\.png/, path + " must use monochrome status-bar icon");
  assert.match(content, /TinyTitans-Logo\.JPG\.jpg/, path + " must retain owner's full-colour branding");
}
execFileSync(process.execPath, ["scripts/generate-notification-badge.mjs"], {stdio:"inherit"});
const png = readFileSync("public/tiny-titans-notification-badge.png");
assert.equal(png.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16), 96);
assert.equal(png.readUInt32BE(20), 96);
assert.equal(png[25], 6, "PNG must be transparent RGBA, not a solid square");
console.log("Nightjar-style update and authentic TinyTitans notification badge contracts passed.");
