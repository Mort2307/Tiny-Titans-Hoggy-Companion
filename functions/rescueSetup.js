const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const db = getFirestore();

const STAFF_ROLES = ["manager", "staff", "medical"];
const COMMUNITY_ROLES = ["foster", "viewer"];
const ALL_ROLES = ["manager", "staff", "medical", "foster", "viewer"];

function roleFor(org, uid) {
  if (String(org.ownerUid || "") === uid) return "owner";
  for (const role of ALL_ROLES) {
    if (Array.isArray(org[`${role}Uids`]) && org[`${role}Uids`].includes(uid)) return role;
  }
  return null;
}

function millis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function clean(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function emailLooksValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function httpUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

function setupOrganisation(organisationId, org) {
  return {
    id: organisationId,
    name: clean(org.name, 120),
    logoUrl: clean(org.logoUrl, 500),
    heroImageUrl: clean(org.heroImageUrl, 500),
    directoryDescription: clean(org.directoryDescription || org.publicDescription, 3000),
    website: clean(org.website, 500),
    contactEmail: clean(org.contactEmail, 200),
    phone: clean(org.phone, 60),
    locationLabel: clean(org.locationLabel || org.city || org.town, 160),
    postcode: clean(org.postcode, 30),
    region: clean(org.region, 120),
    country: clean(org.country, 120),
    openingHours: clean(org.openingHours, 1000),
    charityNumber: clean(org.charityNumber, 120),
    companyNumber: clean(org.companyNumber, 120),
    localAuthorityLicence: clean(org.localAuthorityLicence, 120),
    otherRegistrationNumber: clean(org.otherRegistrationNumber, 120),
    registrationAuthority: clean(org.registrationAuthority, 160),
    registrationsPublic: org.registrationsPublic === true,
    directoryVisible: org.directoryVisible !== false,
    setupComplete: org.setupComplete === true,
    setupCompletedAt: millis(org.setupCompletedAt),
  };
}

async function getOrganisation(organisationId) {
  const ref = db.collection("rescueOrganisations").doc(organisationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Rescue organisation not found.");
  const org = snapshot.data() || {};
  return { ref, org };
}

exports.getRescueSetupState = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const organisationId = String(request.data?.organisationId || "").trim();
  if (!organisationId) throw new HttpsError("invalid-argument", "Organisation ID is required.");
  const { org } = await getOrganisation(organisationId);
  const role = roleFor(org, request.auth.uid);
  if (!role) throw new HttpsError("permission-denied", "You are not connected to this Rescue.");
  return { success: true, organisationId, role, organisation: setupOrganisation(organisationId, org) };
});

exports.updateRescuePublicProfile = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const organisationId = String(request.data?.organisationId || "").trim();
  if (!organisationId) throw new HttpsError("invalid-argument", "Organisation ID is required.");
  const { ref, org } = await getOrganisation(organisationId);
  const role = roleFor(org, request.auth.uid);
  if (role !== "owner" && !STAFF_ROLES.includes(role)) throw new HttpsError("permission-denied", "Only Rescue owners and authorised staff can edit the public Rescue profile.");

  const name = clean(request.data?.name, 120);
  const directoryDescription = clean(request.data?.directoryDescription, 3000);
  const website = clean(request.data?.website, 500);
  const contactEmail = clean(request.data?.contactEmail, 200).toLowerCase();
  const phone = clean(request.data?.phone, 60);
  const locationLabel = clean(request.data?.locationLabel, 160);
  const postcode = clean(request.data?.postcode, 30);
  const region = clean(request.data?.region, 120);
  const country = clean(request.data?.country, 120);
  const openingHours = clean(request.data?.openingHours, 1000);
  const logoUrl = clean(request.data?.logoUrl, 500);
  const heroImageUrl = clean(request.data?.heroImageUrl, 500);
  const charityNumber = clean(request.data?.charityNumber, 120);
  const companyNumber = clean(request.data?.companyNumber, 120);
  const localAuthorityLicence = clean(request.data?.localAuthorityLicence, 120);
  const otherRegistrationNumber = clean(request.data?.otherRegistrationNumber, 120);
  const registrationAuthority = clean(request.data?.registrationAuthority, 160);
  const registrationsPublic = request.data?.registrationsPublic === true;
  const directoryVisible = request.data?.directoryVisible !== false;

  if (name.length < 2) throw new HttpsError("invalid-argument", "Enter the Rescue name.");
  if (directoryDescription.length < 20) throw new HttpsError("invalid-argument", "Add a short public description so visitors understand who the Rescue is and what it does.");
  if (!emailLooksValid(contactEmail)) throw new HttpsError("invalid-argument", "Enter a valid public contact email address.");
  if (locationLabel.length < 2) throw new HttpsError("invalid-argument", "Enter the public town, area or location for the Rescue.");
  if (region.length < 2) throw new HttpsError("invalid-argument", "Enter the public region / county / state.");
  if (country.length < 2) throw new HttpsError("invalid-argument", "Enter the public country.");
  if (website && !httpUrl(website)) throw new HttpsError("invalid-argument", "Website must be a valid http(s) address.");
  if (logoUrl && !httpUrl(logoUrl)) throw new HttpsError("invalid-argument", "Logo URL must be a valid http(s) address.");
  if (heroImageUrl && !httpUrl(heroImageUrl)) throw new HttpsError("invalid-argument", "Hero image URL must be a valid http(s) address.");
  if (!directoryVisible && org.setupComplete !== true) throw new HttpsError("failed-precondition", "Your public Rescue profile must be enabled when completing first-time setup.");
  if (org.setupComplete !== true && role !== "owner") throw new HttpsError("permission-denied", "Only the Rescue owner can complete first-time Rescue setup.");

  const update = {
    name,
    logoUrl,
    heroImageUrl,
    directoryDescription,
    publicDescription: directoryDescription,
    website,
    contactEmail,
    phone,
    locationLabel,
    postcode,
    region,
    country,
    openingHours,
    charityNumber,
    companyNumber,
    localAuthorityLicence,
    otherRegistrationNumber,
    registrationAuthority,
    registrationsPublic,
    directoryVisible,
    setupComplete: true,
    setupCompletedAt: FieldValue.serverTimestamp(),
    setupCompletedByUid: request.auth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(update, { merge: true });
  const updated = await ref.get();
  return { success: true, organisationId, role, organisation: setupOrganisation(organisationId, updated.data() || {}) };
});

