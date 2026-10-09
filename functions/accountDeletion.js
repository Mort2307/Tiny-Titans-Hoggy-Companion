const crypto = require("node:crypto");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { defineSecret } = require("firebase-functions/params");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const Stripe = require("stripe");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

const adminAuth = getAuth();
const db = getFirestore();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const RECENT_AUTH_WINDOW_MS = 30 * 60 * 1000;

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

function assertRecentAuth(request) {
  const authTime = Number(request.auth?.token?.auth_time || 0) * 1000;
  if (!authTime || Date.now() - authTime > RECENT_AUTH_WINDOW_MS) {
    throw new HttpsError(
      "failed-precondition",
      "For your security, sign in again immediately before permanently deleting your Tiny Titans account.",
    );
  }
}

async function deleteMatchingDocs(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, "==", value).get();
  await Promise.all(snapshot.docs.map((document) => db.recursiveDelete(document.ref)));
  return snapshot.size;
}

async function deleteMatchingDocsByAny(collectionName, fields, value) {
  const seen = new Set();
  for (const field of fields) {
    const snapshot = await db.collection(collectionName).where(field, "==", value).get();
    for (const document of snapshot.docs) {
      if (seen.has(document.id)) continue;
      seen.add(document.id);
      await db.recursiveDelete(document.ref);
    }
  }
  return seen.size;
}

