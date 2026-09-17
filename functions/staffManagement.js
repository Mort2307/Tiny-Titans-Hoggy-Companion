const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const adminAuth = getAuth();
const OWNER_EMAIL = "tinytitans.exotics@gmail.com";

const RESCUE_ROLE_FIELDS = Object.freeze({
  manager: "managerUids",
  staff: "staffUids",
  medical: "medicalUids",
  foster: "fosterUids",
  viewer: "viewerUids",
});
const RESCUE_ROLES = new Set(Object.keys(RESCUE_ROLE_FIELDS));
const BUSINESS_ROLES = new Set(["member", "manager", "staff", "viewer"]);
const BUSINESS_TIERS = new Set(["business_starter", "business_plus", "business_advanced"]);
const BUSINESS_ROLE_TIERS = new Set(["business_plus", "business_advanced"]);

function cleanText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function cleanEmail(value) {
  return cleanText(value, 160).toLowerCase();
}
function millis(value) {
  if (!value) return null;
  if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
function isOwnerEmail(value) {
  return cleanEmail(value) === OWNER_EMAIL;
}
function historyCollection(type, organisationId) {
  return db.collection("organisationStaffHistory").doc(`${type}_${organisationId}`).collection("events");
}
function rescueRole(org, uid) {
  if (String(org.ownerUid || "") === uid) return "owner";
  for (const role of RESCUE_ROLES) {
    const values = Array.isArray(org[RESCUE_ROLE_FIELDS[role]]) ? org[RESCUE_ROLE_FIELDS[role]] : [];
    if (values.includes(uid)) return role;
  }
  return null;
}
async function requireRescueManager(request, organisationId) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const ref = db.collection("rescueOrganisations").doc(organisationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Rescue organisation not found.");
  const org = snapshot.data() || {};
  const role = rescueRole(org, request.auth.uid);
  if (role !== "owner" && role !== "manager") throw new HttpsError("permission-denied", "Only Rescue owners and managers can manage staff access.");
  return { ref, org, role };
}
async function businessAccess(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  let authEmail = request.auth.token?.email || "";
  try {
    const authUser = await adminAuth.getUser(uid);
    authEmail = authUser.email || authEmail;
  } catch (error) {
    console.warn("Tiny Titans: unable to resolve business account email", error?.message || error);
  }
  if (isOwnerEmail(authEmail)) return { tier: "business_advanced", roleManage: true };

  const userSnapshot = await db.collection("users").doc(uid).get();
  const data = userSnapshot.exists ? userSnapshot.data() || {} : {};
  const tier = cleanText(data.subscriptionTier, 60);
  const status = cleanText(data.subscriptionStatus, 40) || (tier === "free" ? "free" : "active");
  const subscriptionActive = BUSINESS_TIERS.has(tier) && ["active", "trialing"].includes(status);
  const override = data.paidTesterOverride || null;
  const overrideTier = cleanText(override?.tier, 60);
  const overrideValid = override?.enabled === true && BUSINESS_TIERS.has(overrideTier) && (!override.expiresAt || millis(override.expiresAt) > Date.now());
  const trial = data.paidTrial || null;
  const trialTier = cleanText(trial?.tier, 60);
  const trialValid = trial?.enabled === true && BUSINESS_TIERS.has(trialTier) && millis(trial.expiresAt) > Date.now();
  const effectiveTier = overrideValid ? overrideTier : subscriptionActive ? tier : trialValid ? trialTier : "";
  if (!effectiveTier) throw new HttpsError("permission-denied", "An active Business tier with team access is required.");
  return { tier: effectiveTier, roleManage: BUSINESS_ROLE_TIERS.has(effectiveTier) };
}
async function writeHistory(type, organisationId, data) {
  await historyCollection(type, organisationId).add({
    organisationType: type,
    organisationId,
    action: cleanText(data.action, 80),
    subjectType: cleanText(data.subjectType, 40),
    subjectId: cleanText(data.subjectId, 160),
    subjectEmail: cleanEmail(data.subjectEmail),
    subjectName: cleanText(data.subjectName, 160),
    fromRole: cleanText(data.fromRole, 40),
    toRole: cleanText(data.toRole, 40),
    fromStatus: cleanText(data.fromStatus, 40),
    toStatus: cleanText(data.toStatus, 40),
    actorUid: cleanText(data.actorUid, 160),
    source: cleanText(data.source, 80),
    note: cleanText(data.note, 1200),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
async function authProfile(uid) {
  try {
    const user = await adminAuth.getUser(uid);
    return { uid, email: String(user.email || ""), displayName: String(user.displayName || "") };
  } catch {
    return { uid, email: "", displayName: "" };
  }
}

exports.getRescueStaffManagement = onCall({ region: "europe-west2" }, async (request) => {
  const organisationId = cleanText(request.data?.organisationId, 160);
  if (!organisationId) throw new HttpsError("invalid-argument", "A Rescue organisation is required.");
  const { org } = await requireRescueManager(request, organisationId);

  const roleMembers = [];
  for (const role of RESCUE_ROLES) {
    const uids = Array.isArray(org[RESCUE_ROLE_FIELDS[role]]) ? org[RESCUE_ROLE_FIELDS[role]] : [];
    for (const uid of uids) {
      const profile = await authProfile(String(uid));
      roleMembers.push({ ...profile, role, removed: false });
    }
  }
  const invitationSnapshot = await db.collection("rescueInvitations").where("organisationId", "==", organisationId).get();
  const invitations = invitationSnapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      email: cleanEmail(data.targetEmail),
      role: cleanText(data.role, 40),
      status: cleanText(data.status, 40) || "pending",
      invitedByUid: cleanText(data.invitedByUid, 160),
      invitedAt: millis(data.invitedAt),
      expiresAt: millis(data.expiresAt),
      updatedAt: millis(data.updatedAt),
    };
  }).sort((a, b) => (b.invitedAt || 0) - (a.invitedAt || 0));

  const historySnapshot = await historyCollection("rescue", organisationId).orderBy("createdAt", "desc").limit(200).get();
  const history = historySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: millis(doc.data().createdAt), updatedAt: millis(doc.data().updatedAt), noteUpdatedAt: millis(doc.data().noteUpdatedAt) }));
  return { success: true, organisationId, members: [{ uid: String(org.ownerUid || ""), ...(await authProfile(String(org.ownerUid || ""))), role: "owner", removed: false }, ...roleMembers], invitations, history };
});

