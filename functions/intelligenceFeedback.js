const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const ALLOWED = new Set(["helpful", "not-helpful", "wrong", "dismissed", "acted-on"]);
const MAX_TEXT = 500;
function clean(value) { return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim(); }

exports.recordIntelligenceFeedback = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const feedback = clean(request.data?.feedback).toLowerCase();
  const insightId = clean(request.data?.insightId);
  const engineVersion = clean(request.data?.engineVersion).slice(0, 80);
  const domain = clean(request.data?.domain).slice(0, 80);
  const animalId = clean(request.data?.animalId).slice(0, 160);
  const destination = clean(request.data?.destination).slice(0, 240);
  const note = clean(request.data?.note).slice(0, MAX_TEXT);
  if (!ALLOWED.has(feedback)) throw new HttpsError("invalid-argument", "Invalid intelligence feedback.");
  if (!insightId || insightId.length > 200) throw new HttpsError("invalid-argument", "An intelligence result ID is required.");

  await db.collection("intelligenceFeedback").add({ feedback, insightId, engineVersion, domain, animalId: animalId || null, destination: destination || null, note: note || null, uid: request.auth.uid, createdAt: FieldValue.serverTimestamp() });
  await db.collection("intelligenceFeedbackAggregates").doc(insightId).set({ insightId, engineVersion, domain, updatedAt: FieldValue.serverTimestamp(), counts: { [feedback]: FieldValue.increment(1) } }, { merge: true });
  return { success: true };
});
