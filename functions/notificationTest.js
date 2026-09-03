require("./notificationBranding");

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const adminAuth = getAuth();
const messaging = getMessaging();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const ICON_URL = `${PUBLIC_ORIGIN}/favicon.svg`;
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const MAX_COUNT = 20;
const MAX_TARGETS = 20;
const MAX_EVENTS = 100;

const TESTS = Object.freeze({
  feed: { title: "🧪 Test feed reminder — Tiny Titans", body: "This is a live feeding reminder test. Your Tiny Titans notification pipeline is working.", url: "/feeding" },
  weight: { title: "🧪 Test weight reminder — Tiny Titans", body: "This is a live weight reminder test. Your Tiny Titans notification pipeline is working.", url: "/weights" },
  shed: { title: "🧪 Test shed reminder — Tiny Titans", body: "This is a live shedding notification test. Your Tiny Titans notification pipeline is working.", url: "/shedding" },
  health: { title: "🧪 Test health reminder — Tiny Titans", body: "This is a live health / medication reminder test. Your Tiny Titans notification pipeline is working.", url: "/health" },
  general: { title: "🧪 Tiny Titans notification test", body: "Live notification delivery is working on this device.", url: "/account/settings" },
});

function authorisedAsTester(request) {
  const email = String(request.auth?.token?.email || "").trim().toLowerCase();
  return email === OWNER_EMAIL;
}

function requireTester(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!authorisedAsTester(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can run notification tests.");
  return request.auth.uid;
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

function makeEventKey(kind, targetUid, sequence = 0) {
  const safeKind = kind.replace(/[^a-z0-9-]/g, "-");
  const random = Math.random().toString(36).slice(2, 10);
  return `notification-test-${safeKind}-${Date.now()}-${sequence}-${random}-${targetUid.slice(0, 10)}`;
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
  await eventRef.set({ type: "notification-test", kind: "test", status: tokenDocs.length ? "sending" : "no-delivery", title: test.title, body: test.body, url: test.url, read: false, requestedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
  if (!tokenDocs.length) return { sent: 0, invalid: 0, failures: [] };
  let sent = 0;
  let invalid = 0;
  const failures = [];
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.data().token),
      notification: { title: test.title, body: test.body },
      data: { title: test.title, body: test.body, eventKey, url: test.url, notificationTest: "true" },
      webpush: { headers: { Urgency: "high" }, fcmOptions: { link }, notification: { icon: ICON_URL, badge: ICON_URL, tag: eventKey } },
    });
    sent += response.successCount;
    invalid += response.failureCount;
    response.responses.forEach((result, responseIndex) => {
      if (result.success) return;
      const code = result.error?.code || "messaging/unknown";
      failures.push({ tokenId: batch[responseIndex].id, code, message: result.error?.message || "FCM delivery failed." });
    });
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete();
    }));
  }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, failures, sentAt: FieldValue.serverTimestamp() }, { merge: true });
  return { sent, invalid, failures };
}

async function getTargetDirectory() {
  const snapshot = await db.collection("users").limit(100).get();
  const users = await Promise.all(snapshot.docs.map(async (userDocument) => {
    const data = userDocument.data() || {};
    const email = String(data.email || "").trim();
    if (!email) return null;
    const tokenSnapshot = await userDocument.ref.collection("notificationTokens").where("enabled", "==", true).get();
    const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
    const lastUpdated = tokenDocs.reduce((latest, item) => Math.max(latest, item.data().updatedAt?.toMillis?.() || 0), 0);
    return {
      uid: userDocument.id,
      email,
      displayName: String(data.displayName || data.name || email.split("@")[0] || "Tiny Titans user"),
      notificationSettingsEnabled: data.notificationSettings?.enabled === true,
      deviceReady: tokenDocs.length > 0,
      tokenCount: tokenDocs.length,
      lastTokenUpdatedAt: lastUpdated || null,
    };
  }));
  return users.filter(Boolean).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

exports.getNotificationTestUsers = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  requireTester(request);
  const users = await getTargetDirectory();
  return { users, count: users.length };
});

