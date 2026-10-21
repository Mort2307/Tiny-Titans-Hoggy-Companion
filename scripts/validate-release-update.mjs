import assert from "node:assert/strict";
import fs from "node:fs";

const manifestPath = "dist/release.json";
assert.ok(fs.existsSync(manifestPath), "Production build is missing release.json");
const release = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.match(release.buildId, /^tt-[a-z0-9]+$/);
assert.equal(release.mandatory, true, "Release policy must be mandatory");
assert.ok(!Number.isNaN(Date.parse(release.releasedAt)), "Release needs a valid timestamp");

const hosting = JSON.parse(fs.readFileSync("firebase.json", "utf8")).hosting;
assert.ok(Array.isArray(hosting) && hosting.length > 0, "Expected Firebase Hosting targets");
for (const target of hosting) {
  const rule = target.headers?.find((entry) => entry.source === "/release.json");
  assert.ok(rule, "All hosting targets must serve /release.json uncached");
  assert.ok(rule.headers?.some((header) =>
    header.key.toLowerCase() === "cache-control" && header.value.includes("no-store"),
  ), "release.json must have no-store Cache-Control");
}

const swPath = "dist/sw.js";
if (fs.existsSync(swPath)) {
  assert.ok(
    !fs.readFileSync(swPath, "utf8").includes("release.json"),
    "release.json must not be included in the Workbox offline precache",
  );
}
const guard = fs.readFileSync("src/components/ReleaseCheckGuard.tsx", "utf8");
assert.ok(guard.includes('check("startup")'), "A release check must run before showing the app");
assert.ok(guard.includes("getAttempts(buildId)"), "Release retries must be bounded");
assert.ok(guard.includes('navigator.serviceWorker'), "Release flow must support installed PWAs");
assert.ok(guard.includes('setPhase("required")'), "An outdated release must block startup");
assert.ok(guard.includes('phase === "required"'), "Required-update state must be visible");
assert.ok(guard.includes("Update Tiny Titans"), "A mandatory update button must be displayed");
assert.ok(guard.includes("MIN_STARTUP_CHECK_MS"), "Initial update checking must show discernible progress");
assert.ok(guard.includes("tt-release-gate-spinner"), "Update checking and installation must show progress");
assert.ok(!guard.includes("Continue temporarily"), "An outdated online workspace cannot be bypassed");
assert.ok(!guard.includes('await applyUpdate(release.buildId)'), "Outdated startup must display the update button instead of auto-refreshing invisibly");
assert.ok(guard.includes('phase === "updating"'), "Update installation must display progress");

// The app icon, tab favicon, shortcuts and legacy PWA icon URLs must all
// resolve to the keeper's actual logo, not an earlier lightning-bolt SVG.
const originalLogo = fs.readFileSync("public/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg");
const logoFingerprint = originalLogo.toString("base64").slice(0,128);
const brandedIcons = [
  "favicon-brand.svg",
  "icons/tiny-titans-brand-192.svg",
  "icons/tiny-titans-brand-512.svg",
  "icons/tiny-titans-brand-maskable-512.svg",
  "favicon.svg",
  "icons/tiny-titans-192.svg",
  "icons/tiny-titans-512.svg",
];
for (const icon of brandedIcons) {
  const file = `dist/${icon}`;
  assert.ok(fs.existsSync(file), `Logo-based PWA asset missing: ${file}`);
  const svg = fs.readFileSync(file, "utf8");
  assert.ok(svg.includes("data:image/jpeg;base64,") && svg.includes(logoFingerprint),
    `PWA asset is not generated from the original Tiny Titans logo: ${file}`);
  assert.ok(!svg.includes('fill="#863bff"'), `Obsolete lightning bolt remains in ${file}`);
}
const builtIndex = fs.readFileSync("dist/index.html", "utf8");
assert.ok(builtIndex.includes("/favicon-brand.svg?v=7"), "Browser favicon must use the updated logo URL");
assert.ok(builtIndex.includes("/manifest.webmanifest?v=7"), "PWA manifest URL must be cache-busted");
const builtManifest = JSON.parse(fs.readFileSync("dist/manifest.webmanifest", "utf8"));
for (const expected of [
  "/icons/tiny-titans-brand-192.svg",
  "/icons/tiny-titans-brand-512.svg",
  "/icons/tiny-titans-brand-maskable-512.svg",
]) {
  assert.ok(builtManifest.icons?.some((icon) => icon.src === expected), `Built PWA manifest missing ${expected}`);
}
assert.ok(builtManifest.icons?.some((icon) => icon.type === "image/jpeg" &&
  icon.src === "/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg"),
  "PWA manifest must retain the original raster logo as a fallback");

console.log(`Tiny Titans forced-release contract PASS: ${release.buildId} across ${hosting.length} Firebase Hosting target(s).`);
