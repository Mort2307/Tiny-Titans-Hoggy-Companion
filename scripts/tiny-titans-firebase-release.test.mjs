import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkFirebaseConfiguration, classifyChanges, functionTargets, PROJECT, SITES } from "./tiny-titans-firebase-release.mjs";

const firebase = JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
const rc = JSON.parse(readFileSync(new URL("../.firebaserc", import.meta.url), "utf8"));

test("Tiny Titans release uses the correct Firebase project and both Hosting targets", () => {
  assert.equal(PROJECT, "tinytitans-hoggy-companion");
  assert.deepEqual(SITES, { legacy: "tinytitans-hoggy-companion", keeper: "tinytitanskeeper" });
  assert.equal(checkFirebaseConfiguration(firebase, rc), true);
  assert.throws(
    () => checkFirebaseConfiguration(firebase, { ...rc, projects: { default: "nightjar-audio" } }),
    /Unexpected default Firebase project/,
  );
  assert.throws(
    () => checkFirebaseConfiguration(firebase, {
      ...rc,
      targets: { [PROJECT]: { hosting: { legacy: ["tinytitans-hoggy-companion"], keeper: ["nightjar-audio"] } } },
    }),
    /does not match/,
  );
});

test("Selected Functions reject malformed, duplicated and oversized selections", () => {
  assert.equal(functionTargets("getProfile,saveProfile"), "functions:getProfile,functions:saveProfile");
  for (const value of ["", "getProfile,", "getProfile,getProfile", "_private", "deleteAll; echo HACK", "Nightjar/foo"]) {
    assert.throws(() => functionTargets(value));
  }
  assert.throws(() => functionTargets(Array.from({ length: 21 }, (_, n) => "fn" + n).join(",")));
});

test("Backend changes are distinguished from frontend-only commits", () => {
  const front = classifyChanges(["src/App.tsx", "public/manifest.webmanifest"]);
  assert.equal(front.hosting, true);
  assert.equal(front.functions, false);
  assert.equal(front.firestore, false);
  assert.equal(front.storage, false);

  const mixed = classifyChanges(["src/App.tsx", "functions/index.js", "firestore.rules", "storage.rules", "firebase.json"]);
  assert.equal(mixed.hosting, true);
  assert.equal(mixed.functions, true);
  assert.equal(mixed.firestore, true);
  assert.equal(mixed.storage, true);
  assert.equal(mixed.config, true);
});

test("Batched Functions deploy explicitly pins the correct Firebase project", () => {
  const source = readFileSync(new URL("./deploy-functions-batched.mjs", import.meta.url), "utf8");
  assert.match(source, /"--project", "tinytitans-hoggy-companion", "--non-interactive"/);
  assert.match(source, /requestedStartBatch > batches.length/);
});
