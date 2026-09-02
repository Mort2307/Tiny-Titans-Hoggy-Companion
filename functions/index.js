const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Stripe = require("stripe");

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

Object.assign(exports, require("./creatorApproval"));
Object.assign(exports, require("./communityIntelligence"));
Object.assign(exports, require("./communityLocations"));
Object.assign(exports, require("./publicContributions"));
Object.assign(exports, require("./familyJoinCodes"));
Object.assign(exports, require("./familyManager"));
Object.assign(exports, require("./familyManagerResolve"));
Object.assign(exports, require("./communityBenchmarks"));
Object.assign(exports, require("./titanGoals"));
const creatorTesterInvitation = require("./creatorTesterInvitation");
Object.assign(exports, {
  getCreatorTesterInvitation: creatorTesterInvitation.getCreatorTesterInvitation,
  acceptCreatorTesterInvitation: creatorTesterInvitation.acceptCreatorTesterInvitation,
  declineCreatorTesterInvitation: creatorTesterInvitation.declineCreatorTesterInvitation,
});
Object.assign(exports, require("./notificationTest"));
Object.assign(exports, require("./supportNotifications"));
const familyNotifications = require("./familyNotifications");
exports.sendAllKeeperReminderNotifications = familyNotifications.sendAllKeeperReminderNotifications;
const equipmentNotifications = require("./equipmentNotifications");
exports.sendEquipmentReplacementNotifications = equipmentNotifications.sendEquipmentReplacementNotifications;
const shedNotifications = require("./shedNotifications");
exports.sendShedCycleReminderNotifications = shedNotifications.sendShedCycleReminderNotifications;

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const PRICE_TIERS = Object.freeze({
  little: { priceId: "price_1U4E9q3zyS86a3ry2Lrikcjq", amount: 5, label: "Little Titan" },
  growing: { priceId: "price_1U4EBp3zyS86a3ryn3HfNU0R", amount: 10, label: "Growing Titan" },
  champion: { priceId: "price_1U4EDE3zyS86a3ryKXVPLEhd", amount: 20, label: "Champion Titan" },
  legendary: { priceId: "price_1U4EDx3zyS86a3ryxlW1Scz8", amount: 40, label: "Legendary Titan" },
  broken: { priceId: "price_1U4EEf3zyS86a3ryLupeschV", amount: 100, label: "You Just Broke Me" },
});
const ALLOWED_ORIGINS = new Set(["https://tinytitans-hoggy-companion.web.app", "https://tinytitans-hoggy-companion.firebaseapp.com", "http://localhost:5173", "http://127.0.0.1:5173"]);
function getAllowedOrigin(request) { const origin = request.rawRequest?.headers?.origin || ""; return ALLOWED_ORIGINS.has(origin) ? origin : "https://tinytitans-hoggy-companion.web.app"; }

exports.setCreatorClaim = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const callerSnapshot = await db.collection("users").doc(request.auth.uid).get();
  const callerData = callerSnapshot.data() || {};
  const callerClaims = request.auth.token || {};
  const callerAuthorized = callerClaims.admin === true || callerClaims.creator === true || callerData.role === "admin" || callerData.profileType === "creator";
  if (!callerAuthorized) throw new HttpsError("permission-denied", "Creator authorization is required.");
  const targetUid = String(request.data?.uid || "").trim();
  const enabled = request.data?.enabled !== false;
  if (!targetUid) throw new HttpsError("invalid-argument", "A target user ID is required.");
  if (targetUid === request.auth.uid && !enabled) throw new HttpsError("failed-precondition", "The current Creator cannot remove their own Creator access.");
  try {
    if (enabled) {
      const invitation = await creatorTesterInvitation.createCreatorTesterInvitation(request.auth.uid, targetUid);
      if (callerData.profileType === "creator" && callerClaims.creator !== true) {
        const callerAuthUser = await adminAuth.getUser(request.auth.uid);
        await adminAuth.setCustomUserClaims(request.auth.uid, { ...(callerAuthUser.customClaims || {}), creator: true });
      }
      await db.collection("users").doc(targetUid).set({ isTester: false, testerType: "creator", testerInvitationStatus: "pending", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "invite_creator_tester", createdAt: FieldValue.serverTimestamp() });
      return { success: true, uid: targetUid, creator: false, creatorTester: false, isTester: false, invitation: true, invitationStatus: invitation.status };
    }
    const target = await adminAuth.getUser(targetUid);
    const nextClaims = { ...(target.customClaims || {}) };
    delete nextClaims.creatorTester;
    await adminAuth.setCustomUserClaims(targetUid, nextClaims);
    await db.collection("users").doc(targetUid).set({ isTester: false, testerType: null, testerInvitationStatus: "revoked", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("users").doc(targetUid).collection("creatorTesterInvitations").doc("creator-tester").set({ status: "revoked", revokedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.collection("creatorAudit").add({ actorUid: request.auth.uid, targetUid, action: "revoke_creator_tester", createdAt: FieldValue.serverTimestamp() });
    return { success: true, uid: targetUid, creator: nextClaims.creator === true, creatorTester: false, isTester: false, invitation: false, invitationStatus: "revoked" };
  } catch (error) {
    console.error("Creator claim/invitation update failed", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Unable to update Creator Tester authorization.");
  }
});

exports.ensureCreatorClaim = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const profileSnapshot = await db.collection("users").doc(uid).get();
  const profile = profileSnapshot.data() || {};
  const existingClaims = request.auth.token || {};
  const profileAuthorizesCreator = profile.profileType === "creator" || profile.role === "admin";
  const claimAlreadyPresent = existingClaims.creator === true || existingClaims.admin === true || existingClaims.creatorTester === true;
  if (!profileAuthorizesCreator && !claimAlreadyPresent) throw new HttpsError("permission-denied", "Creator authorization is required.");
  try {
    const authUser = await adminAuth.getUser(uid);
    const nextClaims = { ...(authUser.customClaims || {}) };
    if (profile.role === "admin" || nextClaims.admin === true) nextClaims.admin = true;
    else if (profile.profileType === "creator" || nextClaims.creator === true) nextClaims.creator = true;
    else if (nextClaims.creatorTester === true) nextClaims.creatorTester = true;
    await adminAuth.setCustomUserClaims(uid, nextClaims);
    return { success: true, uid, creator: nextClaims.creator === true, admin: nextClaims.admin === true, creatorTester: nextClaims.creatorTester === true, refreshRequired: true };
  } catch (error) {
    console.error("Creator claim synchronisation failed", error);
    throw new HttpsError("internal", "Unable to synchronise Creator authorization.");
  }
});

exports.createTitanCheckout = onCall({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to become a Titan.");
  const tierKey = String(request.data?.tier || "");
  const tier = PRICE_TIERS[tierKey];
  if (!tier) throw new HttpsError("invalid-argument", "Invalid Titan support tier.");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const origin = getAllowedOrigin(request);
    const session = await stripe.checkout.sessions.create({ mode: "payment", line_items: [{ price: tier.priceId, quantity: 1 }], customer_email: request.auth.token.email || undefined, client_reference_id: request.auth.uid, metadata: { uid: request.auth.uid, tier: tierKey, label: tier.label, amount_gbp: String(tier.amount) }, success_url: `${origin}/become-a-titan?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/become-a-titan?payment=cancelled`, billing_address_collection: "auto" });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    throw new HttpsError("internal", "Unable to start Stripe Checkout.");
  }
});

