const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const db = getFirestore();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const PAID_TIERS = new Set(["business_plus", "business_advanced"]);
function cleanText(value, max = 1000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function expiryMillis(value) { if (!value) return null; if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis(); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
async function requirePriority(uid) {
  const user = await db.collection("users").doc(uid).get();
  const data = user.exists ? user.data() : {};
  if (String(data.email || "").trim().toLowerCase() === OWNER_EMAIL) return "business_advanced";
  const subscriptionTier = String(data.subscriptionTier || "free");
  const subscriptionStatus = String(data.subscriptionStatus || (subscriptionTier === "free" ? "free" : "active"));
  const subscriptionActive = PAID_TIERS.has(subscriptionTier) && ["active", "trialing"].includes(subscriptionStatus);
  const override = data.paidTesterOverride || null;
  const overrideTier = String(override?.tier || "");
  const overrideActive = override?.enabled === true && PAID_TIERS.has(overrideTier) && (expiryMillis(override.expiresAt) === null || expiryMillis(override.expiresAt) > Date.now());
  const trial = data.paidTrial || null;
  const trialTier = String(trial?.tier || "");
  const trialActive = trial?.enabled === true && PAID_TIERS.has(trialTier) && (expiryMillis(trial.expiresAt) || 0) > Date.now();
  const effective = overrideActive ? overrideTier : subscriptionActive ? subscriptionTier : trialActive ? trialTier : "free";
  if (!PAID_TIERS.has(effective)) throw new HttpsError("permission-denied", "Priority support requires Business Plus or Business Advanced.");
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
