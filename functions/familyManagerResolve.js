const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const AREAS = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"];

function requireUid(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function resolveFamily(uid) {
  const profile = await db.collection("users").doc(uid).get();
  const profileData = profile.exists ? profile.data() || {} : {};
  const linkedFamilyId = typeof profileData.familyId === "string" ? profileData.familyId : "";

  if (linkedFamilyId) {
    const linked = await db.collection("families").doc(linkedFamilyId).get();
    if (linked.exists) return { id: linked.id, data: linked.data() || {} };
  }

  const fallback = await db.collection("families").where("memberUids", "array-contains", uid).limit(1).get();
  return fallback.empty ? null : { id: fallback.docs[0].id, data: fallback.docs[0].data() || {} };
}

function inferMode(data) {
  const explicit = String(data?.accessMode || "");
  if (["full", "review", "sandbox"].includes(explicit)) return explicit;
  const permissions = data?.permissions && typeof data.permissions === "object" ? data.permissions : {};
  const keys = AREAS.flatMap((area) => ["create", "edit", "delete"].map((action) => `${area}.${action}`));
  if (keys.every((key) => permissions[key] === "allow")) return "full";
  if (keys.every((key) => permissions[key] === "deny")) return "sandbox";
  return "review";
}

exports.getFamilyManagerDataSecure = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireUid(request);
  const family = await resolveFamily(uid);
  if (!family) return { family: null, modes: {} };

  const ownerUid = String(family.data.ownerUid || "");
  const memberUids = Array.isArray(family.data.memberUids) ? family.data.memberUids.filter((value) => typeof value === "string") : [];
  const members = Array.isArray(family.data.members) ? family.data.members : [];

  if (ownerUid !== uid) {
    return { family: { id: family.id, ownerUid, memberUids, members, createdAt: family.data.createdAt, updatedAt: family.data.updatedAt }, modes: {}, isOwner: false };
  }

  const modeEntries = await Promise.all(memberUids.filter((memberUid) => memberUid !== uid).map(async (memberUid) => {
    const permission = await db.collection("families").doc(family.id).collection("permissions").doc(memberUid).get();
    return [memberUid, inferMode(permission.exists ? permission.data() : null)];
  }));

  return {
    family: { id: family.id, ownerUid, memberUids, members, createdAt: family.data.createdAt, updatedAt: family.data.updatedAt },
    modes: Object.fromEntries(modeEntries),
    isOwner: true,
  };
});