exports.clearRescueStaffInvitation = onCall({ region: "europe-west2" }, async (request) => {
  const organisationId = cleanText(request.data?.organisationId, 160);
  const invitationId = cleanText(request.data?.invitationId, 160);
  if (!organisationId || !invitationId) throw new HttpsError("invalid-argument", "Organisation and invitation are required.");
  await requireRescueManager(request, organisationId);
  const ref = db.collection("rescueInvitations").doc(invitationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Rescue invitation not found. It may already have been cleared.");
  const invitation = snapshot.data() || {};
  if (String(invitation.organisationId || "") !== organisationId) throw new HttpsError("permission-denied", "This invitation belongs to a different organisation.");

  const mailSnapshot = await db.collection("mail").where("rescueInvitationId", "==", invitationId).get();
  const unsentMailDocs = mailSnapshot.docs.filter((mailDoc) => String(mailDoc.data()?.delivery?.state || "").toUpperCase() !== "SUCCESS");
  if (unsentMailDocs.length) {
    const batch = db.batch();
    unsentMailDocs.forEach((mailDoc) => batch.delete(mailDoc.ref));
    await batch.commit();
  }
  await ref.set({
    status: "cleared",
    clearedByUid: request.auth.uid,
    clearedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await ref.delete();
  return { success: true, invitationId, cleared: true };
});

exports.updateRescueStaffRole = onCall({ region: "europe-west2" }, async (request) => {
  const organisationId = cleanText(request.data?.organisationId, 160);
  const targetUid = cleanText(request.data?.targetUid, 160);
  const role = cleanText(request.data?.role, 40);
  if (!organisationId || !targetUid || !role) throw new HttpsError("invalid-argument", "Organisation, staff account and role are required.");
  if (!RESCUE_ROLES.has(role)) throw new HttpsError("invalid-argument", "Invalid Rescue staff role.");
  const { ref, org } = await requireRescueManager(request, organisationId);
  if (targetUid === String(org.ownerUid || "")) throw new HttpsError("failed-precondition", "The Rescue owner role cannot be changed.");
  const fromRole = rescueRole(org, targetUid);
  if (!fromRole) throw new HttpsError("not-found", "That account is not a current Rescue team member.");
  const update = { updatedAt: FieldValue.serverTimestamp() };
  for (const field of Object.values(RESCUE_ROLE_FIELDS)) update[field] = (Array.isArray(org[field]) ? org[field] : []).filter((uid) => uid !== targetUid);
  update[RESCUE_ROLE_FIELDS[role]] = [...update[RESCUE_ROLE_FIELDS[role]], targetUid];
  await ref.update(update);
  const profile = await authProfile(targetUid);
  await writeHistory("rescue", organisationId, { action: "role_changed", subjectType: "member", subjectId: targetUid, subjectEmail: profile.email, subjectName: profile.displayName, fromRole, toRole: role, actorUid: request.auth.uid, source: "staff-management" });
  return { success: true, targetUid, fromRole, role };
});

exports.getBusinessStaffManagement = onCall({ region: "europe-west2" }, async (request) => {
  const access = await businessAccess(request);
  const ownerUid = request.auth.uid;
  const ref = db.collection("paidWorkspaces").doc(ownerUid).collection("teamMembers");
  const snapshot = await ref.get();
  const members = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (millis(b.updatedAt) || 0) - (millis(a.updatedAt) || 0));
  const historySnapshot = await historyCollection("business", ownerUid).orderBy("createdAt", "desc").limit(200).get();
  const history = historySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: millis(doc.data().createdAt), updatedAt: millis(doc.data().updatedAt), noteUpdatedAt: millis(doc.data().noteUpdatedAt) }));
  return { success: true, organisationId: ownerUid, tier: access.tier, roleManage: access.roleManage, members, history };
});

