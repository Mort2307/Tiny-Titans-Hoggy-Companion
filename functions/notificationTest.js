const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const adminAuth = getAuth();
const messaging = getMessaging();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";

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

function publicUrl(path) {
  const clean = String(path || "/").startsWith("/") ? String(path || "/") : `/${String(path || "/")}`;
  return `${PUBLIC_ORIGIN}${clean}`;
}

async function sendTestPush(targetUid, eventKey, test) {
  const userRef = db.collection("users").doc(targetUid);
  const tokensSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokensSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  const link = publicUrl(test.url);

  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  await eventRef.set({
    type: "notification-test",
    kind: "test",
    status: tokenDocs.length ? "sending" : "no-delivery",
    title: test.title,
    body: test.body,
    url: test.url,
    read: false,
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
      webpush: { fcmOptions: { link } },
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
  if (!authorisedAsTester(request, requesterProfile)) throw new HttpsError("permission-denied", "Creator or Creator Tester authorization is required.");

  const users = [];
  const snapshot = await db.collection("users").limit(100).get();
  for (const userDocument of snapshot.docs) {
    const data = userDocument.data() || {};
    const email = String(data.email || "").trim();
    if (!email) continue;
    users.push({ uid: userDocument.id, email, displayName: String(data.displayName || data.name || email.split("@")[0] || "Tiny Titans user") });
  }
  users.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { users, count: users.length };
});

exports.sendNotificationTest = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  const requesterUid = request.auth?.uid;
  if (!requesterUid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const requesterSnapshot = await db.collection("users").doc(requesterUid).get();
  const requesterProfile = requesterSnapshot.data() || {};
  if (!authorisedAsTester(request, requesterProfile)) throw new HttpsError("permission-denied", "Creator or Creator Tester authorization is required.");

  const kind = String(request.data?.kind || "");
  const test = TESTS[kind];
  if (!test) throw new HttpsError("invalid-argument", "Invalid notification test type.");

  const target = await resolveTargetUser(request.data?.targetUserId, request.data?.targetEmail, requesterUid);
  if (!target.exists) throw new HttpsError("not-found", "The target Tiny Titans user could not be found.");

  const eventKey = makeEventKey(kind, target.id);
  const result = await sendTestPush(target.id, eventKey, test);
  return { eventKey, targetUid: target.id, kind, title: test.title, body: test.body, url: test.url, status: result.sent > 0 ? "sent" : "no-delivery", sentCount: result.sent, invalidTokenCount: result.invalid };
});
