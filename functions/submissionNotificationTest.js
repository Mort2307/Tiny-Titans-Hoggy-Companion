require("./notificationBranding");

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const ICON_URL = `${PUBLIC_ORIGIN}/favicon.svg`;
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

const SUBMISSION_TESTS = Object.freeze([
  { kind: "bug", label: "Bug report", description: "Tests the Creator bug/error notification path.", title: "🐛 TEST — Bug report", body: "Error: Synthetic test error from the Submission Notification BOT. No real bug was submitted." },
  { kind: "feedback", label: "Feedback", description: "Tests the general feedback notification path.", title: "💬 TEST — Feedback", body: "Synthetic feedback submission from the Submission Notification BOT." },
  { kind: "morph-image", label: "Morph image submission", description: "Tests morph image/evidence review notification delivery.", title: "🧬 TEST — Morph image submission", body: "Synthetic morph image/evidence submission from the Submission Notification BOT." },
  { kind: "morph-terminology", label: "Morph terminology", description: "Tests user-submitted morph terminology notification delivery.", title: "🌎 TEST — Morph terminology", body: "Synthetic morph terminology contribution from the Submission Notification BOT." },
  { kind: "behaviour", label: "Behaviour observation", description: "Tests Behaviour Observatory review notification delivery.", title: "🐍 TEST — Behaviour observation", body: "Synthetic behaviour observation from the Submission Notification BOT." },
  { kind: "mentor", label: "Mentor application", description: "Tests mentor application notification delivery.", title: "🛡️ TEST — Mentor application", body: "Synthetic mentor application from the Submission Notification BOT." },
  { kind: "founder", label: "Founder application", description: "Tests Founder application notification delivery.", title: "🏆 TEST — Founder application", body: "Synthetic Founder application from the Submission Notification BOT." },
  { kind: "community", label: "Community contribution", description: "Tests wider community contribution notification delivery.", title: "🌍 TEST — Community contribution", body: "Synthetic community contribution from the Submission Notification BOT." },
  { kind: "feature", label: "Feature request", description: "Tests feature request notification delivery.", title: "💡 TEST — Feature request", body: "Synthetic feature request from the Submission Notification BOT." },
]);
const TEST_BY_KIND = new Map(SUBMISSION_TESTS.map((test) => [test.kind, test]));

function authorisedAsTester(request) {
  return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

async function requireTester(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!authorisedAsTester(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can run submission notification tests.");
  return uid;
}

function makeRunId(uid) {
  return `submission-notification-run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${uid.slice(0, 8)}`;
}

function botUrl(runId, itemId) {
  return `/creator/tester?submissionNotifications=1&submissionNotificationRun=${encodeURIComponent(runId)}&submissionNotificationItem=${encodeURIComponent(itemId)}`;
}

function itemSnapshot(doc) {
  return { id: doc.id, ...doc.data() };
}

async function getRunBundle(uid, runId) {
  const runRef = db.collection("users").doc(uid).collection("notificationSubmissionTestRuns").doc(runId);
  const runSnapshot = await runRef.get();
  if (!runSnapshot.exists) throw new HttpsError("not-found", "That submission notification test run no longer exists.");
  const itemsSnapshot = await runRef.collection("items").orderBy("order").get();
  return { runRef, run: runSnapshot.data() || {}, items: itemsSnapshot.docs.map(itemSnapshot) };
}

async function resolveTargetUser(targetUserId, requesterUid) {
  const targetUid = String(targetUserId || "").trim() || requesterUid;
  const snapshot = await db.collection("users").doc(targetUid).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "The target Tiny Titans user could not be found.");
  const data = snapshot.data() || {};
  return {
    uid: snapshot.id,
    name: String(data.displayName || data.name || data.email || "Tiny Titans user"),
    email: String(data.email || ""),
  };
}

function normaliseSelectedKinds(value) {
  const requested = Array.isArray(value) ? value.map((kind) => String(kind).trim()) : [];
  const selected = [...new Set(requested)].filter((kind) => TEST_BY_KIND.has(kind));
  if (!selected.length) throw new HttpsError("invalid-argument", "Choose at least one submission notification to test.");
  if (selected.length > SUBMISSION_TESTS.length) throw new HttpsError("invalid-argument", "Too many submission notification types were selected.");
  if (selected.length !== requested.length) throw new HttpsError("invalid-argument", "One or more selected submission notification types are invalid.");
  return selected;
}

function publicRun(runId, uid, run, items) {
  return {
    id: runId,
    ownerUid: uid,
    delayMinutes: Number(run.delayMinutes || 0),
    status: run.status || "running",
    targetUid: String(run.targetUid || uid),
    targetName: String(run.targetName || "Tiny Titans user"),
    targetEmail: String(run.targetEmail || ""),
    selectedKinds: Array.isArray(run.selectedKinds) ? run.selectedKinds : items.map((item) => item.kind),
    createdAt: run.createdAt || null,
    completedAt: run.completedAt || null,
    itemCount: Number(run.itemCount || items.length),
    items: items.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    summary: run.summary || undefined,
  };
}

exports.startSubmissionNotificationTest = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  const uid = await requireTester(request);
  const requestedDelay = Number(request.data?.delayMinutes ?? 0);
  const delayMinutes = Number.isFinite(requestedDelay) ? Math.max(0, Math.min(10, Math.floor(requestedDelay))) : 0;
  const selectedKinds = normaliseSelectedKinds(request.data?.selectedKinds);
  const target = await resolveTargetUser(request.data?.targetUserId, uid);
  const runId = makeRunId(uid);
  const runRef = db.collection("users").doc(uid).collection("notificationSubmissionTestRuns").doc(runId);
  await runRef.set({ status: "running", delayMinutes, targetUid: target.uid, targetName: target.name, targetEmail: target.email, selectedKinds, itemCount: selectedKinds.length, sentCount: 0, openedCount: 0, acceptedCount: 0, createdAt: FieldValue.serverTimestamp() });
  const batch = db.batch();
  selectedKinds.forEach((kind, index) => {
    const test = TEST_BY_KIND.get(kind);
    const itemRef = runRef.collection("items").doc(`item-${String(index + 1).padStart(2, "0")}`);
    batch.set(itemRef, { order: index + 1, kind: test.kind, label: test.label, description: test.description, targetUid: target.uid, targetName: target.name, targetEmail: target.email, status: "pending", sentCount: 0, failureCount: 0 });
  });
  await batch.commit();
  const bundle = await getRunBundle(uid, runId);
  return publicRun(runId, uid, bundle.run, bundle.items);
});