exports.saveBusinessStaffMember = onCall({ region: "europe-west2" }, async (request) => {
  const access = await businessAccess(request);
  const payload = request.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  const id = cleanText(payload.id, 120);
  const email = cleanEmail(payload.email);
  const displayName = cleanText(payload.displayName, 120);
  const role = cleanText(payload.role, 40) || "member";
  const note = cleanText(payload.note, 1200);
  if (!email || !email.includes("@")) throw new HttpsError("invalid-argument", "A valid team member email is required.");
  if (!BUSINESS_ROLES.has(role)) throw new HttpsError("invalid-argument", "Invalid Business staff role.");
  if (!access.roleManage && role !== "member") throw new HttpsError("permission-denied", "Your Business tier does not include role management.");
  const collection = db.collection("paidWorkspaces").doc(request.auth.uid).collection("teamMembers");
  const ref = id ? collection.doc(id) : collection.doc();
  const beforeSnapshot = await ref.get();
  const before = beforeSnapshot.exists ? beforeSnapshot.data() || {} : null;
  const next = {
    email,
    displayName,
    role,
    note,
    status: cleanText(payload.status, 40) || before?.status || "invited",
    updatedByUid: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!beforeSnapshot.exists) next.createdAt = FieldValue.serverTimestamp();
  await ref.set(next, { merge: true });
  return { success: true, id: ref.id };
});

