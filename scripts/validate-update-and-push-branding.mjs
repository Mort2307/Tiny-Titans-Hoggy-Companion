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
const quickView = read("src/components/Layout/QuickModeNavigation.tsx");
const worker = read("src/services/messagingWorkerRegistration.ts");
const notificationService = read("src/services/notificationService.ts");
const notificationSettings = read("src/components/NotificationSettingsPanel.tsx");
const manifest = JSON.parse(read("public/manifest.webmanifest"));
assert.match(header, /Check TinyTitans for updates now/, "Header must expose a global manual update check");
assert.match(header, /tiny-titans-manual-update-check/, "Header check must invoke update monitor");
assert.match(quickView, /Check for updates/, "Quick View must expose a visible manual update check");
assert.match(prompt, /MANUAL_UPDATE_CHECK_EVENT/, "Update monitor must respond to manual checks");
assert.match(prompt, /checkTinyTitansRelease/, "Update monitor must compare its running release stamp");
assert.match(prompt, /check\(true\);/, "Update monitor must visibly check on startup and login");
assert.match(prompt, /\[user\?\.uid\]/, "Update monitor must re-check when user signs in");
assert.match(prompt, /if \(!pending && !offlineReady && !checkMessage\) return null;/, "Update checking status must render even if no update is pending");
assert.match(prompt, /if \(announce\)/, "Manual checks must request visible feedback");
assert.match(prompt, /feedbackWanted = true/, "Manual checks during an existing fetch must still show the result");
assert.match(prompt, /TinyTitans is up to date\./, "Manual check must report a successful no-update result");
const responsive = read("src/styles/mobile-experience-v2.css");
const landscapeHeader = responsive.split("PHONE LANDSCAPE TOP BAR")[1] || "";
assert.match(landscapeHeader, /orientation: landscape/, "Landscape phone header layout must be explicit");
assert.match(landscapeHeader, /max-height: 75px !important/, "Landscape phone header must be height-bounded");
assert.match(landscapeHeader, /position: static !important/, "Landscape must cancel desktop absolute positioning");
assert.match(landscapeHeader, /flex-wrap: nowrap !important/, "Landscape header must stay on one row");
assert.match(landscapeHeader, /tiny-titans-logo/, "Landscape logo must remain appropriately sized");
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
// The status icon must be derived from the keeper's actual reptile/spider/wordmark
// logo. The historical generated graphic was a generic lightning bolt.
const generator = read("scripts/generate-notification-badge.mjs");
assert.match(generator, /TinyTitans-Logo\.JPG\.jpg/, "Badge generation must use the actual TinyTitans logo");
assert.match(generator, /"-threshold", "42%"/, "Use a deterministic light-on-transparent reproduction of official artwork");
assert.doesNotMatch(generator, /const BASE64\s*=/, "Never restore the embedded lightning-bolt artwork");
assert.match(foreground, /art=official-logo-2/, "Foreground badges must invalidate the old lightning icon cache");
assert.match(sw, /art=official-logo-2/, "Background notifications must invalidate the old lightning icon cache");

execFileSync(process.execPath, ["scripts/generate-notification-badge.mjs"], {stdio:"inherit"});
const png = readFileSync("public/tiny-titans-notification-badge.png");
assert.equal(png.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16), 96);
assert.equal(png.readUInt32BE(20), 96);
assert.equal(png[25], 6, "PNG must be transparent RGBA, not a solid square");
assert.notEqual((await import("node:crypto")).createHash("sha256").update(png).digest("hex"), "e74e2f84b3f42942ecfb0d6d6b732c73625ebbaccfc00ef63e3c539289fd9b25", "The lightning-bolt PNG must never be shipped again");
console.log("Nightjar-style update and authentic TinyTitans notification badge contracts passed.");
