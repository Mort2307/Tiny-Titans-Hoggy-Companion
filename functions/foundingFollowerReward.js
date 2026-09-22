const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const { NOTIFICATION_ICON, NOTIFICATION_BADGE } = require("./notificationBranding");

const db = getFirestore();
const adminAuth = getAuth();
const bucket = getStorage().bucket();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const CAMPAIGN_ID = "founding_follower_pro_30";
const CAMPAIGN_NAME = "Founding Follower Reward";
const TIER = "titan_pro";
const DURATION_DAYS = 30;
const DAY_MS = 86400000;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_PLATFORMS = new Set(["facebook", "instagram"]);
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";
const TIER_NAME = "Titan Pro";

function isOwnerRequest(request) {
  return String(request.auth?.token?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

function requireOwner(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  if (!isOwnerRequest(request)) throw new HttpsError("permission-denied", "Only the Tiny Titans owner can review Founding Follower claims.");
}

function claimRef(uid) {
  return db.collection("foundingFollowerClaims").doc(uid);
}

function validPlatform(value) {
  const platform = String(value || "").trim().toLowerCase();
  return ALLOWED_PLATFORMS.has(platform) ? platform : null;
}

function validScreenshotPath(uid, value) {
  const path = String(value || "").trim();
  const escapedUid = uid.replace(/[.*+?^$\\{}()|[\\]\\]/g, "\\$&");
  return new RegExp(`^founding-follower-claims/${escapedUid}/proof\\.(jpg|jpeg|png|webp)$`, "i").test(path) ? path : null;
}

async function verifyScreenshot(uid, screenshotPath) {
  const file = bucket.file(screenshotPath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError("failed-precondition", "The submitted screenshot could not be found. Please upload it again.");

  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size || 0);
  const contentType = String(metadata.contentType || "").toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new HttpsError("invalid-argument", "Only JPG, PNG and WebP screenshots are accepted.");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_SCREENSHOT_BYTES) throw new HttpsError("invalid-argument", "Screenshots must be 5 MB or smaller.");
  if (!screenshotPath.startsWith(`founding-follower-claims/${uid}/`)) throw new HttpsError("permission-denied", "The screenshot does not belong to this account.");
  return { sizeBytes: size, contentType };
}

async function grantFoundingFollowerTrial({ targetUid, actorUid, claimId }) {
  const targetAuth = await adminAuth.getUser(targetUid);
  const userRef = db.collection("users").doc(targetUid);
  const trialRef = db.collection("paidTrials").doc(targetUid);
  const currentTrialSnapshot = await trialRef.get();
  const currentTrial = currentTrialSnapshot.exists ? currentTrialSnapshot.data() || {} : null;
  const currentExpiry = currentTrial?.expiresAt && typeof currentTrial.expiresAt.toMillis === "function" ? currentTrial.expiresAt.toMillis() : new Date(String(currentTrial?.expiresAt || "")).getTime();
  if (currentTrial?.enabled === true && Number.isFinite(currentExpiry) && currentExpiry > Date.now()) {
    if (currentTrial.campaignId === CAMPAIGN_ID && currentTrial.grantClaimId === claimId) {
      return { expiresAt: currentExpiry, alreadyGranted: true };
    }
    throw new HttpsError("failed-precondition", "This account already has an active paid trial. Resolve that trial before approving the Founding Follower reward.");
  }

  const expiresAt = Timestamp.fromMillis(Date.now() + DURATION_DAYS * DAY_MS);
  const auditRef = db.collection("creatorAudit").doc();
  const trialData = {
    uid: targetUid,
    enabled: true,
    tier: TIER,
    durationDays: DURATION_DAYS,
    startedAt: FieldValue.serverTimestamp(),
    expiresAt,
    grantedByUid: actorUid,
    grantedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    campaignId: CAMPAIGN_ID,
    campaignName: CAMPAIGN_NAME,
    grantClaimId: claimId,
    grantSource: "founding-follower",
  };
  const batch = db.batch();
  batch.set(trialRef, trialData, { merge: true });
  batch.set(userRef, {
    paidTrial: {
      enabled: true,
      tier: TIER,
      durationDays: DURATION_DAYS,
      startedAt: FieldValue.serverTimestamp(),
      grantedAt: FieldValue.serverTimestamp(),
      grantedByUid: actorUid,
      campaignId: CAMPAIGN_ID,
      campaignName: CAMPAIGN_NAME,
      expiresAt,
    },
    paidAccessUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(auditRef, {
    actorUid,
    targetUid,
    claimId,
    action: "grant_founding_follower_trial",
    tier: TIER,
    durationDays: DURATION_DAYS,
    campaignId: CAMPAIGN_ID,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { expiresAt: expiresAt.toMillis(), alreadyGranted: false, targetName: String(targetAuth.displayName || targetAuth.email || "A Tiny Titans user") };
}

async function sendUserRewardNotification({ targetUid, targetName, expiresAt }) {
  const eventKey = `founding-follower-approved-${targetUid}-${expiresAt}`;
  const eventRef = db.collection("users").doc(targetUid).collection("notificationEvents").doc(eventKey);
  const title = "🎁 Your Tiny Titans reward is active";
  const body = `Your Founding Follower reward has been approved. ${TIER_NAME} is now active for 30 days.`;
  try {
    await eventRef.create({
      eventType: "founding-follower-reward",
      kind: "paid-tier",
      source: CAMPAIGN_ID,
      targetUid,
      targetName: targetName || "A Tiny Titans user",
      tier: TIER,
      tierName: TIER_NAME,
      title,
      body,
      url: "/founding-followers",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (error?.code !== 6 && error?.code !== "already-exists") throw error;
  }

  const tokenSnapshot = await db.collection("users").doc(targetUid).collection("notificationTokens").where("enabled", "==", true).get().catch(() => null);
  const tokenDocs = tokenSnapshot ? tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0) : [];
  let sentCount = 0;
  let invalidTokenCount = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: batch.map((item) => item.data().token),
      notification: { title, body },
      data: { eventKey, eventType: "founding-follower-reward", title, body, url: "/founding-followers" },
      webpush: { fcmOptions: { link: `${PUBLIC_ORIGIN}/founding-followers` }, notification: { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE, tag: eventKey } },
    });
    sentCount += response.successCount;
    invalidTokenCount += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => {
      const code = result.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        await batch[responseIndex].ref.delete().catch(() => undefined);
      }
    }));
  }
  await eventRef.set({
    status: sentCount > 0 ? "sent" : "no-delivery",
    sentCount,
    invalidTokenCount,
    deliveryUpdatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { sentCount, invalidTokenCount, eventKey };
}

exports.submitFoundingFollowerClaim = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const platform = validPlatform(request.data?.platform);
  const screenshotPath = validScreenshotPath(uid, request.data?.screenshotPath);
  if (!platform) throw new HttpsError("invalid-argument", "Choose Facebook or Instagram.");
  if (!screenshotPath) throw new HttpsError("invalid-argument", "The screenshot path is invalid. Please upload the screenshot again.");
  const screenshot = await verifyScreenshot(uid, screenshotPath);
  const ref = claimRef(uid);
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() || {};
    if (data.status === "approved") throw new HttpsError("already-exists", "Your Founding Follower reward has already been approved on this account.");
    if (data.status === "pending" || data.status === "processing") throw new HttpsError("already-exists", "Your Founding Follower claim is already awaiting review.");
  }
  await ref.set({
    userId: uid,
    campaignId: CAMPAIGN_ID,
    campaignName: CAMPAIGN_NAME,
    platform,
    screenshotPath,
    screenshotContentType: screenshot.contentType,
    screenshotSizeBytes: screenshot.sizeBytes,
    status: "pending",
    rejectionReason: "",
    reviewerNotes: "",
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true, campaignId: CAMPAIGN_ID, status: "pending", platform };
});