exports.clearBusinessStaffMember = onCall({ region: "europe-west2" }, async (request) => {
  await businessAccess(request);
  const id = cleanText(request.data?.id, 120);
  if (!id) throw new HttpsError("invalid-argument", "A Business team member ID is required.");
  const ref = db.collection("paidWorkspaces").doc(request.auth.uid).collection("teamMembers").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "That team record no longer exists.");
  await ref.set({ updatedByUid: request.auth.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await ref.delete();
  return { success: true, id, cleared: true };
});

exports.editOrganisationStaffHistory = onCall({ region: "europe-west2" }, async (request) => {
  const organisationType = cleanText(request.data?.organisationType, 30);
  const organisationId = cleanText(request.data?.organisationId, 160);
  const historyId = cleanText(request.data?.historyId, 160);
  const note = cleanText(request.data?.note, 1200);
  if (!["rescue", "business"].includes(organisationType) || !organisationId || !historyId) throw new HttpsError("invalid-argument", "A valid organisation and history record are required.");
  if (organisationType === "rescue") {
    await requireRescueManager(request, organisationId);
  } else {
    await businessAccess(request);
    if (organisationId !== request.auth.uid) throw new HttpsError("permission-denied", "Business history belongs to the signed-in organisation owner.");
  }
  const ref = historyCollection(organisationType, organisationId).doc(historyId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Staff history record not found.");
  await ref.update({ note, noteUpdatedAt: FieldValue.serverTimestamp(), noteUpdatedByUid: request.auth.uid, updatedAt: FieldValue.serverTimestamp() });
  return { success: true, historyId };
});

exports.trackRescueInvitationHistory = onDocumentWritten({ region: "europe-west2", document: "rescueInvitations/{invitationId}" }, async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
  const data = after || before || {};
  const organisationId = cleanText(data.organisationId, 160);
  if (!organisationId) return;
  const invitationId = cleanText(event.params.invitationId, 160);
  const beforeStatus = cleanText(before?.status, 40);
  const afterStatus = cleanText(after?.status, 40);
  const beforeRole = cleanText(before?.role, 40);
  const afterRole = cleanText(after?.role, 40);
  let action = "updated";
  if (!before && after) action = "invited";
  else if (before && !after) action = "deleted";
  else if (beforeStatus !== afterStatus) action = "status_changed";
  else if (beforeRole !== afterRole) action = "role_changed";
  else if (before?.targetEmail !== after?.targetEmail) action = "recipient_changed";
  else return;
  const actorUid = cleanText(after?.clearedByUid || after?.acceptedByUid || after?.declinedByUid || after?.updatedByUid || after?.invitedByUid || before?.clearedByUid || before?.acceptedByUid || before?.declinedByUid || before?.updatedByUid || before?.invitedByUid, 160);
  await writeHistory("rescue", organisationId, { action, subjectType: "invitation", subjectId: invitationId, subjectEmail: cleanEmail(after?.targetEmail || before?.targetEmail), fromRole: beforeRole, toRole: afterRole, fromStatus: beforeStatus, toStatus: afterStatus, actorUid, source: "invitation-trigger" });
});

exports.trackBusinessStaffHistory = onDocumentWritten({ region: "europe-west2", document: "paidWorkspaces/{ownerUid}/teamMembers/{memberId}" }, async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
  if (!before && !after) return;
  const ownerUid = cleanText(event.params.ownerUid, 160);
  const memberId = cleanText(event.params.memberId, 160);
  const beforeRole = cleanText(before?.role, 40);
  const afterRole = cleanText(after?.role, 40);
  const beforeStatus = cleanText(before?.status, 40);
  const afterStatus = cleanText(after?.status, 40);
  let action = "updated";
  if (!before && after) action = "member_created";
  else if (before && !after) action = "member_deleted";
  else if (beforeRole !== afterRole) action = "role_changed";
  else if (beforeStatus !== afterStatus) action = "status_changed";
  else if (cleanText(before?.email, 160) !== cleanText(after?.email, 160)) action = "email_changed";
  else if (cleanText(before?.displayName, 160) !== cleanText(after?.displayName, 160)) action = "profile_changed";
  else if (cleanText(before?.note, 1200) !== cleanText(after?.note, 1200)) action = "note_changed";
  else return;
  await writeHistory("business", ownerUid, { action, subjectType: "member", subjectId: memberId, subjectEmail: cleanEmail(after?.email || before?.email), subjectName: cleanText(after?.displayName || before?.displayName, 160), fromRole: beforeRole, toRole: afterRole, fromStatus: beforeStatus, toStatus: afterStatus, actorUid: cleanText(after?.updatedByUid || before?.updatedByUid, 160), source: "team-member-trigger" });
});
