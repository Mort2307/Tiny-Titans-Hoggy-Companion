const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

async function sendPush(uid, eventKey, title, body, url) {
  const userRef = db.collection("users").doc(uid);
  const profile = await userRef.get();
  const settings = profile.data()?.notificationSettings || {};
  if (settings.enabled !== true) return { sent: 0, invalid: 0 };
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  const existing = await eventRef.get();
  if (existing.exists) return { sent: 0, invalid: 0, duplicate: true };
  const tokenSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  if (!tokenDocs.length) {
    await eventRef.set({ type: "family", status: "no-delivery", title, body, url, createdAt: FieldValue.serverTimestamp() });
    return { sent: 0, invalid: 0 };
  }
  await eventRef.set({ type: "family", status: "sending", title, body, url, createdAt: FieldValue.serverTimestamp() });
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({ tokens: batch.map((item) => item.data().token), data: { title, body, eventKey, url } });
    sent += response.successCount;
    invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true });
  return { sent, invalid };
}

async function findUserByEmail(email) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised) return null;
  const snapshot = await db.collection("users").where("email", "==", normalised).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

exports.sendFamilyInvitationNotification = onDocumentCreated({ document: "familyInvites/{inviteId}", region: "europe-west2" }, async (event) => {
  const invite = event.data?.data();
  if (!invite || invite.status !== "pending") return;
  const target = await findUserByEmail(invite.targetEmail);
  if (!target) return;
  const owner = await db.collection("users").doc(String(invite.ownerUid || "")).get();
  const ownerName = String(owner.data()?.displayName || owner.data()?.name || "A Tiny Titans family member");
  await sendPush(target.id, `family-invite-${event.params.inviteId}`, "👨‍👩‍👦 Tiny Titans Family Invitation", `${ownerName} has invited you to join their Tiny Titans Family.`, "/account/family");
});

exports.sendFamilyApprovalNotification = onDocumentCreated({ document: "familyApprovals/{approvalId}", region: "europe-west2" }, async (event) => {
  const approval = event.data?.data();
  if (!approval || approval.status !== "pending" || !approval.familyId) return;
  const family = await db.collection("families").doc(String(approval.familyId)).get();
  const ownerUid = String(family.data()?.ownerUid || "");
  if (!ownerUid || ownerUid === String(approval.requesterUid || "")) return;
  const requesterName = String(approval.requesterName || "A family member");
  await sendPush(ownerUid, `family-approval-${event.params.approvalId}`, "🔐 Tiny Titans Approval Needed", `${requesterName} needs your approval for: ${String(approval.title || "a family change")}.`, "/account/family");
});

exports.sendFamilyApprovalDecisionNotification = onDocumentUpdated({ document: "familyApprovals/{approvalId}", region: "europe-west2" }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === after.status || !["approved", "rejected"].includes(after.status)) return;
  const requesterUid = String(after.requesterUid || "");
  if (!requesterUid) return;
  const title = after.status === "approved" ? "🟢 Tiny Titans Change Approved" : "🔴 Tiny Titans Change Declined";
  const body = after.status === "approved" ? `${String(after.title || "Your requested change")} has been approved and applied to the family record.` : `${String(after.title || "Your requested change")} was declined by the Family Owner.`;
  await sendPush(requesterUid, `family-approval-decision-${event.params.approvalId}-${after.status}`, title, body, "/account/family");
});

/** Live QA probe. The target is always the authenticated caller; no target UID is accepted. */
exports.runNotificationBotProbe = onCall({ region: "europe-west2" }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in to run the Notification BOT.");
  const profile = await db.collection("users").doc(uid).get();
  const data = profile.data() || {};
  const claims = request.auth.token || {};
  const authorised = claims.admin === true || claims.creator === true || claims.creatorTester === true || data.role === "admin" || data.profileType === "creator";
  if (!authorised) throw new HttpsError("permission-denied", "Creator or Creator Tester authorization is required.");

  const eventKey = String(request.data?.eventKey || "").trim();
  if (!/^notification-bot-[a-z0-9-]{10,80}$/.test(eventKey)) throw new HttpsError("invalid-argument", "Invalid notification BOT event key.");

  const title = "🤖 Tiny Titans Notification BOT";
  const body = "Live notification probe passed through the production notification pipeline.";
  const url = "/settings";
  const eventRef = db.collection("users").doc(uid).collection("notificationEvents").doc(eventKey);
  const existing = await eventRef.get();
  if (existing.exists) throw new HttpsError("already-exists", "Notification BOT event key already exists.");

  const tokensSnapshot = await db.collection("users").doc(uid).collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokensSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  if (!tokenDocs.length) {
    await eventRef.set({ type: "notification-bot-probe", status: "no-delivery", title, body, url, sentCount: 0, invalidTokenCount: 0, createdAt: FieldValue.serverTimestamp() });
    return { eventKey, status: "no-delivery", sentCount: 0, invalidTokenCount: 0, title, body, url };
  }

  await eventRef.set({ type: "notification-bot-probe", status: "sending", title, body, url, createdAt: FieldValue.serverTimestamp() });
  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({ tokens: batch.map((item) => item.data().token), data: { title, body, eventKey, url } });
    sent += response.successCount;
    invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  const status = sent > 0 ? "sent" : "failed";
  await eventRef.set({ status, sentCount: sent, invalidTokenCount: invalid, completedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { eventKey, status, sentCount: sent, invalidTokenCount: invalid, title, body, url };
});
