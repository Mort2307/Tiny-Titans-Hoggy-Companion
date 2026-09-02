const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();

async function creatorUids() {
  const [admins, creators] = await Promise.all([
    db.collection("users").where("role", "==", "admin").get(),
    db.collection("users").where("profileType", "==", "creator").get(),
  ]);
  return [...new Set([...admins.docs, ...creators.docs].map((snap) => snap.id))];
}

async function displayName(uid) {
  if (!uid) return "Anonymous user";
  const snap = await db.collection("users").doc(uid).get();
  return String(snap.data()?.displayName || "Anonymous user").trim() || "Anonymous user";
}

function isInvalidTokenCode(code) {
  return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
}

async function emit(uid, payload) {
  if (!uid) return;
  const eventRef = await db.collection("users").doc(uid).collection("notificationEvents").add({ ...payload, read: false, createdAt: FieldValue.serverTimestamp() });
  const tokenSnapshot = await db.collection("users").doc(uid).collection("notificationTokens").where("enabled", "==", true).get().catch(() => null);
  const tokenDocs = tokenSnapshot ? tokenSnapshot.docs.filter((snap) => typeof snap.data().token === "string" && snap.data().token.length > 0) : [];
  if (!tokenDocs.length) return;

  try {
    for (let index = 0; index < tokenDocs.length; index += 500) {
      const batch = tokenDocs.slice(index, index + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((snap) => snap.data().token),
        notification: { title: payload.title, body: payload.body },
        data: { eventKey: eventRef.id, title: payload.title, body: payload.body, url: payload.url || "/" },
        webpush: {
          fcmOptions: { link: `https://tinytitans-hoggy-companion.web.app${payload.url || "/"}` },
          notification: { icon: "/favicon.svg", badge: "/favicon.svg", tag: eventRef.id },
        },
      });
      await Promise.all(response.responses.map((result, responseIndex) => {
        if (!result.success && isInvalidTokenCode(result.error?.code || "")) return batch[responseIndex].ref.delete().catch(() => undefined);
        return null;
      }));
    }
  } catch (error) {
    console.warn("Tiny Titans: support push delivery failed", error);
  }
}

async function emitCreators(payload) {
  await Promise.all((await creatorUids()).map((uid) => emit(uid, payload)));
}

exports.notifyCreatorOnIssueReport = onDocumentCreated({ region: "europe-west2", document: "issueReports/{reportId}" }, async (event) => {
  const data = event.data?.data() || {};
  const who = await displayName(String(data.userId || ""));
  await emitCreators({ eventType: "support-submission", kind: "bug", parentId: event.params.reportId, title: "🐛 New bug report", body: `${who} submitted: ${String(data.title || "Bug report")}`, url: `/creator/conversations?thread=bug:${event.params.reportId}` });
});

exports.notifyCreatorOnFeedback = onDocumentCreated({ region: "europe-west2", document: "feedback/{feedbackId}" }, async (event) => {
  const data = event.data?.data() || {};
  const who = await displayName(String(data.userId || ""));
  await emitCreators({ eventType: "support-submission", kind: "feedback", parentId: event.params.feedbackId, title: "💡 New feedback", body: `${who} submitted: ${String(data.title || "Feedback")}`, url: `/creator/conversations?thread=feedback:${event.params.feedbackId}` });
});

async function messageNotification(kind, parentId, message) {
  const parent = await db.collection(kind === "bug" ? "issueReports" : "feedback").doc(parentId).get();
  if (!parent.exists) return;
  const data = parent.data() || {};
  const senderRole = String(message.senderRole || "");
  const senderId = String(message.senderId || "");
  const title = String(data.title || (kind === "bug" ? "Bug report" : "Feedback"));
  if (senderRole === "user") {
    const who = await displayName(senderId);
    await emitCreators({ eventType: "support-message", kind, parentId, title: "💬 New support reply", body: `${who} replied to: ${title}`, url: `/creator/conversations?thread=${kind}:${parentId}` });
  } else if (senderRole === "creator" && data.userId) {
    await emit(String(data.userId), { eventType: "support-message", kind, parentId, title: "🐍 Tiny Titans replied", body: `You have a new message about: ${title}`, url: `/conversations?thread=${kind}:${parentId}` });
  }
}

exports.notifyOnIssueMessage = onDocumentCreated({ region: "europe-west2", document: "issueReports/{reportId}/messages/{messageId}" }, async (event) => messageNotification("bug", event.params.reportId, event.data?.data() || {}));
exports.notifyOnFeedbackMessage = onDocumentCreated({ region: "europe-west2", document: "feedback/{feedbackId}/messages/{messageId}" }, async (event) => messageNotification("feedback", event.params.feedbackId, event.data?.data() || {}));
