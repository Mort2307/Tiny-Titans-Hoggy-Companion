const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const adminAuth = getAuth();
const messaging = getMessaging();

const TESTS = Object.freeze({
  feed: { title: "🧪 Test feed reminder — Tiny Titans", body: "This is a live feeding reminder test. Your Tiny Titans notification pipeline is working.", url: "/feeding" },
  weight: { title: "🧪 Test weight reminder — Tiny Titans", body: "This is a live weight reminder test. Your Tiny Titans notification pipeline is working.", url: "/weights" },
  shed: { title: "🧪 Test shed reminder — Tiny Titans", body: "This is a live shedding reminder test. Your Tiny Titans notification pipeline is working.", url: "/shedding" },
  health: { title: "🧪 Test health reminder — Tiny Titans", body: "This is a live health / medication reminder test. Your Tiny Titans notification pipeline is working.", url: "/health" },
  general: { title: "🧪 Tiny Titans notification test", body: "Live notification delivery is working on this device.", url: "/settings" },
});

function authorisedAsTester(request, profile) {
  const claims = request.auth?.token || {};
  return claims.admin === true || claims.creator === true || claims.creatorTester === true || profile.role === "admin" || profile.profileType === "creator";
}

async function resolveTargetUser(targetUserId, targetEmail, requesterUid) {
  const uid = String(targetUserId || "").trim();
  if (uid) {
    const snapshot = await db.collection("users").doc(uid).get();
    if (!snapshot.exists) throw new HttpsError("not-found", "The target Tiny Titans user could not be found.");
    return snapshot;
  }

  const email = String(targetEmail || "").trim().toLowerCase();
  if (!email) return db.collection("users").doc(requesterUid).get();

  const byProfileEmail = await db.collection("users").where("email", "==", email).limit(1).get();
  if (!byProfileEmail.empty) return byProfileEmail.docs[0];

  try {
    const authUser = await adminAuth.getUserByEmail(email);
    const profile = await db.collection("users").doc(authUser.uid).get();
    if (profile.exists) return profile;
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  throw new HttpsError("not-found", "No Tiny Titans account was found for that email address.");
}

function makeEventKey(kind, targetUid) {
  const safeKind = kind.replace(/[^a-z0-9-]/g, "-");
  const random = Math.random().toString(36).slice(2, 10);
  return `notification-test-${safeKind}-${Date.now()}-${random}-${targetUid.slice(0, 10)}`;
}

async function sendTestPush(targetUid, eventKey, test) {
  const userRef = db.collection("users").doc(targetUid);
  const tokensSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokensSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);

  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  await eventRef.set({
    type: "notification-test",
    kind: "test",
    status: tokenDocs.length ? "sending" : "no-delivery",
    title: test.title,
    body: test.body,
    url: test.url,
    requestedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  if (!tokenDocs.length) return { sent: 0, invalid: 0 };

  let sent = 0;
  let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.data().token),
      notification: { title: test.title, body: test.body },
      data: { title: test.title, body: test.body, eventKey, url: test.url, notificationTest: "true" },
      webpush: { fcmOptions: { link: test.url } },
    });
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

exports.getNotificationTestUsers = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  const requesterUid = request.auth?.uid;
  if (!requesterUid) throw new HttpsError("unauthenticated", "You must be signed in.");

  const requesterSnapshot = await db.collection("users").doc(requesterUid).get();
  const requesterProfile = requesterSnapshot.data() || {};
  if (!authorisedAsTester(request, requesterProfile)) throw new HttpsError("permission-denied", "Creator authorization is required to view notification test targets.");

  const users = [];
  let pageToken;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    page.users.forEach((user) => {
      if (user.disabled || !user.email) return;
      users.push({ uid: user.uid, email: user.email.toLowerCase(), displayName: user.displayName || user.email.split("@")[0] });
    });
    pageToken = page.pageToken;
  } while (pageToken);

  users.sort((a, b) => a.email.localeCompare(b.email));
  return { users, count: users.length };
});

exports.sendNotificationTest = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  const requesterUid = request.auth?.uid;
  if (!requesterUid) throw new HttpsError("unauthenticated", "You must be signed in to send a Tiny Titans notification test.");

  const requesterSnapshot = await db.collection("users").doc(requesterUid).get();
  const requesterProfile = requesterSnapshot.data() || {};
  const targetUserId = String(request.data?.targetUserId || "").trim();
  const targetEmail = String(request.data?.targetEmail || "").trim();
  const kind = String(request.data?.kind || "general").trim().toLowerCase();
  const test = TESTS[kind];
  if (!test) throw new HttpsError("invalid-argument", "Unknown notification test type.");

  const authorized = authorisedAsTester(request, requesterProfile);
  if (targetUserId && targetUserId !== requesterUid && !authorized) throw new HttpsError("permission-denied", "Creator authorization is required to target another user.");
  if (targetEmail && targetEmail.toLowerCase() !== String(request.auth.token?.email || requesterProfile.email || "").toLowerCase() && !authorized) throw new HttpsError("permission-denied", "Creator authorization is required to target another user.");

  let targetSnapshot;
  try {
    targetSnapshot = await resolveTargetUser(targetUserId, targetEmail, requesterUid);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Notification test target resolution failed", error);
    throw new HttpsError("internal", "Unable to resolve the notification test target.");
  }
  if (!targetSnapshot?.exists) throw new HttpsError("not-found", "The notification target could not be found.");

  const targetUid = targetSnapshot.id;
  const eventKey = makeEventKey(kind, targetUid);
  const result = await sendTestPush(targetUid, eventKey, test);
  await db.collection("notificationTestAudit").add({ requesterUid, targetUid, kind, eventKey, sentCount: result.sent, invalidTokenCount: result.invalid, createdAt: FieldValue.serverTimestamp() });

  return {
    eventKey,
    targetUid,
    kind,
    title: test.title,
    body: test.body,
    url: test.url,
    status: result.sent > 0 ? "sent" : "no-delivery",
    sentCount: result.sent,
    invalidTokenCount: result.invalid,
  };
});
