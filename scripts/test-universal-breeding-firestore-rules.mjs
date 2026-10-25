import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

/**
 * REAL Firestore security-rules emulator integration tests.
 * Run only against the local demo project, never a connected production database:
 *   firebase emulators:exec --only firestore --project demo-tinytitans-breeding \
 *     "node scripts/test-universal-breeding-firestore-rules.mjs"
 */
const projectId = "demo-tinytitans-breeding";
const owner = "breeding-owner";
const member = "breeding-member";
const outsider = "breeding-outsider";
const speciesId = "ambystoma-mexicanum";
const projectIdValue = "breeding-test-01";
const rules = readFileSync("firestore.rules", "utf8");

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Refusing to run without an explicitly configured Firestore emulator.");
const host = process.env.FIRESTORE_EMULATOR_HOST.split(":")[0];
const port = Number(process.env.FIRESTORE_EMULATOR_HOST.split(":")[1] ?? 8080);
const env = await initializeTestEnvironment({ projectId, firestore: { host, port, rules } });
const ownerDb = env.authenticatedContext(owner, { email: "owner@example.invalid" }).firestore();
const memberDb = env.authenticatedContext(member, { email: "member@example.invalid" }).firestore();
const otherDb = env.authenticatedContext(outsider, { email: "outsider@example.invalid" }).firestore();
const anonDb = env.unauthenticatedContext().firestore();
const projectPath = `users/${owner}/breedingProjects/${projectIdValue}`;
const eventPath = `${projectPath}/events/observation-1`;
const event = (overrides = {}) => ({
  id: "observation-1",
  projectId: projectIdValue,
  speciesId,
  kind: "offspring",
  recordedAt: "2026-10-25",
  quantity: 2,
  createdAt: "2026-10-25T12:00:00Z",
  ...overrides,
});
const suite = [];
const test = async (name, fn) => { await fn(); suite.push(name); console.log("PASS  " + name); };
try {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", owner), { role: "user", familyId: "breeding-family" });
    await setDoc(doc(db, "users", member), { role: "user", familyId: "breeding-family" });
    await setDoc(doc(db, "users", outsider), { role: "user" });
    await setDoc(doc(db, "families", "breeding-family"), { ownerUid: owner, memberUids: [owner, member] });
    await setDoc(doc(db, projectPath), {
      id: projectIdValue,
      ownerId: owner,
      speciesId,
      name: "Provisional species breeding test",
      status: "Planned",
    });
  });

  await test("Owner reads the breeding project", async () => {
    assert.equal((await assertSucceeds(getDoc(doc(ownerDb, projectPath)))).exists(), true);
  });
  await test("Anonymous and unrelated accounts cannot read breeding events", async () => {
    await assertFails(getDoc(doc(anonDb, eventPath)));
    await assertFails(getDoc(doc(otherDb, eventPath)));
  });
  await test("Unrelated account cannot create a breeding observation", async () => {
    await assertFails(setDoc(doc(otherDb, eventPath), event()));
  });
  await test("Owner can save and retrieve a species-linked breeding observation", async () => {
    await assertSucceeds(setDoc(doc(ownerDb, eventPath), event()));
    assert.equal((await assertSucceeds(getDoc(doc(ownerDb, eventPath)))).data()?.speciesId, speciesId);
  });
  await test("Family member in default review mode can read but cannot write", async () => {
    await assertSucceeds(getDoc(doc(memberDb, eventPath)));
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/review-denied`), event({ id: "review-denied" })));
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "families", "breeding-family", "permissions", member), {
      familyId: "breeding-family", memberUid: member, accessMode: "review",
      permissions: { "breeding.create": "verify", "breeding.edit": "verify", "breeding.delete": "verify", "breeding.view": "allow" },
    });
  });
  await test("Review-mode family member remains unable to write without explicit permission", async () => {
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/review-verify`), event({ id: "review-verify" })));
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "families", "breeding-family", "permissions", member), {
      familyId: "breeding-family", memberUid: member, accessMode: "review",
      permissions: { "breeding.create": "allow", "breeding.edit": "allow", "breeding.delete": "verify", "breeding.view": "allow" },
    });
  });
  await test("Explicit breeding.create permission allows matching-species observation", async () => {
    await assertSucceeds(setDoc(doc(memberDb, `${projectPath}/events/allowed`), event({ id: "allowed" })));
  });
  await test("Family member cannot create cross-species or wrong-project observations", async () => {
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/wrong-species`), event({ id: "wrong-species", speciesId: "heterodon-nasicus" })));
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/wrong-project`), event({ id: "wrong-project", projectId: "unrelated-project" })));
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/wrong-id`), event({ id: "wrong-data-id" })));
  });
  await test("Family edit works only with matching project/species identity", async () => {
    await assertSucceeds(setDoc(doc(memberDb, `${projectPath}/events/allowed`), event({ id: "allowed", notes: "Observed, not predicted" })));
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/allowed`), event({ id: "allowed", speciesId: "heterodon-nasicus" })));
  });
  await test("Family member can edit project status but not change its species or identity", async () => {
    await assertSucceeds(updateDoc(doc(memberDb, projectPath), { status: "Paired" }));
    await assertFails(updateDoc(doc(memberDb, projectPath), { speciesId: "heterodon-nasicus" }));
    await assertFails(updateDoc(doc(memberDb, projectPath), { id: "reassigned-project-id" }));
  });
  await test("Review-mode member cannot delete observations without breeding.delete", async () => {
    await assertFails(deleteDoc(doc(memberDb, `${projectPath}/events/allowed`)));
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "families", "breeding-family", "permissions", member), {
      familyId: "breeding-family", memberUid: member, accessMode: "sandbox",
      permissions: { "breeding.create": "allow", "breeding.edit": "allow", "breeding.delete": "allow", "breeding.view": "allow" },
    });
  });
  await test("Sandbox mode forbids writes even if old permission flags say allow", async () => {
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/sandbox-denied`), event({ id: "sandbox-denied" })));
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "families", "breeding-family", "permissions", member), {
      familyId: "breeding-family", memberUid: member, accessMode: "full", permissions: {},
    });
  });
  await test("Full-access family members can create breeding observations", async () => {
    await assertSucceeds(setDoc(doc(memberDb, `${projectPath}/events/full-allowed`), event({ id: "full-allowed" })));
  });
  await test("Even full-access family members cannot change the canonical species", async () => {
    await assertFails(setDoc(doc(memberDb, `${projectPath}/events/full-wrong-species`), event({ id: "full-wrong-species", speciesId: "heterodon-nasicus" })));
  });
  console.log(`Breeding Firestore emulator assertions passed: ${suite.length} scenarios, no production writes.`);
} finally {
  await env.cleanup();
}