async function removeFromFamily(uid, familyId) {
  if (!familyId) return;
  const familyRef = db.collection("families").doc(familyId);
  const familySnapshot = await familyRef.get();
  if (!familySnapshot.exists) return;
  const family = familySnapshot.data() || {};
  const members = Array.isArray(family.memberUids) ? family.memberUids.filter((memberUid) => memberUid !== uid) : [];
  const ownerUid = String(family.ownerUid || "");

  await db.collection("families").doc(familyId).collection("permissions").doc(uid).delete().catch(() => undefined);

  if (ownerUid === uid) {
    if (members.length === 0) {
      await db.recursiveDelete(familyRef);
      return;
    }
    const nextOwner = members[0];
    await familyRef.set({
      ownerUid: nextOwner,
      memberUids: members,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection("users").doc(nextOwner).set({
      familyRole: "owner",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return;
  }

  await familyRef.set({
    memberUids: members,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function cancelStripeSubscription(userData) {
  const subscriptionId = String(userData?.stripeSubscriptionId || "").trim();
  if (!subscriptionId) return;
  const secret = STRIPE_SECRET_KEY.value();
  if (!secret) return;
  try {
    const stripe = new Stripe(secret);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  } catch (error) {
    console.error("Tiny Titans: Stripe cancellation during account deletion failed", {
      subscriptionId,
      error: error?.message || error,
    });
    throw new HttpsError(
      "failed-precondition",
      "Your account could not be deleted because its paid subscription could not be safely cancelled. Please contact Tiny Titans support.",
    );
  }
}

async function deletePublishedMorphMedia(uid) {
  const submissions = await db.collection("morphImageSubmissions").where("userId", "==", uid).get();
  if (submissions.empty) return;

  const bucket = getStorage().bucket();
  for (const submission of submissions.docs) {
    const approved = await db.collection("approvedMorphImages").where("sourceSubmissionId", "==", submission.id).get();
    for (const image of approved.docs) {
      const data = image.data() || {};
      const storagePath = String(data.storagePath || "").trim();
      if (storagePath.startsWith("morphLibrary/")) {
        await bucket.file(storagePath).delete().catch(() => undefined);
      }
      await image.ref.delete();
    }
  }
}

async function deleteUserStorage(uid) {
  const bucket = getStorage().bucket();
  const prefixes = [
    `users/${uid}/`,
    `snakePhotos/${uid}/`,
    `morph-submissions/${uid}/`,
    `issueEvidence/${uid}/`,
    `keeper-observations/${uid}/`,
  ];
  await Promise.all(prefixes.map((prefix) => bucket.deleteFiles({ prefix })));
}

async function removeMentorshipParticipant(uid) {
  const snapshot = await db.collection("mentorshipWorkspaces").get();
  await Promise.all(snapshot.docs.map(async (document) => {
    const data = document.data() || {};
    if (!Array.isArray(data.participants)) return;
    const nextParticipants = data.participants.filter((participant) => String(participant?.userId || "") !== uid);
    if (nextParticipants.length === data.participants.length) return;
    if (nextParticipants.length === 0) {
      await db.recursiveDelete(document.ref);
      return;
    }
    await document.ref.set({
      participants: nextParticipants,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }));
}


exports.deleteMyAccount = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  assertRecentAuth(request);

  const uid = request.auth.uid;
  const authUser = await adminAuth.getUser(uid);
  const userData = (await db.collection("users").doc(uid).get()).data() || {};

  const rescueOwnerSnapshot = await db.collection("rescueOrganisations").where("ownerUid", "==", uid).limit(1).get();
  if (!rescueOwnerSnapshot.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Transfer ownership of your Rescue Centre organisation before deleting this account so other team members do not lose their shared workspace.",
    );
  }

  await cancelStripeSubscription(userData);

  const familyId = String(userData.familyId || "");
  await removeFromFamily(uid, familyId);
  await removeMentorshipParticipant(uid);
  await deletePublishedMorphMedia(uid);

  await Promise.all([
    deleteMatchingDocs("issueReports", "userId", uid),
    deleteMatchingDocs("feedback", "userId", uid),
    deleteMatchingDocs("submissionConversations", "submitterUid", uid),
    deleteMatchingDocs("founderApplications", "uid", uid),
    deleteMatchingDocs("morphSubmissions", "userId", uid),
    deleteMatchingDocs("morphImageSubmissions", "userId", uid),
    deleteMatchingDocs("variationCardSubmissions", "userId", uid),
    deleteMatchingDocs("vivariumShowcaseSubmissions", "userId", uid),
    deleteMatchingDocs("mentorApplications", "applicantId", uid),
    deleteMatchingDocsByAny("mentorshipRequests", ["requesterId", "mentorId"], uid),
    deleteMatchingDocs("keeperObservations", "userId", uid),
    deleteMatchingDocs("prioritySupportTickets", "uid", uid),
    deleteMatchingDocs("familyApprovals", "requesterUid", uid),
    deleteMatchingDocs("familyInvites", "ownerUid", uid),
    deleteMatchingDocs("familyInvites", "targetEmail", cleanEmail(authUser.email)),
    deleteMatchingDocs("paidSubscriptions", "uid", uid),
    deleteMatchingDocs("paidEntitlements", "uid", uid),
    deleteMatchingDocs("paidTrials", "uid", uid),
    deleteMatchingDocs("paidTesterOverrides", "uid", uid),
    deleteMatchingDocs("supporters", "uid", uid),
    deleteMatchingDocs("geneticsCalculations", "uid", uid),
    deleteMatchingDocs("rescueDirectoryMemberships", "uid", uid),
    deleteMatchingDocs("sandboxExperiments", "ownerUid", uid),
    deleteMatchingDocs("testerSandboxes", "ownerUid", uid),
    db.recursiveDelete(db.collection("users").doc(uid)),
    db.recursiveDelete(db.collection("paidWorkspaces").doc(uid)),
    deleteUserStorage(uid),
  ]);

  await adminAuth.deleteUser(uid);
  console.log("Tiny Titans: account deletion completed", {
    uidHash: crypto.createHash("sha256").update(uid).digest("hex").slice(0, 12),
    ownerAccount: cleanEmail(authUser.email) === OWNER_EMAIL,
  });

  return { success: true, deleted: true };
});

exports.requestAccountDeletion = onCall({ region: "europe-west2" }, async (request) => {
  const email = cleanEmail(request.data?.email);
  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Enter the email address used for your Tiny Titans account.");
  }

  const requestRef = db.collection("accountDeletionRequests").doc();
  await requestRef.set({
    requestId: requestRef.id,
    email,
    emailHash: crypto.createHash("sha256").update(email).digest("hex"),
    status: "pending",
    source: request.auth?.uid ? "authenticated-web-request" : "public-web-request",
    requesterUid: request.auth?.uid || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const safeEmail = email.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[character]));

  await db.collection("mail").add({
    to: "Tiny Titans <tinytitans.exotics@gmail.com>",
    subject: "Tiny Titans account deletion request",
    message: {
      subject: "Tiny Titans account deletion request",
      text: `Account deletion request received for ${email}. Request ID: ${requestRef.id}. Source: ${request.auth?.uid ? "authenticated web request" : "public web request"}.`,
      html: `<p>A Tiny Titans account deletion request was received for <strong>${safeEmail}</strong>.</p><p>Request ID: <code>${requestRef.id}</code></p>`,
    },
    type: "account-deletion-request",
    deletionRequestId: requestRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "Your deletion request has been received. For immediate self-service deletion, sign in to Tiny Titans and use Security → Delete my account.",
  };
});