exports.sendNextSubmissionNotificationTest = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  const uid = await requireTester(request);
  const runId = String(request.data?.runId || "").trim();
  if (!runId) throw new HttpsError("invalid-argument", "A test run ID is required.");
  const bundle = await getRunBundle(uid, runId);
  if (bundle.run.status !== "running") throw new HttpsError("failed-precondition", "This notification test run is no longer active.");
  const items = [...bundle.items].sort((a, b) => Number(a.order) - Number(b.order));
  const next = items.find((item) => item.status === "pending");
  if (!next) throw new HttpsError("failed-precondition", "There are no pending submission notification tests left. Use LAST ONE to finish the run.");
  const test = TEST_BY_KIND.get(next.kind);
  if (!test) throw new HttpsError("internal", `No notification definition exists for ${next.kind}.`);

  const targetUid = String(bundle.run.targetUid || next.targetUid || uid);
  const eventKey = `submission-sweep-${runId}-${next.id}`;
  const url = botUrl(runId, next.id);
  const userRef = db.collection("users").doc(targetUid);
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  const tokenSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  await bundle.runRef.collection("items").doc(next.id).update({ status: tokenDocs.length ? "sent" : "failed", eventKey, sentCount: 0, failureCount: 0, failureMessage: tokenDocs.length ? null : "No enabled notification token is registered for the target device." });
  await eventRef.set({ type: "notification-test", kind: "submission-sweep", sourceKind: next.kind, testRunId: runId, testItemId: next.id, title: test.title, body: test.body, url, read: false, targetUid, createdAt: FieldValue.serverTimestamp() });
  if (!tokenDocs.length) return { runId, item: { ...next, status: "failed", eventKey, failureCount: 1, failureMessage: "No enabled notification token is registered for the target device." } };

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenDocs.map((item) => item.data().token),
      notification: { title: test.title, body: test.body },
      data: { title: test.title, body: test.body, eventKey, url, notificationTest: "true", submissionNotificationTest: "true", testRunId: runId, testItemId: next.id },
      webpush: { headers: { Urgency: next.kind === "bug" ? "high" : "normal" }, fcmOptions: { link: `${PUBLIC_ORIGIN}${url}` }, notification: { icon: ICON_URL, badge: ICON_URL, tag: eventKey } },
    });
    const failures = response.responses.filter((result) => !result.success).map((result) => result.error?.message || result.error?.code || "FCM delivery failed.");
    await bundle.runRef.collection("items").doc(next.id).update({ status: response.successCount > 0 ? "sent" : "failed", sentCount: response.successCount, failureCount: response.failureCount, failureMessage: failures[0] || null, sentAt: FieldValue.serverTimestamp() });
    return { runId, item: { ...next, status: response.successCount > 0 ? "sent" : "failed", eventKey, sentCount: response.successCount, failureCount: response.failureCount, failureMessage: failures[0] || undefined } };
  } catch (error) {
    const message = error?.message || "FCM delivery failed.";
    await bundle.runRef.collection("items").doc(next.id).update({ status: "failed", failureCount: 1, failureMessage: message });
    throw new HttpsError("internal", message);
  }
});

