const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const ROLES = new Set(["manager", "staff", "medical", "foster", "viewer"]);
const ROLE_FIELDS = Object.freeze({ manager: "managerUids", staff: "staffUids", medical: "medicalUids", foster: "fosterUids", viewer: "viewerUids" });
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const APP_ORIGIN = "https://tinytitans-hoggy-companion.web.app";

function membershipRole(org, uid) {
  if (String(org.ownerUid || "") === uid) return "owner";
  for (const role of ROLES) {
    const field = ROLE_FIELDS[role];
    if (Array.isArray(org[field]) && org[field].includes(uid)) return role;
  }
  return null;
}

function safeHtml(value) {
  return String(value || "").replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

exports.resendRescueStaffInvitation = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");

  const organisationId = String(request.data?.organisationId || "").trim();
  const invitationId = String(request.data?.invitationId || "").trim();
  if (!organisationId || !invitationId) {
    throw new HttpsError("invalid-argument", "Organisation and invitation are required.");
  }

  const [orgSnapshot, invitationSnapshot] = await Promise.all([
    db.collection("rescueOrganisations").doc(organisationId).get(),
    db.collection("rescueInvitations").doc(invitationId).get(),
  ]);

  if (!orgSnapshot.exists) throw new HttpsError("not-found", "Rescue organisation not found.");
  if (!invitationSnapshot.exists) throw new HttpsError("not-found", "Rescue invitation not found.");

  const org = orgSnapshot.data() || {};
  const invitation = invitationSnapshot.data() || {};
  const callerRole = membershipRole(org, request.auth.uid);
  if (callerRole !== "owner" && callerRole !== "manager") {
    throw new HttpsError("permission-denied", "Only Rescue owners and managers can resend staff invitations.");
  }
  if (String(invitation.organisationId || "") !== organisationId) {
    throw new HttpsError("permission-denied", "This invitation belongs to a different Rescue organisation.");
  }
  if (String(invitation.status || "") !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending Rescue invitations can be resent.");
  }

  const email = String(invitation.targetEmail || "").trim().toLowerCase();
  const role = String(invitation.role || "staff");
  if (!email || !ROLES.has(role)) throw new HttpsError("failed-precondition", "The invitation is incomplete.");

  const rescueName = String(org.name || "TinyTitans Rescue");
  const inviteUrl = `${APP_ORIGIN}/rescue/team?invite=${encodeURIComponent(invitationId)}`;
  const subject = `${rescueName} invited you to join TinyTitans Rescue`;
  const safeName = safeHtml(rescueName);
  const safeUrl = safeHtml(inviteUrl);
  const html = `<!doctype html><html><body style="margin:0;background:#111315;font-family:Arial,sans-serif;color:#f3f1e8"><div style="max-width:620px;margin:32px auto;padding:0 20px"><div style="background:#1b1f20;border:1px solid #3a3f3f;border-radius:18px;padding:32px"><div style="font-size:28px;font-weight:800;margin-bottom:8px">🐍 Tiny Titans</div><div style="font-size:14px;color:#d5aa4b;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Rescue invitation</div><h1 style="font-size:28px;margin:24px 0 12px">You’re invited to join Tiny Titans Rescue</h1><p style="font-size:16px;line-height:1.6;color:#d8d7cf">${safeName} has invited you to join their Rescue workspace as ${safeHtml(role)}.</p><p style="font-size:15px;line-height:1.6;color:#c6c5be">Sign in or create your Tiny Titans account using the invited email address, then use the button below.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#d5aa4b;color:#111315;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px">Open Rescue Invitation</a></p><p style="font-size:13px;line-height:1.5;color:#9f9e98">This invitation remains available while it is pending.</p></div><p style="text-align:center;font-size:12px;color:#777872;margin:18px 0">🐍🦎 Tiny Titans Reptile Companion</p></div></body></html>`;
  const text = `${rescueName} invited you to join Tiny Titans Rescue as ${role}.\n\nOpen: ${inviteUrl}`;

  const mailRef = await db.collection("mail").add({
    to: email,
    from: "Tiny Titans Reptile Companion <tinytitans.exotics@gmail.com>",
    replyTo: "tinytitans.exotics@gmail.com",
    message: { subject, text, html },
    type: "rescue-staff-invitation-resend",
    rescueInvitationId: invitationId,
    organisationId,
    createdByUid: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  await invitationSnapshot.ref.set({
    lastResentAt: FieldValue.serverTimestamp(),
    lastResentByUid: request.auth.uid,
    lastMailId: mailRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, invitationId, email, role, mailId: mailRef.id };
});
