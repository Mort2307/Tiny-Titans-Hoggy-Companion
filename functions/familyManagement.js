const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const VALID_MODES = new Set(["full", "review", "sandbox"]);

function auth(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function getFamilyForUser(uid) {
  const profile = await db.collection("users").doc(uid).get();
  const familyId = profile.exists ? String(profile.data()?.familyId || "") : "";
  if (!familyId) return null;
  const family = await db.collection("families").doc(familyId).get();
  return family.exists ? { id: family.id, data: family.data() || {} } : null;
}

function permissionsForMode(mode) {
  const areas = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"];
  const actions = ["view", "create", "edit", "delete"];
  const permissions = {};
  for (const area of areas) {
    for (const action of actions) {
      const key = `${area}.${action}`;
      permissions[key] = action === "view" ? "allow" : mode === "full" ? "allow" : mode === "review" ? "verify" : "deny";
    }
  }
  return permissions;
}

exports.setFamilyMemberAccessMode = onCall({ region: "europe-west2" }, async (request) => {
  const ownerUid = auth(request);
  const memberUid = String(request.data?.memberUid || "").trim();
  const mode = String(request.data?.mode || "");
  if (!memberUid || !VALID_MODES.has(mode)) throw new HttpsError("invalid-argument", "A valid family member and access mode are required.");
  if (memberUid === ownerUid) throw new HttpsError("failed-precondition", "The Family Head always has full permission.");

  const family = await getFamilyForUser(ownerUid);
  if (!family || String(family.data.ownerUid || "") !== ownerUid) throw new HttpsError("permission-denied", "Only the Family Head can change family permissions.");
  const members = Array.isArray(family.data.memberUids) ? family.data.memberUids : [];
  if (!members.includes(memberUid)) throw new HttpsError("not-found", "That account is not a member of your family.");

  await db.collection("families").doc(family.id).collection("permissions").doc(memberUid).set({
    familyId: family.id,
    memberUid,
    accessMode: mode,
    permissions: permissionsForMode(mode),
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: ownerUid,
  }, { merge: true });

  await db.collection("familyHistory").add({
    familyId: family.id,
    actorUid: ownerUid,
    targetUid: memberUid,
    eventType: "permission_mode_changed",
    summary: `Family permission mode changed to ${mode}.`,
    details: { mode },
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, familyId: family.id, memberUid, mode };
});
