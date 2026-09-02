const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { NOTIFICATION_ICON, NOTIFICATION_BADGE } = require("./notificationBranding");

const db = getFirestore();
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";

function isInvalidTokenCode(code) {
  return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token";
}

async function eligibleUserUids(audience) {
  if (audience === "admin") return [];

  if (audience === "testers") {
    const snapshot = await db.collection("users").where("isTester", "==", true).get();
    return snapshot.docs.map((snap) => snap.id);
  }

  const snapshot = await db.collection("users").get();
  return snapshot.docs.map((snap) => snap.id);
}

function notificationContent(data) {
  const category = String(data.category || "update");
  const title = String(data.title || "Tiny Titans Community Hub").trim();
  const body = String(data.message || "There is a new Tiny Titans Community Hub update.").trim();

  if (category === "release") return { title: "📦 New Tiny Titans release", body: title };
  if (category === "update") return { title: "📢 Tiny Titans update", body: title };
  if (category === "known_issue") return { title: "🐛 Tiny Titans community notice", body: title };
  if (category === "tester") return { title: "🧪 Tiny Titans tester update", body: title };
  return { title: "🌿 Tiny Titans Community Hub", body };
}

async function emitCommunityNotification(uid, postId, data) {
  if (!uid) return;

  const content = notificationContent(data);
  const category = String(data.category || "update");
  const eventRef = await db.collection("users").doc(uid).collection("notificationEvents").add({
    eventType: "community-post",
    kind: category,
    parentId: postId,
    communityPostId: postId,
    title: content.title,
    body: content.body,
    url: `/community?category=${encodeURIComponent(category)}`,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  const tokenSnapshot = await db.collection("users").doc(uid).collection("notificationTokens").where("enabled", "==", true).get().catch(() => null);
  const tokenDocs = tokenSnapshot
    ? tokenSnapshot.docs.filter((snap) => typeof snap.data().token === "string" && snap.data().token.length > 0)
    : [];
  if (!tokenDocs.length) return;

  try {
    for (let index = 0; index < tokenDocs.length; index += 500) {
      const batch = tokenDocs.slice(index, index + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((snap) => snap.data().token),
        notification: { title: content.title, body: content.body },
        data: {
          eventKey: eventRef.id,
          eventType: "community-post",
          communityPostId: postId,
          category,
          title: content.title,
          body: content.body,
          url: `/community?category=${encodeURIComponent(category)}`,
        },
        webpush: {
          fcmOptions: { link: `${PUBLIC_ORIGIN}/community?category=${encodeURIComponent(category)}` },
          notification: { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE, tag: eventRef.id },
        },
      });

      await Promise.all(response.responses.map((result, responseIndex) => {
        if (!result.success && isInvalidTokenCode(result.error?.code || "")) {
          return batch[responseIndex].ref.delete().catch(() => undefined);
        }
        return null;
      }));
    }
  } catch (error) {
    console.warn("Tiny Titans: Community Hub push delivery failed", error);
  }
}

exports.notifyOnCommunityPost = onDocumentCreated({ region: "europe-west2", document: "communityPosts/{postId}" }, async (event) => {
  const data = event.data?.data() || {};
  const audience = String(data.audience || "everyone");
  if (audience === "admin") return;

  const userUids = [...new Set(await eligibleUserUids(audience))];
  await Promise.all(userUids.map((uid) => emitCommunityNotification(uid, event.params.postId, data)));
});

function text(value, fallback = "") {
  const result = String(value ?? "").replace(/\s+/g, " ").trim();
  return result || fallback;
}

function firstNonEmpty(...values) {
  return values.map((value) => text(value)).find(Boolean) || "";
}

async function resolveSubmitterName(data, fallbackUid = "") {
  const direct = firstNonEmpty(data?.contributorDisplayName, data?.creatorName, data?.displayName, data?.applicantName, data?.requesterName);
  if (direct) return direct.slice(0, 80);
  const uid = firstNonEmpty(data?.userId, data?.applicantId, data?.createdBy, data?.submittedBy, fallbackUid);
  if (!uid) return "A Tiny Titans user";
  try {
    const snapshot = await db.collection("users").doc(uid).get();
    const profile = snapshot.data() || {};
    return firstNonEmpty(profile.displayName, profile.name, profile.username) || "A Tiny Titans user";
  } catch {
    return "A Tiny Titans user";
  }
}

function submissionDescriptor(collectionId, data) {
  switch (collectionId) {
    case "issueReports": {
      const title = text(data.title, "New bug report");
      const description = text(data.description, "No error description was provided.");
      return {
        type: "creator-bug-report",
        title: `🐛 Bug report — ${title}`,
        body: `Error: ${description}`,
        url: "/creator/issues?filter=active",
      };
    }
    case "feedback": {
      const title = text(data.title, "New feedback");
      const message = text(data.message, "No feedback message was provided.");
      return {
        type: "creator-feedback-submission",
        title: `💬 New feedback — ${title}`,
        body: message,
        url: "/creator/issues",
      };
    }
    case "morphImageSubmissions": {
      const morph = text(data.morphName || data.morphId, "Morph identity not specified");
      const detail = firstNonEmpty(data.description, data.observedTraits, data.proofDetails) || "New community image/evidence submission requires review.";
      return {
        type: "creator-morph-image-submission",
        title: `🧬 Morph image submission — ${morph}`,
        body: detail,
        url: "/creator/submissions",
      };
    }
    case "morphSubmissions": {
      const morph = text(data.submittedName || data.morphName, "New morph terminology");
      const detail = firstNonEmpty(data.description, data.knownGenetics, data.sourceOrBreeder) || "New Morph terminology requires Creator review.";
      return {
        type: "creator-morph-terminology-submission",
        title: `🌎 Morph terminology — ${morph}`,
        body: detail,
        url: "/creator/submissions",
      };
    }
    case "keeperObservations": {
      const title = text(data.title, "New behaviour observation");
      const detail = firstNonEmpty(data.observedBehaviour, data.description) || "New keeper observation requires Creator review.";
      return {
        type: "creator-behaviour-submission",
        title: `🐍 Behaviour observation — ${title}`,
        body: detail,
        url: "/creator/observations",
      };
    }
    case "mentorApplications": {
      const roles = Array.isArray(data.mentorRoles) ? data.mentorRoles.map((role) => text(role)).filter(Boolean).join(" + ") : "Mentor";
      const detail = firstNonEmpty(data.experienceSummary, data.requestedVerification) || "New mentor application requires Creator review.";
      return {
        type: "creator-mentor-application",
        title: `🛡️ ${roles} application` ,
        body: detail,
        url: "/creator/mentor-review",
      };
    }
    case "founderApplications": {
      const detail = firstNonEmpty(data.reason, data.experience, data.contribution) || "New Founder application requires review.";
      return {
        type: "creator-founder-application",
        title: "🏆 New Founder application",
        body: detail,
        url: "/creator",
      };
    }
    case "communityContent": {
      const title = text(data.title, "New Community contribution");
      const detail = firstNonEmpty(data.description, data.message, data.body) || "New community content requires Creator review.";
      return {
        type: "creator-community-submission",
        title: `🌍 Community contribution — ${title}`,
        body: detail,
        url: "/creator/community",
      };
    }
    case "featureRequests": {
      const title = text(data.title, "New feature request");
      const detail = firstNonEmpty(data.description, data.whyUseful) || "New feature request requires review and prioritisation.";
      return {
        type: "creator-feature-submission",
        title: `💡 Feature request — ${title}`,
        body: detail,
        url: "/community/features",
      };
    }
    default:
      return null;
  }
}

async function getCreatorRecipientUids() {
  const [adminSnapshot, creatorSnapshot] = await Promise.all([
    db.collection("users").where("role", "==", "admin").get(),
    db.collection("users").where("profileType", "==", "creator").get(),
  ]);
  return [...new Set([...adminSnapshot.docs.map((item) => item.id), ...creatorSnapshot.docs.map((item) => item.id)])];
}

async function emitCreatorSubmissionNotification(recipientUid, eventKey, sourceCollection, sourceId, data, descriptor, submitterUid = "") {
  const userRef = db.collection("users").doc(recipientUid);
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  const eventPayload = {
    eventType: descriptor.type,
    kind: "creator-review",
    sourceCollection,
    sourceId,
    submitterUid: submitterUid || null,
    title: descriptor.title.slice(0, 180),
    body: descriptor.body.slice(0, 420),
    url: descriptor.url,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    await eventRef.create(eventPayload);
  } catch (error) {
    if (error?.code === 6 || error?.code === "already-exists") return;
    console.warn("Tiny Titans: unable to record Creator submission notification", { recipientUid, sourceCollection, sourceId, error });
    return;
  }

  const tokenSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get().catch(() => null);
  const tokenDocs = tokenSnapshot
    ? tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0)
    : [];

  if (!tokenDocs.length) {
    await eventRef.set({ status: "no-delivery", deliveryUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }

  let sent = 0;
  let invalid = 0;
  try {
    for (let index = 0; index < tokenDocs.length; index += 500) {
      const batch = tokenDocs.slice(index, index + 500);
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch.map((item) => item.data().token),
        notification: {
          title: descriptor.title.slice(0, 180),
          body: `${await resolveSubmitterName(data, submitterUid)}: ${descriptor.body}`.slice(0, 520),
        },
        data: {
          eventKey,
          eventType: descriptor.type,
          sourceCollection,
          sourceId,
          title: descriptor.title.slice(0, 180),
          body: descriptor.body.slice(0, 420),
          url: descriptor.url,
        },
        webpush: {
          headers: { Urgency: sourceCollection === "issueReports" ? "high" : "normal" },
          fcmOptions: { link: `${PUBLIC_ORIGIN}${descriptor.url}` },
          notification: {
            icon: NOTIFICATION_ICON,
            badge: NOTIFICATION_BADGE,
            tag: eventKey,
          },
        },
      });
      sent += response.successCount;
      invalid += response.failureCount;
      await Promise.all(response.responses.map(async (result, responseIndex) => {
        const code = result.error?.code || "";
        if (isInvalidTokenCode(code)) await batch[responseIndex].ref.delete().catch(() => undefined);
      }));
    }
    await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, deliveryUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (error) {
    await eventRef.set({ status: "failed", error: error?.message || "Notification delivery failed.", deliveryUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.warn("Tiny Titans: Creator submission push delivery failed", { recipientUid, sourceCollection, sourceId, error });
  }
}

async function handleCreatorSubmission(event, sourceCollection) {
  const document = event.data;
  if (!document) return;
  const data = document.data() || {};
  const sourceId = String(event.params?.submissionId || event.params?.reportId || event.params?.requestId || event.params?.applicationId || event.params?.contentId || event.params?.observationId || document.id || "").trim();
  if (!sourceId) return;
  const descriptor = submissionDescriptor(sourceCollection, data);
  if (!descriptor) return;
  const submitterUid = firstNonEmpty(data.userId, data.applicantId, data.createdBy, data.submittedBy, event.params?.userId);
  const recipients = await getCreatorRecipientUids();
  if (!recipients.length) return;
  const eventKey = `creator-review-${sourceCollection}-${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  await Promise.all(recipients.map((uid) => emitCreatorSubmissionNotification(uid, eventKey, sourceCollection, sourceId, data, descriptor, submitterUid)));
}

exports.notifyCreatorOnBugReport = onDocumentCreated({ region: "europe-west2", document: "issueReports/{reportId}" }, async (event) => {
  await handleCreatorSubmission(event, "issueReports");
});

exports.notifyCreatorOnFeedbackSubmission = onDocumentCreated({ region: "europe-west2", document: "feedback/{submissionId}" }, async (event) => {
  await handleCreatorSubmission(event, "feedback");
});

exports.notifyCreatorOnMorphImageSubmission = onDocumentCreated({ region: "europe-west2", document: "morphImageSubmissions/{submissionId}" }, async (event) => {
  await handleCreatorSubmission(event, "morphImageSubmissions");
});

exports.notifyCreatorOnMorphTerminologySubmission = onDocumentCreated({ region: "europe-west2", document: "users/{userId}/morphSubmissions/{submissionId}" }, async (event) => {
  await handleCreatorSubmission(event, "morphSubmissions");
});

exports.notifyCreatorOnBehaviourSubmission = onDocumentCreated({ region: "europe-west2", document: "keeperObservations/{observationId}" }, async (event) => {
  await handleCreatorSubmission(event, "keeperObservations");
});

exports.notifyCreatorOnMentorApplication = onDocumentCreated({ region: "europe-west2", document: "mentorApplications/{applicationId}" }, async (event) => {
  await handleCreatorSubmission(event, "mentorApplications");
});

exports.notifyCreatorOnFounderApplication = onDocumentCreated({ region: "europe-west2", document: "founderApplications/{applicationId}" }, async (event) => {
  await handleCreatorSubmission(event, "founderApplications");
});

exports.notifyCreatorOnCommunityContribution = onDocumentCreated({ region: "europe-west2", document: "communityContent/{contentId}" }, async (event) => {
  await handleCreatorSubmission(event, "communityContent");
});

exports.notifyCreatorOnFeatureRequest = onDocumentCreated({ region: "europe-west2", document: "featureRequests/{requestId}" }, async (event) => {
  await handleCreatorSubmission(event, "featureRequests");
});