exports.getPublicRescueProfile = onCall({ region: "europe-west2" }, async (request) => {
  const organisationId = String(request.data?.organisationId || "").trim();
  if (!organisationId) throw new HttpsError("invalid-argument", "Organisation ID is required.");
  const { org } = await getOrganisation(organisationId);
  if (org.accountType && org.accountType !== "rescue") throw new HttpsError("not-found", "This Rescue profile is not currently public.");
  const pilotActive = org.pilotStatus === "pilot_active" && millis(org.pilotEndsAt) !== null && millis(org.pilotEndsAt) > Date.now();
  const active = org.accountStatus === "paid_active" || pilotActive;
  if (!active || org.setupComplete !== true || org.directoryVisible === false) throw new HttpsError("not-found", "This Rescue profile is not currently public.");

  const snapshot = await db.collection("rescueAnimalPublic").where("organisationId", "==", organisationId).limit(200).get();
  const animals = snapshot.docs.map((item) => {
    const data = item.data() || {};
    return {
      id: item.id,
      name: clean(data.name || "Rescue animal", 160),
      speciesCommonName: clean(data.speciesCommonName || "Species awaiting identification", 160),
      scientificName: clean(data.scientificName, 180),
      sex: clean(data.sex || "Unknown", 40),
      morphOrColour: clean(data.morphOrColour, 160),
      estimatedAge: clean(data.estimatedAge, 100),
      status: String(data.status || "in_care"),
      publicSummary: clean(data.publicSummary, 2000),
    };
  }).filter((animal) => animal.status !== "deceased" && animal.status !== "transferred");

  return {
    success: true,
    organisation: {
      id: organisationId,
      name: clean(org.name || "Rescue Centre", 120),
      locationLabel: clean(org.locationLabel || org.city || org.town, 160),
      postcode: clean(org.postcode, 30),
      region: clean(org.region, 120),
      country: clean(org.country, 120),
      website: clean(org.website, 500),
      contactEmail: clean(org.contactEmail, 200),
      phone: clean(org.phone, 60),
      openingHours: clean(org.openingHours, 1000),
      description: clean(org.directoryDescription || org.publicDescription, 3000),
      logoUrl: clean(org.logoUrl, 500),
      heroImageUrl: clean(org.heroImageUrl, 500),
      speciesDiscovered: Array.isArray(org.speciesDiscovered) ? org.speciesDiscovered.filter((item) => typeof item === "string").slice(0, 20) : [],
      charityNumber: org.registrationsPublic !== false ? clean(org.charityNumber, 120) : "",
      companyNumber: org.registrationsPublic !== false ? clean(org.companyNumber, 120) : "",
      localAuthorityLicence: org.registrationsPublic !== false ? clean(org.localAuthorityLicence, 120) : "",
      otherRegistrationNumber: org.registrationsPublic !== false ? clean(org.otherRegistrationNumber, 120) : "",
      registrationAuthority: org.registrationsPublic !== false ? clean(org.registrationAuthority, 160) : "",
    },
    animals,
  };
});
