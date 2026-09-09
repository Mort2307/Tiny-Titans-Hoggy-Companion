const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();
const ALLOWED = new Set(['helpful', 'not-helpful', 'wrong', 'dismissed', 'acted-on']);
const MAX_TEXT = 500;
const MAX_IDS = 50;
function clean(value) { return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim(); }
function feedbackDocId(uid, insightId) { return Buffer.from(`${uid}:${insightId}`).toString('base64url').slice(0, 700); }
function emptyCounts() { return { helpful: 0, 'not-helpful': 0, wrong: 0, dismissed: 0, 'acted-on': 0 }; }

exports.recordIntelligenceFeedback = onCall({ region: 'europe-west2', memory: '256MiB', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const feedback = clean(request.data?.feedback).toLowerCase();
  const insightId = clean(request.data?.insightId);
  const engineVersion = clean(request.data?.engineVersion).slice(0, 80);
  const domain = clean(request.data?.domain).slice(0, 80);
  const animalId = clean(request.data?.animalId).slice(0, 160);
  const destination = clean(request.data?.destination).slice(0, 240);
  const note = clean(request.data?.note).slice(0, MAX_TEXT);
  if (!ALLOWED.has(feedback)) throw new HttpsError('invalid-argument', 'Invalid intelligence feedback.');
  if (!insightId || insightId.length > 200) throw new HttpsError('invalid-argument', 'An intelligence result ID is required.');

  const feedbackRef = db.collection('intelligenceFeedback').doc(feedbackDocId(request.auth.uid, insightId));
  const aggregateRef = db.collection('intelligenceFeedbackAggregates').doc(insightId);
  let created = false;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(feedbackRef);
    if (existing.exists) return;
    transaction.set(feedbackRef, { feedback, insightId, engineVersion, domain, animalId: animalId || null, destination: destination || null, note: note || null, uid: request.auth.uid, createdAt: FieldValue.serverTimestamp() });
    transaction.set(aggregateRef, { insightId, engineVersion, domain, updatedAt: FieldValue.serverTimestamp(), counts: { [feedback]: FieldValue.increment(1) } }, { merge: true });
    created = true;
  });
  return { success: true, duplicate: !created };
});

exports.getIntelligenceFeedbackSignals = onCall({ region: 'europe-west2', memory: '256MiB', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const rawIds = Array.isArray(request.data?.insightIds) ? request.data.insightIds : [];
  const insightIds = [...new Set(rawIds.map((value) => clean(value)).filter((value) => value && value.length <= 200))].slice(0, MAX_IDS);
  if (!insightIds.length) return { signals: {} };
  const refs = insightIds.map((id) => db.collection('intelligenceFeedbackAggregates').doc(id));
  const snapshots = await db.getAll(...refs);
  const signals = Object.fromEntries(insightIds.map((id, index) => {
    const counts = { ...emptyCounts(), ...((snapshots[index].exists ? snapshots[index].data()?.counts : {}) || {}) };
    const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
    const positive = Number(counts.helpful || 0) + Number(counts['acted-on'] || 0);
    const negative = Number(counts['not-helpful'] || 0) + Number(counts.wrong || 0);
    return [id, { ...counts, total, positive, negative }];
  }));
  return { signals };
});
