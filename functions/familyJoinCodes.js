const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");

const db = getFirestore();
const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normaliseCode(value) { return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function hashCode(code) { return crypto.createHash("sha256").update(normaliseCode(code)).digest("hex"); }
function makeCode() { let raw = ""; for (let i = 0; i < 8; i += 1) raw += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)]; return `TT-${raw.slice(0, 4)}-${raw.slice(4)}`; }
async function getFamily(uid) { const profile = await db.collection("users").doc(uid).get(); const familyId = profile.exists ? String(profile.data()?.familyId || "") : ""; if (!familyId) return null; const family = await db.collection("families").doc(familyId).get(); if (!family.exists) return null; return { id: family.id, data: family.data() || {} }; }
function deriveRole(profile) { return profile?.category === "child" || profile?.ageBand === "7-10" || profile?.ageBand === "11-14" ? "child" : "adult"; }

exports.getFamilyJoinCode = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const family = await getFamily(request.auth.uid);
  if (!family || String(family.data.ownerUid || "") !== request.auth.uid) throw new HttpsError("permission-denied", "Only the Family Owner can view the family join code.");
  const code = normaliseCode(family.data.currentJoinCode);
  const expiresAt = family.data.currentJoinCodeExpiresAt?.toDate ? family.data.currentJoinCodeExpiresAt.toDate() : new Date(family.data.currentJoinCodeExpiresAt || 0);
  if (!code || !(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return { code: "", expiresAt: "" };
  return { code: `TT-${code.slice(0, 4)}-${code.slice(4)}`, expiresAt: expiresAt.toISOString() };
});

exports.generateFamilyJoinCode = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const family = await getFamily(uid);
  if (!family) throw new HttpsError("failed-precondition", "Create your Tiny Titans family first.");
  if (String(family.data.ownerUid || "") !== uid) throw new HttpsError("permission-denied", "Only the Family Owner can generate a join code.");
  const memberUids = Array.isArray(family.data.memberUids) ? family.data.memberUids : [];
  if (memberUids.length >= 3) throw new HttpsError("failed-precondition", "This Tiny Titans family is already full.");
  const code = makeCode(); const codeHash = hashCode(code); const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await db.collection("familyJoinCodes").doc(codeHash).set({ codeHash, familyId: family.id, ownerUid: uid, active: true, createdAt: FieldValue.serverTimestamp(), expiresAt });
  await db.collection("families").doc(family.id).set({ currentJoinCode: normaliseCode(code), currentJoinCodeLast4: code.slice(-4), currentJoinCodeExpiresAt: expiresAt, currentJoinCodeUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { code, expiresAt: expiresAt.toISOString(), familyId: family.id };
});

exports.revokeFamilyJoinCode = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid; const family = await getFamily(uid);
  if (!family || String(family.data.ownerUid || "") !== uid) throw new HttpsError("permission-denied", "Only the Family Owner can revoke the join code.");
  const currentCode = normaliseCode(family.data.currentJoinCode);
  if (currentCode) await db.collection("familyJoinCodes").doc(hashCode(currentCode)).set({ active: false, revokedAt: FieldValue.serverTimestamp(), revokedByUid: uid }, { merge: true });
  await db.collection("families").doc(family.id).set({ currentJoinCode: FieldValue.delete(), currentJoinCodeLast4: FieldValue.delete(), currentJoinCodeExpiresAt: FieldValue.delete(), currentJoinCodeUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
});

exports.requestFamilyJoinByCode = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid; const code = normaliseCode(request.data?.code);
  if (code.length !== 8) throw new HttpsError("invalid-argument", "Enter the 8-character Tiny Titans family code.");
  const codeSnapshot = await db.collection("familyJoinCodes").doc(hashCode(code)).get();
  if (!codeSnapshot.exists) throw new HttpsError("not-found", "That family code is not recognised.");
  const codeData = codeSnapshot.data() || {};
  if (codeData.active !== true) throw new HttpsError("failed-precondition", "That family code is no longer active.");
  const expiresAt = codeData.expiresAt?.toDate ? codeData.expiresAt.toDate() : new Date(codeData.expiresAt || 0);
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) { await codeSnapshot.ref.set({ active: false, expiredAt: FieldValue.serverTimestamp() }, { merge: true }); throw new HttpsError("failed-precondition", "That family code has expired. Ask the Family Owner for a new one."); }
  const familySnapshot = await db.collection("families").doc(String(codeData.familyId || "")).get();
  if (!familySnapshot.exists) throw new HttpsError("not-found", "The Tiny Titans family could not be found.");
  const family = familySnapshot.data() || {}; const memberUids = Array.isArray(family.memberUids) ? family.memberUids : [];
  if (memberUids.includes(uid)) throw new HttpsError("already-exists", "You are already part of this Tiny Titans family.");
  if (memberUids.length >= 3) throw new HttpsError("failed-precondition", "This Tiny Titans family is already full.");
  const userSnapshot = await db.collection("users").doc(uid).get(); const profile = userSnapshot.data() || {}; const currentFamilyId = String(profile.familyId || "");
  if (currentFamilyId && currentFamilyId !== familySnapshot.id) throw new HttpsError("failed-precondition", "Your account is already connected to another Tiny Titans family.");
  const existing = await db.collection("familyJoinRequests").where("familyId", "==", familySnapshot.id).where("requesterUid", "==", uid).where("status", "==", "pending").limit(1).get();
  if (!existing.empty) return { requestId: existing.docs[0].id, familyId: familySnapshot.id, status: "pending" };
  const displayName = String(profile.displayName || request.auth.token?.name || request.auth.token?.email?.split("@")[0] || "Tiny Titans Keeper").trim();
  const requestRef = await db.collection("familyJoinRequests").add({ familyId: familySnapshot.id, ownerUid: String(family.ownerUid || codeData.ownerUid || ""), requesterUid: uid, requesterDisplayName: displayName, requesterEmail: String(profile.email || request.auth.token?.email || "").trim().toLowerCase(), requesterRole: deriveRole(profile), status: "pending", joinCodeLast4: code.slice(-4), createdAt: FieldValue.serverTimestamp() });
  return { requestId: requestRef.id, familyId: familySnapshot.id, familyOwnerUid: String(family.ownerUid || ""), status: "pending" };
});

