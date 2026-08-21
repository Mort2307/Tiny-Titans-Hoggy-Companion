const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const db = getFirestore();
const messaging = getMessaging();

const EVENT_TYPES = Object.freeze({
  enquiry: "marketplace-enquiry",
  reply: "marketplace-reply",
  reservationRequest: "marketplace-reservation-request",
  reservationAccepted: "marketplace-reservation-accepted",
  reservationDeclined: "marketplace-reservation-declined",
  paymentArranged: "marketplace-payment-arranged",
  completed: "marketplace-completed",
});

async function sendMarketplacePush(uid, eventKey, title, body, url, type, context = {}) {
  if (!uid || !eventKey) return { sent: 0, invalid: 0, skipped: "invalid" };
  const userRef = db.collection("users").doc(uid);
  const profile = await userRef.get();
  const settings = profile.data()?.notificationSettings || {};
  if (settings.enabled !== true) return { sent: 0, invalid: 0, skipped: "disabled" };
  if (settings.marketplaceNotificationsEnabled === false) return { sent: 0, invalid: 0, skipped: "marketplace-disabled" };
  const eventRef = userRef.collection("notificationEvents").doc(eventKey);
  if ((await eventRef.get()).exists) return { sent: 0, invalid: 0, duplicate: true };
  const tokenSnapshot = await userRef.collection("notificationTokens").where("enabled", "==", true).get();
  const tokenDocs = tokenSnapshot.docs.filter((item) => typeof item.data().token === "string" && item.data().token.length > 0);
  await eventRef.set({ type, status: tokenDocs.length ? "sending" : "no-delivery", title, body, url, ...context, createdAt: FieldValue.serverTimestamp() });
  if (!tokenDocs.length) return { sent: 0, invalid: 0 };
  let sent = 0; let invalid = 0;
  for (let index = 0; index < tokenDocs.length; index += 500) {
    const batch = tokenDocs.slice(index, index + 500);
    const response = await messaging.sendEachForMulticast({ tokens: batch.map((item) => item.data().token), data: { title, body, eventKey, url, type, listingId: String(context.listingId || ""), conversationId: String(context.conversationId || "") } });
    sent += response.successCount; invalid += response.failureCount;
    await Promise.all(response.responses.map(async (result, responseIndex) => { const code = result.error?.code || ""; if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") await batch[responseIndex].ref.delete(); }));
  }
  await eventRef.set({ status: sent > 0 ? "sent" : "failed", sentCount: sent, invalidTokenCount: invalid, sentAt: FieldValue.serverTimestamp() }, { merge: true });
  return { sent, invalid };
}

function listingSummary(listing) {
  const parts = [listing.morph || listing.species, listing.sex && listing.sex !== "unknown" ? listing.sex : null, listing.price != null ? `£${Number(listing.price).toFixed(2)}` : "Price on enquiry"].filter(Boolean);
  return `${String(listing.title || "Marketplace listing")} · ${parts.join(" · ")}`;
}

async function getConversation(event) {
  const snapshot = await db.collection("marketplaceConversations").doc(event.params.conversationId).get();
  return snapshot.exists ? { ref: snapshot.ref, data: snapshot.data() || {} } : null;
}

exports.notifyMarketplaceMessage = onDocumentCreated({ document: "marketplaceConversations/{conversationId}/messages/{messageId}", region: "europe-west2" }, async (event) => {
  const message = event.data?.data(); if (!message) return;
  const conversation = await getConversation(event); if (!conversation) return;
  const data = conversation.data; const senderId = String(message.senderId || ""); const buyerId = String(data.buyerId || ""); const sellerId = String(data.sellerId || "");
  if (!senderId || (senderId !== buyerId && senderId !== sellerId)) return;
  const recipientId = senderId === buyerId ? sellerId : buyerId; if (!recipientId || recipientId === senderId) return;
  const listingSnapshot = await db.collection("communityMarketplace").doc(String(data.listingId || "")).get();
  const listing = listingSnapshot.exists ? listingSnapshot.data() || {} : {}; const summary = listingSummary(listing); const isBuyerMessage = senderId === buyerId;
  const title = isBuyerMessage ? "💬 New interest in your listing" : "💬 Seller replied";
  const body = isBuyerMessage ? `${summary}\n\nCustomer message: ${String(message.message || "").slice(0, 300)}` : `${summary}\n\nSeller message: ${String(message.message || "").slice(0, 300)}`;
  await sendMarketplacePush(recipientId, `marketplace-message-${event.params.conversationId}-${event.params.messageId}`, title, body, `/community/marketplace/${String(data.listingId || "")}?conversation=${encodeURIComponent(event.params.conversationId)}`, isBuyerMessage ? EVENT_TYPES.enquiry : EVENT_TYPES.reply, { listingId: data.listingId, conversationId: event.params.conversationId, senderId, recipientId, listingTitle: data.listingTitle || listing.title || "", listingSummary: summary });
  await conversation.ref.set({ lastMessage: String(message.message || "").slice(0, 500), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
});

exports.notifyMarketplaceStatusChange = onDocumentUpdated({ document: "marketplaceConversations/{conversationId}", region: "europe-west2" }, async (event) => {
  const before = event.data?.before.data() || {}; const after = event.data?.after.data() || {}; if (before.status === after.status) return;
  const buyerId = String(after.buyerId || ""); const sellerId = String(after.sellerId || ""); const status = String(after.status || ""); let recipientId = ""; let title = ""; let body = ""; let type = "";
  if (status === "reservation-requested") { recipientId = sellerId; title = "🤝 Reservation request"; body = `${String(after.listingTitle || "Your listing")} has a buyer asking to reserve it.`; type = EVENT_TYPES.reservationRequest; }
  else if (status === "reserved") { recipientId = buyerId; title = "🟡 Listing reserved"; body = `${String(after.listingTitle || "The listing")} has been reserved for your enquiry.`; type = EVENT_TYPES.reservationAccepted; }
  else if (status === "cancelled" && before.status === "reserved") { recipientId = buyerId; title = "⚪ Reservation updated"; body = `${String(after.listingTitle || "The listing")} is no longer reserved.`; type = EVENT_TYPES.reservationDeclined; }
  else if (status === "payment-arranged") { recipientId = buyerId; title = "💳 Payment arrangement updated"; body = `${String(after.listingTitle || "The listing")} has moved to payment arranged.`; type = EVENT_TYPES.paymentArranged; }
  else if (status === "completed") { recipientId = buyerId; title = "✅ Marketplace transaction completed"; body = `${String(after.listingTitle || "The listing")} has been marked as completed.`; type = EVENT_TYPES.completed; }
  else return;
  if (!recipientId) return;
  await sendMarketplacePush(recipientId, `marketplace-status-${event.params.conversationId}-${status}`, title, body, `/community/marketplace/${String(after.listingId || "")}?conversation=${encodeURIComponent(event.params.conversationId)}`, type, { listingId: after.listingId, conversationId: event.params.conversationId, buyerId, sellerId, status });
});
