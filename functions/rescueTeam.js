const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const adminAuth = getAuth();
const ROLES = Object.freeze(["manager", "staff", "medical", "foster", "viewer"]);
const ROLE_FIELDS = Object.freeze({ manager: "managerUids", staff: "staffUids", medical: "medicalUids", foster: "fosterUids", viewer: "viewerUids" });

function roleFor(org, uid) {
  if (String(org.ownerUid || "") === uid) return "owner";
  for (const role of ROLES) if (Array.isArray(org[ROLE_FIELDS[role]]) && org[ROLE_FIELDS[role]].includes(uid)) return role;
  return null;
}

exports.getRescueTeam = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const organisationId = String(request.data?.organisationId || "").trim();
  if (!organisationId) throw new HttpsError("invalid-argument", "Organisation ID is required.");
  const snapshot = await db.collection("rescueOrganisations").doc(organisationId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Rescue organisation not found.");
  const org = snapshot.data() || {};
  const callerRole = roleFor(org, request.auth.uid);
  if (callerRole !== "owner" && callerRole !== "manager") throw new HttpsError("permission-denied", "Only Rescue owners and managers can inspect team membership.");
  const memberIds = [...new Set([String(org.ownerUid || ""), ...(Array.isArray(org.managerUids) ? org.managerUids : []), ...(Array.isArray(org.staffUids) ? org.staffUids : []), ...(Array.isArray(org.medicalUids) ? org.medicalUids : []), ...(Array.isArray(org.fosterUids) ? org.fosterUids : []), ...(Array.isArray(org.viewerUids) ? org.viewerUids : [])].filter(Boolean))];
  const members = await Promise.all(memberIds.map(async (uid) => {
    const user = await adminAuth.getUser(uid);
    return { uid, email: String(user.email || ""), displayName: String(user.displayName || user.email || "TinyTitans member"), role: roleFor(org, uid) || "viewer" };
  }));
  return { success: true, organisationId, members };
});
