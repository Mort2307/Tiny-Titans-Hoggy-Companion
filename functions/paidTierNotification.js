const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { NOTIFICATION_ICON, NOTIFICATION_BADGE } = require("./notificationBranding");

const db = getFirestore();
const adminAuth = getAuth();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const TIER_NAMES = Object.freeze({ free: "Free", titan_pro: "Titan Pro", titan_seller: "Titan Seller", business_starter: "Business Starter", business_plus: "Business Plus", business_advanced: "Business Advanced" });
const PAID_TIERS = new Set(["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"]);
const PUBLIC_ORIGIN = "https://tinytitans-hoggy-companion.web.app";

async function ownerUid() { return (await adminAuth.getUserByEmail(OWNER_EMAIL)).uid; }

async function sendOwnerPush(eventId, title, body, url) {
  const uid = await ownerUid();
  const tokenSnapshot = await db.collection("users").doc(uid).collection("notificationTokens").where("enabled", "==", true).get().catch(() => null);
  const tokenDocs = tokenSnapshot ? tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0) : [];
  if (!tokenDocs.length) return { sentCount: 0, invalidTokenCount: 0 };
  let sentCount = 0; let invalidTokenCount = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await getMessaging().sendEachForMulticast({ tokens: batch.map((item) => item.data().token), notification: { title, body }, data: { eventKey: eventId, eventType: "paid-tier-activation", title, body, url }, webpush: { fcmOptions: { link: `${PUBLIC_ORIGIN}${url}` }, notification: { icon: NOTIFICATION_ICON, badge: NOTIFICATION_BADGE, tag: eventId } } });
    sentCount += response.successCount; invalidTokenCount += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => { const code = result.error?.code || ""; if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete().catch(() => undefined); }));
  }
  return { sentCount, invalidTokenCount };
}

async function recordPaidTierActivationNotification({ eventKey, targetUid, targetName, tier, activationKind, source }) {
  if (!targetUid || !PAID_TIERS.has(tier)) return { created: false, eventKey };
  const uid = await ownerUid();
  const eventRef = db.collection("users").doc(uid).collection("notificationEvents").doc(eventKey);
  const title = activationKind === "trial" ? "🎁 Paid trial activated" : "💳 Paid subscription activated";
  const body = `${targetName || "A Tiny Titans user"} is now using ${TIER_NAMES[tier] || tier}.`;
  try {
    await eventRef.create({ eventType: "paid-tier-activation", kind: "paid-tier", activationKind, source, targetUid, targetName: targetName || "A Tiny Titans user", tier, tierName: TIER_NAMES[tier] || tier, title, body, url: "/creator?tool=paid-tiers", read: false, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    if (error?.code === 6 || error?.code === "already-exists") return { created: false, eventKey };
    throw error;
  }
  let delivery = { sentCount: 0, invalidTokenCount: 0 };
  try { delivery = await sendOwnerPush(eventKey, title, body, "/creator?tool=paid-tiers"); } catch (error) { console.warn("Tiny Titans: paid tier Creator push failed", error); }
  await eventRef.set({ status: delivery.sentCount > 0 ? "sent" : "no-delivery", sentCount: delivery.sentCount, invalidTokenCount: delivery.invalidTokenCount, deliveryUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { created: true, eventKey, ...delivery };
}

module.exports = { recordPaidTierActivationNotification };
