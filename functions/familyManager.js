const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const AREAS = ["snakes", "weights", "feeding", "sheds", "behaviour", "health", "breeding", "genetics"];
const ACTIONS = ["view", "create", "edit", "delete"];

function requireUid(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function getFamily(uid) {
  const profile = await db.collection("users").doc(uid).get();
  const familyId = profile.exists ? String(profile.data()?.familyId || "") : "";
  if (!familyId) return null;
  const family = await db.collection("families").doc(familyId).get();
  return family.exists ? { id: family.id, data: family.data() || {} } : null;
}

function assertOwner(family, uid, message) {
  if (!family || String(family.data.ownerUid || "") !== uid) throw new HttpsError("permission-denied", message);
}

function permissionsForMode(mode) {
  const permissions = {};
  for (const area of AREAS) {
    for (const action of ACTIONS) {
      permissions[`${area}.${action}`] = action === "view" ? "allow" : mode === "full" ? "allow" : mode === "review" ? "verify" : "deny";
    }
  }
  return permissions;
}

function safeFamilyRecordPath(path, ownerUid) {
  const parts = String(path || "").split("/");
  if (parts.length < 4 || parts[0] !== "users" || parts[1] !== ownerUid) return false;
  if (parts[2] === "snakes") return parts.length === 4 || (parts.length === 6 && ["weights", "feedings", "sheds", "health", "behaviours"].includes(parts[4]));
  if (parts[2] === "breedingProjects") return parts.length === 4 || (parts.length === 6 && ["pairings", "clutches", "hatchlings"].includes(parts[4]));
  return false;
}

exports.setFamilyMemberAccessModeSecure = onCall({ region: "europe-west2" }, async (request) => {
  const ownerUid = requireUid(request);
  const memberUid = String(request.data?.memberUid || "");
  const mode = String(request.data?.mode || "");
  if (!memberUid || !["full", "review", "sandbox"].includes(mode)) throw new HttpsError("invalid-argument", "A family member and access mode are required.");
  if (memberUid === ownerUid) throw new HttpsError("failed-precondition", "The Family Head always has Full Permission.");
  const family = await getFamily(ownerUid);
  assertOwner(family, ownerUid, "Only the Family Head can change family permissions.");
  const members = Array.isArray(family.data.memberUids) ? family.data.memberUids : [];
  if (!members.includes(memberUid)) throw new HttpsError("not-found", "That account is not a member of your family.");
  await family.data && db.collection("families").doc(family.id).collection("permissions").doc(memberUid).set({ familyId: family.id, memberUid, accessMode: mode, permissions: permissionsForMode(mode), updatedAt: FieldValue.serverTimestamp(), updatedByUid: ownerUid }, { merge: true });
  await db.collection("familyHistory").add({ familyId: family.id, actorUid: ownerUid, targetUid: memberUid, eventType: "permission_mode_changed", summary: `Permission mode changed to ${mode}.`, details: { mode }, createdAt: FieldValue.serverTimestamp() });
  return { success: true, familyId: family.id, memberUid, mode };
});

exports.getFamilyApprovalsSecure = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireUid(request);
  const family = await getFamily(uid);
  assertOwner(family, uid, "Only the Family Head can review family changes.");
  const snapshot = await db.collection("familyApprovals").where("familyId", "==", family.id).get();
  const approvals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
    const left = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const right = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return right - left;
  });
  return { approvals };
});

exports.decideFamilyApprovalSecure = onCall({ region: "europe-west2" }, async (request) => {
  const ownerUid = requireUid(request);
  const approvalId = String(request.data?.approvalId || "");
  const status = String(request.data?.status || "");
  if (!approvalId || !["approved", "rejected"].includes(status)) throw new HttpsError("invalid-argument", "An approval ID and decision are required.");
  const family = await getFamily(ownerUid);
  assertOwner(family, ownerUid, "Only the Family Head can approve family changes.");
  return db.runTransaction(async (tx) => {
    const approvalRef = db.collection("familyApprovals").doc(approvalId);
    const approvalSnap = await tx.get(approvalRef);
    if (!approvalSnap.exists) throw new HttpsError("not-found", "That family approval no longer exists.");
    const approval = approvalSnap.data() || {};
    if (String(approval.familyId || "") !== family.id) throw new HttpsError("permission-denied", "That approval does not belong to your family.");
    if (approval.status !== "pending") throw new HttpsError("failed-precondition", "That approval has already been decided.");

    const payload = approval.payload || {};
    const paths = Array.isArray(payload.paths) ? payload.paths.filter((path) => typeof path === "string") : (payload.targetPath ? [String(payload.targetPath)] : []);
    if (!paths.length || paths.length > 100 || !paths.every((path) => safeFamilyRecordPath(path, ownerUid))) throw new HttpsError("failed-precondition", "This approval targets a protected or invalid family record.");

    if (status === "approved") {
      if (payload.operation === "delete" || payload.operation === "deleteTree") {
        for (const path of paths) tx.delete(db.doc(path));
      } else {
        const data = payload.data && typeof payload.data === "object" ? payload.data : {};
        tx.set(db.doc(paths[0]), data, { merge: payload.operation === "update" });
      }
    }

    tx.update(approvalRef, { status, decidedByUid: ownerUid, decidedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("familyHistory").doc(), {
      familyId: family.id,
      actorUid: ownerUid,
      targetUid: String(approval.requesterUid || ""),
      eventType: `approval_${status}`,
      summary: `${status === "approved" ? "Approved" : "Rejected"}: ${String(approval.title || "Family change")}`,
      details: { approvalId, area: approval.area || null, action: approval.action || null, operation: payload.operation || null, before: payload.before || null, proposed: payload.data || {} },
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, status, requesterUid: String(approval.requesterUid || "") };
  });
});

exports.getFamilyHistorySecure = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireUid(request);
  const family = await getFamily(uid);
  if (!family || !(Array.isArray(family.data.memberUids) && family.data.memberUids.includes(uid))) throw new HttpsError("permission-denied", "You must be a member of this family to view its history.");
  const snapshot = await db.collection("familyHistory").where("familyId", "==", family.id).get();
  const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
    const left = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const right = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return right - left;
  });
  return { events };
});
