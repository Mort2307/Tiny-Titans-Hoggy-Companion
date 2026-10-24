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
// The full-size crest is detailed, so the 24dp Android slot gets a deliberately
// simplified white coiled-snake mark based on the same official TinyTitans crest.
const generator = read("scripts/generate-notification-badge.mjs");
const mark = read("public/icons/tiny-titans-notification-mark.svg");
assert.match(generator, /TinyTitans-Logo\.JPG\.jpg/, "Full-colour PWA icons must still use the keeper's original logo");
assert.match(generator, /tiny-titans-notification-mark\.svg/, "Small badge must use the dedicated legible snake mark");
assert.match(generator, /stroke-linecap round/, "Status icon must render with native round-ended strokes on ImageMagick 6");
assert.match(generator, /"-size", "96x96", "xc:none"/, "Badge rasterization must not depend on SVG delegates");
assert.doesNotMatch(generator, /"-threshold", "42%"/, "Do not shrink and threshold the full detailed crest into the status bar");
assert.match(mark, /coiled snake|coiled-snake/i, "Mark must describe the branded coil");
assert.match(mark, /stroke-width="11\.5"/, "Status-bar mark needs thick lines for legibility at 24dp");
assert.match(mark, /eye-cutout/, "Coiled snake must keep a recognizable face detail");
assert.doesNotMatch(generator, /const BASE64\s*=/, "Never restore the embedded lightning-bolt artwork");
assert.match(foreground, /mark=coiled-snake-3/, "Foreground badges must invalidate older cached artwork");
assert.match(sw, /mark=coiled-snake-3/, "Background badges must invalidate older cached artwork");
assert.match(notificationSettings, /mark=coiled-snake-3/, "Logo preview must use latest artwork");
assert.match(control, /mark=coiled-snake-3/, "Settings preview must show latest artwork");
assert.match(vite, /mark=coiled-snake-3/, "PWA-generated manifest must publish versioned icon URL");
assert.ok(manifest.icons.some(icon => icon.purpose === "monochrome" && icon.src.includes("mark=coiled-snake-3")), "Static manifest must publish versioned icon URL");

execFileSync(process.execPath, ["scripts/generate-notification-badge.mjs"], {stdio:"inherit"});
const png = readFileSync("public/tiny-titans-notification-badge.png");
assert.equal(png.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
assert.equal(png.readUInt32BE(16), 96);
assert.equal(png.readUInt32BE(20), 96);
assert.equal(png[25], 6, "PNG must be transparent RGBA, not a solid square");
assert.notEqual((await import("node:crypto")).createHash("sha256").update(png).digest("hex"), "e74e2f84b3f42942ecfb0d6d6b732c73625ebbaccfc00ef63e3c539289fd9b25", "The lightning-bolt PNG must never be shipped again");

// Guard the THIRD source of Android's lightning symbol: installed PWA identity.
// The push payload can carry an accurate badge while the OS displays favicon
// or a stale primary manifest SVG from the installed app.
const html = read("index.html");
const viteConfig = read("vite.config.ts");
const staticManifest = JSON.parse(read("public/manifest.webmanifest"));
assert.match(html, /icons\/tiny-titans-official-192\.png/, "Browser favicon must use the actual TinyTitans logo");
assert.doesNotMatch(html, /href="\/favicon\.svg/, "Browser favicon cannot reference the old bolt SVG");
for (const [name, manifestIcons] of [
  ["static PWA", staticManifest.icons],
  ["My Animals shortcut", staticManifest.shortcuts[0].icons],
  ["Due shortcut", staticManifest.shortcuts[1].icons],
  ["Genetics shortcut", staticManifest.shortcuts[2].icons],
]) {
  assert.ok(manifestIcons.some((x) => x.src.includes("tiny-titans-official-192.png") ||
                                       x.src.includes("tiny-titans-official-512.png")), name + " must use original TinyTitans branding");
  assert.ok(manifestIcons.every((x) => !x.src.includes(".svg")), name + " cannot reuse the lightning-bolt SVG");
}
assert.match(viteConfig, /tiny-titans-official-192\.png/, "Vite manifest must agree with static manifest");
assert.match(viteConfig, /tiny-titans-official-512\.png/, "Vite manifest must agree with static manifest");
for (const [file, dimension] of [
  ["public/icons/tiny-titans-official-192.png", 192],
  ["public/icons/tiny-titans-official-512.png", 512],
]) {
  const bytes = readFileSync(file);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", file + " PNG signature");
  assert.equal(bytes.readUInt32BE(16), dimension, file + " correct width");
  assert.equal(bytes.readUInt32BE(20), dimension, file + " correct height");
  assert.ok(bytes.length > 2000, file + " should contain real source image detail");
}
// Former webpush senders still request these URLs; CI must publish logo art there.
for (const file of [
  "public/favicon.svg",
  "public/icons/tiny-titans-192.svg",
  "public/icons/tiny-titans-512.svg",
]) {
  const svg = read(file);
  assert.match(svg, /data:image\/jpeg;base64,/, file + " must embed the actual keeper logo");
  assert.doesNotMatch(svg, /P25\.946 44\.938|M25\.946 44\.938|fill="#863bff"/, file + " cannot contain the bolt");
}


const headerMobile = read("src/styles/mobile-experience-v2.css").split("Mobile App Builder mobile-first header contract")[1] || "";
const sourceBadge = read("scripts/generate-notification-badge.mjs");
const tokenService = read("src/services/notificationService.ts");
const switcher = read("src/components/WorkspaceSwitcher.tsx");
assert.match(headerMobile, /@media\s*\(max-width:\s*800px\)/, "Mobile header must work in portrait, not only landscape");
assert.match(headerMobile, /height:\s*56px\s*!important/, "Mobile header must be one compact row");
assert.match(headerMobile, /flex-wrap:\s*nowrap\s*!important/, "Mobile identity and actions cannot wrap into an oversized second row");
assert.match(headerMobile, /\.app-header > \.app-header-identity/, "Header identity must be left-aligned on phones");
assert.match(headerMobile, /app-brand-secondary/, "Duplicate mobile branding tagline must be hidden");
assert.match(headerMobile, /tt-header-check-updates/, "Phone must retain tap-to-check updates");
assert.match(switcher, /aria-label=\{\`Switch workspace, current:/, "Compact workspace control needs an accessible name");
assert.match(sourceBadge, /"-crop", String\(dimension\)/, "Launcher icon must crop full bleed instead of shrinking within a second frame");
assert.doesNotMatch(sourceBadge, /"-extent", String\(dimension\)/, "Do not draw a redundant padded icon shell around the logo");
assert.match(tokenService, /superseded notification tokens/, "Old same-installation FCM tokens must be pruned to avoid duplicate status icons");
assert.match(tokenService, /item\.data\(\)\.installationId === installationId/, "Never delete push tokens from a different installation");

console.log("Nightjar-style update and authentic TinyTitans notification badge contracts passed.");