exports.getCreatorFoundingFollowerClaims = onCall({ region: "europe-west2" }, async (request) => {
  requireOwner(request);
  const snapshot = await db.collection("foundingFollowerClaims").orderBy("submittedAt", "desc").limit(500).get();
  const claims = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const summary = claims.reduce((result, item) => {
    const status = String(item.status || "pending");
    if (status === "pending") result.pending += 1;
    else if (status === "approved") result.approved += 1;
    else if (status === "rejected") result.rejected += 1;
    else result.processing += 1;
    return result;
  }, { pending: 0, approved: 0, rejected: 0, processing: 0 });
  return { success: true, claims, summary, generatedAt: Date.now() };
});

exports.reviewFoundingFollowerClaim = onCall({ region: "europe-west2" }, async (request) => {
  requireOwner(request);
  const targetUid = String(request.data?.targetUid || "").trim();
  const action = String(request.data?.action || "").trim().toLowerCase();
  const reviewerNotes = String(request.data?.reviewerNotes || "").trim().slice(0, 1000);
  if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
  if (action !== "approve" && action !== "reject") throw new HttpsError("invalid-argument", "Choose approve or reject.");

  const ref = claimRef(targetUid);
  const claimSnapshot = await ref.get();
  if (!claimSnapshot.exists) throw new HttpsError("not-found", "That Founding Follower claim no longer exists.");
  const claim = claimSnapshot.data() || {};
  if (action === "reject") {
    if (claim.status !== "pending") {
      if (claim.status === "rejected") return { success: true, status: "rejected", targetUid };
      throw new HttpsError("failed-precondition", "Only pending claims can be rejected.");
    }
    await ref.set({ status: "rejected", reviewedAt: FieldValue.serverTimestamp(), reviewedByUid: request.auth.uid, reviewerNotes, rejectionReason: reviewerNotes || "The submitted screenshot did not provide enough evidence to verify the follow." , updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { success: true, status: "rejected", targetUid };
  }

  if (claim.status === "approved") return { success: true, status: "approved", targetUid, expiresAt: claim.trialExpiresAt?.toMillis?.() ?? null };
  if (claim.status !== "pending") throw new HttpsError("failed-precondition", "Only pending claims can be approved.");

  const lockResult = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    const current = fresh.data() || {};
    if (current.status !== "pending") throw new HttpsError("aborted", "This claim is already being processed.");
    transaction.update(ref, { status: "processing", reviewedByUid: request.auth.uid, updatedAt: FieldValue.serverTimestamp() });
    return current;
  });

  try {
    const grant = await grantFoundingFollowerTrial({ targetUid, actorUid: request.auth.uid, claimId: targetUid });
    const expiresAt = grant.expiresAt;
    await ref.set({
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedByUid: request.auth.uid,
      reviewerNotes,
      trialTier: TIER,
      trialDurationDays: DURATION_DAYS,
      trialExpiresAt: Timestamp.fromMillis(expiresAt),
      updatedAt: FieldValue.serverTimestamp(),
      notificationRequired: true,
    }, { merge: true });

    try {
      const targetAuth = await adminAuth.getUser(targetUid);
      await sendUserRewardNotification({ targetUid, targetName: String(targetAuth.displayName || targetAuth.email || "A Tiny Titans user"), expiresAt });
      await ref.set({ notificationRequired: false, notificationSentAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (notificationError) {
      console.warn("Tiny Titans: Founding Follower user notification failed", notificationError);
    }

    return { success: true, status: "approved", targetUid, expiresAt };
  } catch (error) {
    await ref.set({ status: "pending", updatedAt: FieldValue.serverTimestamp(), processingError: String(error?.message || "Trial grant failed.") }, { merge: true }).catch(() => undefined);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "The Founding Follower reward could not be activated.");
  }
});
