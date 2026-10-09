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

console.log(`Tiny Titans forced-release contract PASS: ${release.buildId} across ${hosting.length} Firebase Hosting target(s).`);
