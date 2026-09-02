const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const adminAuth = getAuth();
const db = getFirestore();
const INVITATION_ID = "creator-tester";
const INVITATION_DAYS = 14;
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

function ownerAccount(request) {
  return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

function invitationRef(uid) {
  return db.collection("users").doc(uid).collection("creatorTesterInvitations").doc(INVITATION_ID);
}

async function createCreatorTesterInvitation(actorUid, targetUid) {
  if (actorUid !== targetUid) throw new HttpsError("permission-denied", "Creator Tester access is owner-only and cannot be granted to another account.");
  const target = await adminAuth.getUser(targetUid);
  const targetEmail = String(target.email || "").trim().toLowerCase();
  if (targetEmail !== OWNER_EMAIL) throw new HttpsError("permission-denied", "Creator Tester access is restricted to the Tiny Titans owner account.");
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITATION_DAYS * 86400000);
  const ref = invitationRef(targetUid);
  const payload = { id: INVITATION_ID, status: "pending", targetUid, targetEmail: target.email || "", invitedByUid: actorUid, invitedAt: FieldValue.serverTimestamp(), expiresAt };
  await ref.set(payload, { merge: false });
  return { id: INVITATION_ID, status: "pending", targetUid, targetEmail: target.email || "", invitedByUid: actorUid, expiresAt };
}

exports.getCreatorTesterInvitation = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!ownerAccount(request)) return { success: true, invitation: null };
  const snapshot = await invitationRef(request.auth.uid).get();
  if (!snapshot.exists) return { success: true, invitation: null };
  const data = snapshot.data() || {};
  if (data.status !== "pending") return { success: true, invitation: null };
  if (data.expiresAt?.toMillis && data.expiresAt.toMillis() < Date.now()) { await snapshot.ref.set({ status: "expired", expiredAt: FieldValue.serverTimestamp() }, { merge: true }); return { success: true, invitation: null }; }
  return { success: true, invitation: { ...data, id: snapshot.id } };
});

exports.acceptCreatorTesterInvitation = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!ownerAccount(request)) throw new HttpsError("permission-denied", "Creator Tester access is restricted to the Tiny Titans owner account.");
  const ref = invitationRef(request.auth.uid);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.status !== "pending") throw new HttpsError("failed-precondition", "There is no active Creator Tester invitation for this account.");
  const invitation = snapshot.data() || {};
  if (invitation.expiresAt?.toMillis && invitation.expiresAt.toMillis() < Date.now()) { await ref.set({ status: "expired", expiredAt: FieldValue.serverTimestamp() }, { merge: true }); throw new HttpsError("failed-precondition", "This Creator Tester invitation has expired."); }
  const target = await adminAuth.getUser(request.auth.uid);
  await adminAuth.setCustomUserClaims(request.auth.uid, { ...(target.customClaims || {}), creator: true, tester: true, admin: true, creatorTester: true });
  await ref.set({ status: "accepted", acceptedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("users").doc(request.auth.uid).set({ isTester: true, testerType: "creator", testerInvitationStatus: "accepted", testerAcceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid: request.auth.uid, invitedByUid: invitation.invitedByUid || null, action: "accept_creator_tester_invitation", createdAt: FieldValue.serverTimestamp() });
  return { success: true, creator: true, tester: true, admin: true, creatorTester: true, refreshRequired: true };
});

exports.declineCreatorTesterInvitation = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!ownerAccount(request)) return { success: true };
  const ref = invitationRef(request.auth.uid);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.status !== "pending") return { success: true };
  await ref.set({ status: "declined", declinedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("users").doc(request.auth.uid).set({ isTester: false, testerType: null, testerInvitationStatus: "declined", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { success: true };
});

exports.createCreatorTesterInvitation = async (actorUid, targetUid) => {
  if (!actorUid || !targetUid) throw new HttpsError("invalid-argument", "Creator Tester invitation requires both actor and target user IDs.");
  return createCreatorTesterInvitation(actorUid, targetUid);
};
