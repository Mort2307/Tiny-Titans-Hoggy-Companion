const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const db = getFirestore();
function cleanText(value, max = 1000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
async function requirePriority(uid) {
  const user = await db.collection("users").doc(uid).get();
  const data = user.exists ? user.data() : {};
  const tier = String(data.subscriptionTier || "free");
  const allowed = new Set(["business_plus", "business_advanced"]);
  const override = data.paidTesterOverride || null;
  const effective = override?.enabled === true && override?.tier && (!override.expiresAt?.toMillis || override.expiresAt.toMillis() > Date.now()) ? String(override.tier) : tier;
  if (!allowed.has(effective)) throw new HttpsError("permission-denied", "Priority support requires Business Plus or Business Advanced.");
  return effective;
}
exports.createPrioritySupportTicket = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid; const tier = await requirePriority(uid);
  const subject = cleanText(request.data?.subject, 160); const message = cleanText(request.data?.message, 5000);
  if (!subject || !message) throw new HttpsError("invalid-argument", "A subject and support message are required.");
  const ref = db.collection("prioritySupportTickets").doc();
  await ref.set({ ticketId: ref.id, uid, tier, subject, message, status: "open", priority: "business", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await db.collection("creatorAudit").add({ actorUid: uid, targetUid: uid, action: "create_priority_support_ticket", ticketId: ref.id, tier, createdAt: FieldValue.serverTimestamp() });
  return { success: true, ticketId: ref.id };
});
exports.getPrioritySupportTickets = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await requirePriority(request.auth.uid);
  const snapshot = await db.collection("prioritySupportTickets").where("uid", "==", request.auth.uid).orderBy("createdAt", "desc").limit(50).get();
  return { success: true, tickets: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
});
