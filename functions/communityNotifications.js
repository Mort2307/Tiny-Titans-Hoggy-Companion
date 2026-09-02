const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();

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
          fcmOptions: { link: `https://tinytitans-hoggy-companion.web.app/community?category=${encodeURIComponent(category)}` },
          notification: { icon: "/favicon.svg", badge: "/favicon.svg", tag: eventRef.id },
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
