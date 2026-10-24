import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../capacitor.config.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../.github/workflows/android-test-apk.yml", import.meta.url), "utf8");

test("Tiny Titans Android shell is a separate debug client of the existing web build", () => {
  assert.equal(config.appId, "com.tinytitans.keeper");
  assert.equal(config.appName, "Tiny Titans");
  assert.equal(config.webDir, "dist");
  assert.equal(config.server, undefined, "Do not silently point the native app at another project's server");
});

test("Android build is manually triggered, scoped and never deploys Firebase", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  push:|^  pull_request:/m);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /tiny-titans-firebase-release\.mjs guard/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /@capacitor\/cli@8\.0\.0/);
  assert.match(workflow, /@capacitor\/android@8\.0\.0/);
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /firebase deploy|google-github-actions\/auth|workflow_call/);
});