exports.stripeWebhook = onRequest({ region: "europe-west2", secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: "public" }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).send("Missing Stripe signature");
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const uid = session.metadata?.uid || session.client_reference_id;
      const tier = PRICE_TIERS[session.metadata?.tier];
      if (uid && tier && session.payment_status === "paid") {
        await db.collection("supporters").doc(uid).set({ uid, status: "active", tier: session.metadata.tier, tierLabel: tier.label, amountGbp: tier.amount, stripeCustomerId: session.customer || null, stripeCheckoutSessionId: session.id, lastPaymentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        await db.collection("supporterStats").doc("global").set({ totalSupporters: FieldValue.increment(1), totalReceivedGbp: FieldValue.increment(tier.amount), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook verification/processing failed", error);
    return res.status(400).send("Invalid webhook signature or event");
  }
});

exports.queueFamilyInvitationEmail = onDocumentCreated({ region: "europe-west2", document: "familyInvites/{inviteId}" }, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const invite = snapshot.data() || {};
  if (invite.status !== "pending") return;
  const targetEmail = String(invite.targetEmail || "").trim().toLowerCase();
  const familyId = String(invite.familyId || "").trim();
  const inviteId = String(event.params.inviteId || "").trim();
  if (!targetEmail || !familyId || !inviteId) return;
  const ownerUid = String(invite.ownerUid || "").trim();
  const ownerSnapshot = ownerUid ? await db.collection("users").doc(ownerUid).get() : null;
  const owner = ownerSnapshot?.data() || {};
  const ownerName = String(owner.displayName || "Your Tiny Titans family owner").trim();
  const origin = "https://tinytitans-hoggy-companion.web.app";
  const inviteUrl = `${origin}/account/family?invite=${encodeURIComponent(inviteId)}`;
  const subject = "You're invited to join a Tiny Titans family";
  const safeOwnerName = ownerName.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character]));
  const safeInviteUrl = inviteUrl.replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
  const html = `<!doctype html><html><body style="margin:0;background:#111315;font-family:Arial,sans-serif;color:#f3f1e8"><div style="max-width:620px;margin:32px auto;padding:0 20px"><div style="background:#1b1f20;border:1px solid #3a3f3f;border-radius:18px;padding:32px"><div style="font-size:28px;font-weight:800;margin-bottom:8px">🐍 Tiny Titans</div><div style="font-size:14px;color:#d5aa4b;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Family invitation</div><h1 style="font-size:28px;margin:24px 0 12px">You're invited to join a Tiny Titans family</h1><p style="font-size:16px;line-height:1.6;color:#d8d7cf">${safeOwnerName} has invited you to share a family reptile record in Tiny Titans.</p><p style="font-size:15px;line-height:1.6;color:#c6c5be">Sign in or create your Tiny Titans account using the invited email address, then use the button below to accept the invitation.</p><p style="margin:28px 0"><a href="${safeInviteUrl}" style="display:inline-block;background:#d5aa4b;color:#111315;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px">Accept Family Invitation</a></p><p style="font-size:13px;line-height:1.5;color:#9f9e98">If you were not expecting this invitation, you can safely ignore this email.</p></div><p style="text-align:center;font-size:12px;color:#777872;margin:18px 0">Tiny Titans Hoggy Companion</p></div></body></html>`;
  const text = `Tiny Titans Family Invitation\n\n${ownerName} has invited you to join a Tiny Titans family.\n\nSign in or create your Tiny Titans account using the invited email address, then open this link to accept the invitation:\n${inviteUrl}\n\nIf you were not expecting this invitation, you can safely ignore this email.`;
  await db.collection("mail").add({ to: targetEmail, from: "Tiny Titans <tinytitans.exotics@gmail.com>", replyTo: "tinytitans.exotics@gmail.com", message: { subject, text, html }, type: "family-invitation", familyInviteId: inviteId, familyId, createdAt: FieldValue.serverTimestamp() });
});