exports.getFamilyJoinRequests = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const family = await getFamily(request.auth.uid);
  if (!family || String(family.data.ownerUid || "") !== request.auth.uid) throw new HttpsError("permission-denied", "Only the Family Owner can view join requests.");
  const snapshot = await db.collection("familyJoinRequests").where("familyId", "==", family.id).where("status", "==", "pending").get();
  return { requests: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) };
});

exports.decideFamilyJoinRequest = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid; const requestId = String(request.data?.requestId || "").trim(); const decision = request.data?.decision === "approved" ? "approved" : request.data?.decision === "rejected" ? "rejected" : "";
  if (!requestId || !decision) throw new HttpsError("invalid-argument", "A join request and decision are required.");
  const family = await getFamily(uid); if (!family || String(family.data.ownerUid || "") !== uid) throw new HttpsError("permission-denied", "Only the Family Owner can decide join requests.");
  const requestRef = db.collection("familyJoinRequests").doc(requestId);
  const result = await db.runTransaction(async (tx) => {
    const joinSnapshot = await tx.get(requestRef); if (!joinSnapshot.exists) throw new HttpsError("not-found", "That family join request no longer exists.");
    const join = joinSnapshot.data() || {}; if (String(join.familyId || "") !== family.id || String(join.ownerUid || "") !== uid) throw new HttpsError("permission-denied", "That join request does not belong to your family.");
    if (join.status !== "pending") throw new HttpsError("failed-precondition", "That join request has already been decided.");
    if (decision === "rejected") { tx.update(requestRef, { status: "rejected", decidedAt: FieldValue.serverTimestamp(), decidedByUid: uid }); return { status: "rejected", requesterUid: String(join.requesterUid || "") }; }
    const familySnapshot = await tx.get(db.collection("families").doc(family.id)); if (!familySnapshot.exists) throw new HttpsError("not-found", "The family could not be found.");
    const familyData = familySnapshot.data() || {}; const memberUids = Array.isArray(familyData.memberUids) ? familyData.memberUids : []; if (memberUids.length >= 3) throw new HttpsError("failed-precondition", "This family is now full.");
    const requesterUid = String(join.requesterUid || ""); if (!requesterUid) throw new HttpsError("failed-precondition", "The join request has no requester.");
    if (memberUids.includes(requesterUid)) { tx.update(requestRef, { status: "approved", decidedAt: FieldValue.serverTimestamp(), decidedByUid: uid, alreadyMember: true }); return { status: "approved", requesterUid }; }
    const requesterSnapshot = await tx.get(db.collection("users").doc(requesterUid)); const requester = requesterSnapshot.data() || {};
    if (requester.familyId && String(requester.familyId) !== family.id) throw new HttpsError("failed-precondition", "That account is already connected to another Tiny Titans family.");
    const role = join.requesterRole === "child" ? "child" : "adult";
    const member = { uid: requesterUid, displayName: String(join.requesterDisplayName || requester.displayName || "Family Member"), email: String(join.requesterEmail || requester.email || "").trim().toLowerCase(), role, ageBand: typeof requester.ageBand === "string" ? requester.ageBand : undefined, experienceLevel: typeof requester.experienceLevel === "string" ? requester.experienceLevel : undefined, joinedAt: new Date() };
    tx.update(db.collection("families").doc(family.id), { memberUids: FieldValue.arrayUnion(requesterUid), members: FieldValue.arrayUnion(member), updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("users").doc(requesterUid), { familyId: family.id, familyRole: role }, { merge: true }); tx.update(requestRef, { status: "approved", decidedAt: FieldValue.serverTimestamp(), decidedByUid: uid });
    return { status: "approved", requesterUid };
  });
  return result;
});
