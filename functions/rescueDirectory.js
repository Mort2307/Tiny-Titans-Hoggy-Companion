const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const db = getFirestore();
const ROLES = new Set(["owner", "manager", "staff", "medical", "foster", "viewer"]);
function millis(value) { if (!value) return null; if (typeof value === "object" && value !== null && typeof value.toMillis === "function") return value.toMillis(); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
function activePilot(org) { return org.pilotStatus === "pilot_active" && millis(org.pilotEndsAt) !== null && millis(org.pilotEndsAt) > Date.now(); }
function activeDirectoryOrg(org) { return org.accountType === "rescue" && (org.accountStatus === "paid_active" || activePilot(org)); }
function roleFor(org, uid) { if (org.ownerUid === uid) return "owner"; for (const role of ROLES) { const field = `${role}Uids`; if (Array.isArray(org[field]) && org[field].includes(uid)) return role; } return null; }
function httpUrl(value) { if (!value) return ""; try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:" ? value : ""; } catch { return ""; } }
function cleanDirectoryOrg(doc) {
  const data = doc.data() || {};
  const publicRegs = data.registrationsPublic !== false;
  return {
    id: doc.id,
    name: String(data.name || "My Rescue Centre"),
    accountStatus: String(data.accountStatus || "pilot_pending"),
    locationLabel: String(data.locationLabel || data.city || data.town || ""),
    postcode: String(data.postcode || ""),
    region: String(data.region || ""),
    country: String(data.country || ""),
    website: String(data.website || ""),
    contactEmail: String(data.contactEmail || ""),
    description: String(data.directoryDescription || data.publicDescription || ""),
    logoUrl: String(data.logoUrl || ""),
    heroImageUrl: String(data.heroImageUrl || ""),
    speciesDiscovered: Array.isArray(data.speciesDiscovered) ? data.speciesDiscovered : [],
    pilot: activePilot(data),
    charityNumber: publicRegs ? String(data.charityNumber || "") : "",
    companyNumber: publicRegs ? String(data.companyNumber || "") : "",
    localAuthorityLicence: publicRegs ? String(data.localAuthorityLicence || "") : "",
    otherRegistrationNumber: publicRegs ? String(data.otherRegistrationNumber || "") : "",
    registrationAuthority: publicRegs ? String(data.registrationAuthority || "") : "",
    registrationsPublic: publicRegs
  };
}
exports.listRescueDirectory = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in to browse Rescue organisations.");
  const queryText = String(request.data?.query || "").trim().toLowerCase();
  const snapshot = await db.collection("rescueOrganisations").limit(200).get();
  const organisations = snapshot.docs
    .filter((doc) => {
      const data = doc.data() || {};
      return activeDirectoryOrg(data) && data.directoryVisible === true && Boolean(String(data.locationLabel || data.city || data.town || "").trim());
    })
    .map(cleanDirectoryOrg)
    .filter((org) => !queryText || [org.name, org.locationLabel, org.postcode, org.region, org.country, org.description, org.charityNumber, org.companyNumber, org.localAuthorityLicence, org.otherRegistrationNumber].join(" ").toLowerCase().includes(queryText))
    .sort((a, b) => a.name.localeCompare(b.name) || a.locationLabel.localeCompare(b.locationLabel));
  return { success: true, organisations, count: organisations.length };
});
exports.updateRescueDirectoryProfile = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const owned = await db.collection("rescueOrganisations").where("ownerUid", "==", uid).limit(1).get();
  if (owned.empty) throw new HttpsError("not-found", "You do not own a Rescue organisation.");
  const ref = owned.docs[0].ref;
  const existing = owned.docs[0].data() || {};
  const name = request.data?.name !== undefined ? String(request.data.name || "").trim() : String(existing.name || "").trim();
  const logoUrl = String(request.data?.logoUrl || "").trim();
  const heroImageUrl = String(request.data?.heroImageUrl || "").trim();
  if (name.length < 2) throw new HttpsError("invalid-argument", "Enter a valid Rescue organisation name.");
  if (logoUrl && !httpUrl(logoUrl)) throw new HttpsError("invalid-argument", "Logo image URL must be a valid http(s) address.");
  if (heroImageUrl && !httpUrl(heroImageUrl)) throw new HttpsError("invalid-argument", "Hero image URL must be a valid http(s) address.");
  const fields = {
    name,
    locationLabel: String(request.data?.locationLabel || "").trim(),
    postcode: String(request.data?.postcode || "").trim(),
    region: String(request.data?.region || "").trim(),
    country: String(request.data?.country || "").trim(),
    website: String(request.data?.website || "").trim(),
    contactEmail: String(request.data?.contactEmail || "").trim(),
    openingHours: String(request.data?.openingHours || "").trim(),
    directoryDescription: String(request.data?.description || "").trim(),
    logoUrl,
    heroImageUrl,
    charityNumber: String(request.data?.charityNumber || "").trim(),
    companyNumber: String(request.data?.companyNumber || "").trim(),
    localAuthorityLicence: String(request.data?.localAuthorityLicence || "").trim(),
    otherRegistrationNumber: String(request.data?.otherRegistrationNumber || "").trim(),
    registrationAuthority: String(request.data?.registrationAuthority || "").trim(),
    registrationNotes: String(request.data?.registrationNotes || "").trim(),
    registrationEvidenceUrl: String(request.data?.registrationEvidenceUrl || "").trim(),
    registrationsPublic: request.data?.registrationsPublic !== false,
    directoryVisible: request.data?.directoryVisible !== false,
    updatedAt: FieldValue.serverTimestamp()
  };
  if (!fields.locationLabel) throw new HttpsError("invalid-argument", "A searchable Rescue location is required.");
  await ref.set(fields, { merge: true });
  return { success: true, organisationId: ref.id };
});