exports.markSubmissionNotificationTestOpened = onCall({ region: "europe-west2" }, async (request) => {
  const uid = await requireTester(request);
  const runId = String(request.data?.runId || "").trim();
  const itemId = String(request.data?.itemId || "").trim();
  if (!runId || !itemId) throw new HttpsError("invalid-argument", "A test run and item are required.");
  const bundle = await getRunBundle(uid, runId);
  const item = bundle.items.find((entry) => entry.id === itemId);
  if (!item) throw new HttpsError("not-found", "That notification test item could not be found.");
  if (item.openedAt) return publicRun(runId, uid, bundle.run, bundle.items);
  await bundle.runRef.collection("items").doc(itemId).update({ status: "opened", openedAt: FieldValue.serverTimestamp(), readAt: FieldValue.serverTimestamp() });
  if (item.eventKey) await db.collection("users").doc(item.targetUid || bundle.run.targetUid || uid).collection("notificationEvents").doc(item.eventKey).set({ read: true, openedAt: FieldValue.serverTimestamp() }, { merge: true });
  await bundle.runRef.update({ openedCount: FieldValue.increment(1) });
  const refreshed = await getRunBundle(uid, runId);
  return publicRun(runId, uid, refreshed.run, refreshed.items);
});

exports.markSubmissionNotificationTestAccepted = onCall({ region: "europe-west2" }, async (request) => {
  const uid = await requireTester(request);
  const runId = String(request.data?.runId || "").trim();
  const itemId = String(request.data?.itemId || "").trim();
  if (!runId || !itemId) throw new HttpsError("invalid-argument", "A test run and item are required.");
  const bundle = await getRunBundle(uid, runId);
  const item = bundle.items.find((entry) => entry.id === itemId);
  if (!item) throw new HttpsError("not-found", "That notification test item could not be found.");
  if (!item.openedAt) throw new HttpsError("failed-precondition", "Open/read the notification before accepting it.");
  if (item.acceptedAt) return publicRun(runId, uid, bundle.run, bundle.items);
  await bundle.runRef.collection("items").doc(itemId).update({ status: "accepted", acceptedAt: FieldValue.serverTimestamp() });
  await bundle.runRef.update({ acceptedCount: FieldValue.increment(1) });
  const refreshed = await getRunBundle(uid, runId);
  return publicRun(runId, uid, refreshed.run, refreshed.items);
});

exports.getSubmissionNotificationTestRun = onCall({ region: "europe-west2" }, async (request) => {
  const uid = await requireTester(request);
  const runId = String(request.data?.runId || "").trim();
  if (!runId) throw new HttpsError("invalid-argument", "A test run ID is required.");
  const bundle = await getRunBundle(uid, runId);
  return publicRun(runId, uid, bundle.run, bundle.items);
});

exports.finishSubmissionNotificationTest = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  const uid = await requireTester(request);
  const runId = String(request.data?.runId || "").trim();
  if (!runId) throw new HttpsError("invalid-argument", "A test run ID is required.");
  const bundle = await getRunBundle(uid, runId);
  const items = bundle.items;
  const expected = items.length;
  const sent = items.filter((item) => Number(item.sentCount || 0) > 0).length;
  const opened = items.filter((item) => item.openedAt).length;
  const accepted = items.filter((item) => item.acceptedAt).length;
  const passed = items.filter((item) => Number(item.sentCount || 0) > 0 && item.openedAt && item.acceptedAt).length;
  const broken = expected - passed;
  const summary = { expected, sent, opened, accepted, passed, broken };
  await bundle.runRef.update({ status: "complete", completedAt: FieldValue.serverTimestamp(), summary });
  return publicRun(runId, uid, { ...bundle.run, status: "complete", summary }, items);
});