exports.sendNotificationTest = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  const requesterUid = requireTester(request);
  const kind = String(request.data?.kind || "");
  const test = TESTS[kind];
  if (!test) throw new HttpsError("invalid-argument", "Invalid notification test type.");
  const target = await resolveTargetUser(request.data?.targetUserId, request.data?.targetEmail, requesterUid);
  if (!target.exists) throw new HttpsError("not-found", "The target Tiny Titans user could not be found.");
  const eventKey = makeEventKey(kind, target.id);
  const result = await sendTestPush(target.id, eventKey, test);
  return { eventKey, targetUid: target.id, kind, title: test.title, body: test.body, url: test.url, status: result.sent > 0 ? "sent" : "no-delivery", sentCount: result.sent, invalidTokenCount: result.invalid, failures: result.failures };
});

exports.sendNotificationTestBatch = onCall({ region: "europe-west2", memory: "512MiB", timeoutSeconds: 120 }, async (request) => {
  const requesterUid = requireTester(request);
  const requestedKinds = Array.isArray(request.data?.kinds) ? request.data.kinds.map((kind) => String(kind)) : [];
  const kinds = [...new Set(requestedKinds)].filter((kind) => Object.prototype.hasOwnProperty.call(TESTS, kind));
  if (!kinds.length) throw new HttpsError("invalid-argument", "Choose at least one notification route to test.");
  const requestedCount = Number(request.data?.count ?? 1);
  const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(MAX_COUNT, Math.floor(requestedCount))) : 1;
  const requestedTargets = Array.isArray(request.data?.targetUserIds) ? request.data.targetUserIds.map((uid) => String(uid).trim()).filter(Boolean) : [];
  const uniqueTargetIds = [...new Set(requestedTargets)];
  if (uniqueTargetIds.length > MAX_TARGETS) throw new HttpsError("invalid-argument", `You can target up to ${MAX_TARGETS} users per test run.`);
  const targetIds = uniqueTargetIds.length ? uniqueTargetIds : [requesterUid];
  const eventCount = kinds.length * count * targetIds.length;
  if (eventCount > MAX_EVENTS) throw new HttpsError("invalid-argument", `That test would create ${eventCount} notification events. Reduce the number of routes, targets or repetitions; the limit is ${MAX_EVENTS} events per run.`);

  const targets = [];
  for (const targetId of targetIds) {
    const snapshot = await db.collection("users").doc(targetId).get();
    if (!snapshot.exists) throw new HttpsError("not-found", `Target user ${targetId} could not be found.`);
    targets.push(snapshot);
  }

  const results = [];
  let sequence = 0;
  for (const target of targets) {
    for (const kind of kinds) {
      const test = TESTS[kind];
      for (let repetition = 1; repetition <= count; repetition += 1) {
        sequence += 1;
        const eventKey = makeEventKey(kind, target.id, sequence);
        try {
          const result = await sendTestPush(target.id, eventKey, test);
          results.push({ sequence, targetUid: target.id, targetName: String(target.data()?.displayName || target.data()?.name || target.data()?.email || target.id), kind, repetition, eventKey, title: test.title, status: result.sent > 0 ? "sent" : "no-delivery", sentCount: result.sent, invalidTokenCount: result.invalid, failures: result.failures });
        } catch (error) {
          results.push({ sequence, targetUid: target.id, targetName: String(target.data()?.displayName || target.data()?.name || target.data()?.email || target.id), kind, repetition, eventKey, title: test.title, status: "failed", sentCount: 0, invalidTokenCount: 0, failures: [{ tokenId: "batch", code: error?.code || "unknown", message: error?.message || "Notification test failed." }] });
        }
      }
    }
  }
  const sent = results.reduce((sum, result) => sum + Number(result.sentCount || 0), 0);
  const noDelivery = results.filter((result) => result.status === "no-delivery").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const invalid = results.reduce((sum, result) => sum + Number(result.invalidTokenCount || 0), 0);
  const status = failed > 0 ? (sent > 0 ? "partial" : "failed") : sent > 0 ? (noDelivery > 0 ? "partial" : "sent") : "no-delivery";
  return { status, requestedEvents: eventCount, attemptedEvents: results.length, sentCount: sent, noDeliveryCount: noDelivery, failedCount: failed, invalidTokenCount: invalid, results, targetCount: targetIds.length, routeCount: kinds.length, repetitionCount: count };
});

Object.assign(exports, require("./submissionNotificationTest"));
