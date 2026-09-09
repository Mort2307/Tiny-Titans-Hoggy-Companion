const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();
const MAX_COMMENT_LENGTH = 2000;
const MIN_COMMENT_INTERVAL_MS = 8000;
const MIN_REPORT_INTERVAL_MS = 5000;
const COMMENT_LIMIT = 50;

function cleanText(value) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
}
function isCreator(request, profile) {
  const claims = request.auth?.token || {};
  return claims.admin === true || claims.creator === true || profile?.role === 'admin' || profile?.profileType === 'creator';
}
function canReadAudience(request, audience) {
  const claims = request.auth?.token || {};
  if (audience === 'everyone') return true;
  if (audience === 'testers') return claims.admin === true || claims.tester === true || claims.creator === true;
  if (audience === 'admin') return claims.admin === true || claims.creator === true;
  return false;
}
async function getProfile(uid) { return (await db.collection('users').doc(uid).get()).data() || {}; }
async function assertMessagingConsent(uid) {
  const privacy = (await db.collection('users').doc(uid).collection('settings').doc('privacy').get()).data() || {};
  if (privacy.communityMessaging !== true) throw new HttpsError('permission-denied', 'Community messaging is disabled for this account.');
}
async function assertPostExists(postId, request) {
  if (!postId || postId.length > 160) throw new HttpsError('invalid-argument', 'A valid community post is required.');
  const post = await db.collection('communityPosts').doc(postId).get();
  if (!post.exists) throw new HttpsError('not-found', 'That community post no longer exists.');
  const data = post.data() || {};
  const audience = String(data.audience || 'everyone');
  if (!['everyone', 'testers', 'admin'].includes(audience)) throw new HttpsError('failed-precondition', 'Comments are not available on this post.');
  if (!canReadAudience(request, audience)) throw new HttpsError('permission-denied', 'You do not have access to this community post.');
  return data;
}
async function enforceRateLimit(uid, kind, intervalMs) {
  const ref = db.collection('communityInteractionRateLimits').doc(`${kind}:${uid}`);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const last = Number(snapshot.data()?.lastAtMs || 0);
    if (now - last < intervalMs) throw new HttpsError('resource-exhausted', 'Please wait a few seconds before trying again.');
    transaction.set(ref, { lastAtMs: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}
function createdAtMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Date.now();
}
exports.getCommunityPostComments = onCall({ region: 'europe-west2', memory: '256MiB', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const postId = cleanText(request.data?.postId);
  await assertPostExists(postId, request);
  const snapshot = await db.collection('communityPosts').doc(postId).collection('comments').orderBy('createdAt', 'desc').limit(COMMENT_LIMIT).get();
  return { comments: snapshot.docs.map((doc) => { const data = doc.data() || {}; return { id: doc.id, postId, text: String(data.text || ''), authorName: String(data.authorName || 'Anonymous keeper'), authorIsCreator: data.authorIsCreator === true, createdAt: createdAtMillis(data.createdAt), canDelete: data.authorUid === request.auth.uid }; }), hasMore: snapshot.size === COMMENT_LIMIT };
});
exports.createCommunityPostComment = onCall({ region: 'europe-west2', memory: '256MiB', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  await assertMessagingConsent(request.auth.uid);
  const postId = cleanText(request.data?.postId);
  const text = cleanText(request.data?.text);
  await assertPostExists(postId, request);
  if (!text) throw new HttpsError('invalid-argument', 'Write a comment before posting.');
  if (text.length > MAX_COMMENT_LENGTH) throw new HttpsError('invalid-argument', `Comments are limited to ${MAX_COMMENT_LENGTH} characters.`);
  await enforceRateLimit(request.auth.uid, 'comment', MIN_COMMENT_INTERVAL_MS);
  const profile = await getProfile(request.auth.uid);
  const authorName = cleanText(profile.communityDisplayName || profile.displayName || request.auth.token.name || 'Anonymous keeper').slice(0, 80) || 'Anonymous keeper';
  const creator = isCreator(request, profile);
  const commentRef = db.collection('communityPosts').doc(postId).collection('comments').doc();
  await commentRef.set({ postId, text, authorUid: request.auth.uid, authorName, authorIsCreator: creator, createdAt: FieldValue.serverTimestamp() });
  return { id: commentRef.id, postId, text, authorName, authorIsCreator: creator, createdAt: Date.now(), canDelete: true };
});
exports.deleteCommunityPostComment = onCall({ region: 'europe-west2', memory: '256MiB', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const postId = cleanText(request.data?.postId);
  const commentId = cleanText(request.data?.commentId);
  await assertPostExists(postId, request);
  if (!commentId || commentId.length > 160) throw new HttpsError('invalid-argument', 'A valid comment is required.');
  const profile = await getProfile(request.auth.uid);
  const ref = db.collection('communityPosts').doc(postId).collection('comments').doc(commentId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { success: true };
  const data = snapshot.data() || {};
  if (data.authorUid !== request.auth.uid && !isCreator(request, profile)) throw new HttpsError('permission-denied', 'You can only delete your own comment.');
  await ref.delete();
  return { success: true };
});
exports.reportCommunityPostComment = onCall({ region: 'europe-west2', memory: '256MiB', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  const postId = cleanText(request.data?.postId);
  const commentId = cleanText(request.data?.commentId);
  const reason = cleanText(request.data?.reason).slice(0, 120);
  if (!postId || !commentId || !reason) throw new HttpsError('invalid-argument', 'A comment and report reason are required.');
  await assertPostExists(postId, request);
  const comment = await db.collection('communityPosts').doc(postId).collection('comments').doc(commentId).get();
  if (!comment.exists) throw new HttpsError('not-found', 'That comment no longer exists.');
  await enforceRateLimit(request.auth.uid, 'report', MIN_REPORT_INTERVAL_MS);
  await db.collection('communityCommentReports').add({ postId, commentId, reporterUid: request.auth.uid, reason, status: 'open', createdAt: FieldValue.serverTimestamp() });
  return { success: true };
});
