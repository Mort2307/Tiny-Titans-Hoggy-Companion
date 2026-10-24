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
