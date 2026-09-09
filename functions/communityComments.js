const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();
const MAX_COMMENT_LENGTH = 2000;
const MIN_COMMENT_INTERVAL_MS = 8000;
const COMMENT_LIMIT = 50;

function cleanText(value) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCreator(request, profile) {
  const claims = request.auth?.token || {};
  return claims.admin === true || claims.creator === true || profile?.role === "admin" || profile?.profileType === "creator";
}

async function getProfile(uid) {
  return (await db.collection("users").doc(uid).get()).data() || {};
}

async function assertMessagingConsent(uid) {
  const privacy = (await db.collection("users").doc(uid).collection("settings").doc("privacy").get()).data() || {};
  if (privacy.communityMessaging !== true) {
    throw new HttpsError("permission-denied", "Community messaging is disabled for this account.");
  }
}

async function assertPostExists(postId) {
  const normalized = cleanText(postId);
  if (!normalized || normalized.length > 160) throw new HttpsError("invalid-argument", "A valid community post is required.");
  const post = await db.collection("communityPosts").doc(normalized).get();
  if (!post.exists) throw new HttpsError("not-found", "That community post no longer exists.");
  const data = post.data() || {};
  if (!["everyone", "testers", "admin"].includes(String(data.audience || "everyone"))) throw new HttpsError("failed-precondition", "Comments are not available on this post.");
  return data;
}

async function enforceRateLimit(uid) {
  const ref = db.collection("communityCommentRateLimits").doc(uid);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const last = Number(snapshot.data()?.lastCommentAtMs || 0);
    if (now - last < MIN_COMMENT_INTERVAL_MS) throw new HttpsError("resource-exhausted", "Please wait a few seconds before posting another comment.");
    transaction.set(ref, { lastCommentAtMs: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

exports.getCommunityPostComments = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const postId = cleanText(request.data?.postId);
  if (!postId) throw new HttpsError("invalid-argument", "A community post ID is required.");
  await assertPostExists(postId);
  const snapshot = await db.collection("communityPosts").doc(postId).collection("comments").orderBy("createdAt", "desc").limit(COMMENT_LIMIT).get();
  const comments = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      postId,
      text: String(data.text || ""),
      authorName: String(data.authorName || "Anonymous keeper"),
      authorIsCreator: data.authorIsCreator === true,
      createdAt: data.createdAt?.toMillis?.() ?? Date.parse(String(data.createdAt || "")) || Date.now(),
      canDelete: data.authorUid === request.auth.uid,
    };
  });
  return { comments, hasMore: comments.length === COMMENT_LIMIT };
});

exports.createCommunityPostComment = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await assertMessagingConsent(request.auth.uid);
  const postId = cleanText(request.data?.postId);
  const text = cleanText(request.data?.text);
  await assertPostExists(postId);
  if (!text) throw new HttpsError("invalid-argument", "Write a comment before posting.");
  if (text.length > MAX_COMMENT_LENGTH) throw new HttpsError("invalid-argument", `Comments are limited to ${MAX_COMMENT_LENGTH} characters.`);
  await enforceRateLimit(request.auth.uid);

  const profile = await getProfile(request.auth.uid);
  const authorName = cleanText(profile.displayName || profile.communityDisplayName || request.auth.token.name || "Anonymous keeper").slice(0, 80) || "Anonymous keeper";
  const creator = isCreator(request, profile);
  const commentRef = db.collection("communityPosts").doc(postId).collection("comments").doc();
  await commentRef.set({
    postId,
    text,
    authorUid: request.auth.uid,
    authorName,
    authorIsCreator: creator,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: commentRef.id, postId, text, authorName, authorIsCreator: creator, createdAt: Date.now(), canDelete: true };
});

exports.deleteCommunityPostComment = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const postId = cleanText(request.data?.postId);
  const commentId = cleanText(request.data?.commentId);
  if (!postId || !commentId) throw new HttpsError("invalid-argument", "A post and comment are required.");
  await assertPostExists(postId);
  const profile = await getProfile(request.auth.uid);
  const ref = db.collection("communityPosts").doc(postId).collection("comments").doc(commentId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { success: true };
  const data = snapshot.data() || {};
  if (data.authorUid !== request.auth.uid && !isCreator(request, profile)) throw new HttpsError("permission-denied", "You can only delete your own comment.");
  await ref.delete();
  return { success: true };
});

exports.reportCommunityPostComment = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 30 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const postId = cleanText(request.data?.postId);
  const commentId = cleanText(request.data?.commentId);
  const reason = cleanText(request.data?.reason).slice(0, 120);
  if (!postId || !commentId || !reason) throw new HttpsError("invalid-argument", "A comment and report reason are required.");
  await assertPostExists(postId);
  const comment = await db.collection("communityPosts").doc(postId).collection("comments").doc(commentId).get();
  if (!comment.exists) throw new HttpsError("not-found", "That comment no longer exists.");
  await db.collection("communityCommentReports").add({
    postId,
    commentId,
    reporterUid: request.auth.uid,
    reason,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
});
