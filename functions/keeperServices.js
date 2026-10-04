const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const MAX_PENDING_PER_USER = 5;
const MAX_PUBLIC_RESULTS = 400;
const CATEGORIES = new Set(["exotic_vet", "emergency_vet", "rescue", "reptile_shop", "breeder", "boarding", "transport", "other"]);
const ANIMAL_GROUPS = new Set(["reptiles", "amphibians", "arachnids", "invertebrates", "fish", "birds", "mammals", "exotic_general"]);
const FEATURES = new Set(["emergency_24h", "reptile_experienced", "exotics_only", "home_visits", "boarding", "delivery", "accessible"]);

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}
async function requireCreator(request) {
  const uid = requireAuth(request);
  const claims = request.auth.token || {};
  if (claims.creator === true || claims.admin === true || claims.superAdmin === true) return uid;
  const snapshot = await db.collection("users").doc(uid).get();
  const profile = snapshot.data() || {};
  if (profile.role === "admin" || profile.profileType === "creator") return uid;
  throw new HttpsError("permission-denied", "Creator authorization is required.");
}
function textValue(value, field, max, required = false) {
  const result = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (required && !result) throw new HttpsError("invalid-argument", `${field} is required.`);
  if (result.length > max) throw new HttpsError("invalid-argument", `${field} is too long.`);
  return result;
}
function multilineValue(value, field, max) {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new HttpsError("invalid-argument", `${field} is too long.`);
  return result;
}
function httpUrl(value, field) {
  const result = textValue(value, field, 500);
  if (!result) return "";
  try {
    const url = new URL(result);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
    return url.toString();
  } catch {
    throw new HttpsError("invalid-argument", `${field} must be a valid http(s) address.`);
  }
}
function emailValue(value) {
  const email = textValue(value, "email", 200).toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError("invalid-argument", "Enter a valid public business email.");
  return email;
}
function enumValue(value, allowed, field) {
  const result = String(value || "").trim();
  if (!allowed.has(result)) throw new HttpsError("invalid-argument", `Choose a valid ${field}.`);
  return result;
}
function enumList(value, allowed, max, field) {
  if (!Array.isArray(value)) return [];
  const clean = [...new Set(value.map((item) => String(item || "").trim()).filter((item) => allowed.has(item)))];
  if (clean.length > max) throw new HttpsError("invalid-argument", `Too many ${field} values.`);
  return clean;
}
function timestampMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
function normalise(value) {
  return String(value || "").trim().toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
async function geocode(city, country) {
  try {
    const params = new URLSearchParams({ name: `${city}, ${country}`, count: "10", language: "en", format: "json" });
    const response = await fetch(`${GEO_URL}?${params.toString()}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const payload = await response.json();
    const results = Array.isArray(payload.results) ? payload.results : [];
    const cityKey = normalise(city);
    const countryKey = normalise(country);
    const match = results.find((item) => normalise(item.name) === cityKey && normalise(item.country) === countryKey)
      || results.find((item) => normalise(item.country) === countryKey)
      || results[0];
    const latitude = Number(match?.latitude);
    const longitude = Number(match?.longitude);
    if (!match || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0)) return null;
    return {
      latitude: Number(latitude.toFixed(3)),
      longitude: Number(longitude.toFixed(3)),
      countryCode: typeof match.country_code === "string" ? match.country_code.toUpperCase() : "",
      canonicalCity: String(match.name || city).trim() || city,
      canonicalCountry: String(match.country || country).trim() || country,
      source: "open-meteo-geocoding",
    };
  } catch (error) {
    console.warn("Tiny Titans keeper service geocoding unavailable", { city, country, error: String(error?.message || error) });
    return null;
  }
}
function publicService(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    name: String(data.name || ""),
    category: String(data.category || "other"),
    city: String(data.city || ""),
    region: String(data.region || ""),
    country: String(data.country || ""),
    countryCode: String(data.countryCode || ""),
    postcode: String(data.postcode || ""),
    latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    website: String(data.website || ""),
    publicEmail: String(data.publicEmail || ""),
    publicPhone: String(data.publicPhone || ""),
    openingHours: String(data.openingHours || ""),
    description: String(data.description || ""),
    animalGroups: Array.isArray(data.animalGroups) ? data.animalGroups : [],
    features: Array.isArray(data.features) ? data.features : [],
    professionalRegistration: String(data.professionalRegistration || ""),
    reviewLabel: "Tiny Titans reviewed listing",
    reviewedAt: timestampMillis(data.reviewedAt),
  };
}
function creatorSubmission(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    status: String(data.status || "pending"),
    name: String(data.name || ""),
    category: String(data.category || "other"),
    city: String(data.city || ""),
    region: String(data.region || ""),
    country: String(data.country || ""),
    postcode: String(data.postcode || ""),
    latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    website: String(data.website || ""),
    publicEmail: String(data.publicEmail || ""),
    publicPhone: String(data.publicPhone || ""),
    openingHours: String(data.openingHours || ""),
    description: String(data.description || ""),
    animalGroups: Array.isArray(data.animalGroups) ? data.animalGroups : [],
    features: Array.isArray(data.features) ? data.features : [],
    professionalRegistration: String(data.professionalRegistration || ""),
    evidenceUrl: String(data.evidenceUrl || ""),
    submittedByUid: String(data.submittedByUid || ""),
    submittedByName: String(data.submittedByName || ""),
    submittedAt: timestampMillis(data.submittedAt),
    reviewedAt: timestampMillis(data.reviewedAt),
    reviewNote: String(data.reviewNote || ""),
  };
}

exports.listKeeperServices = onCall({ region: "europe-west2" }, async (request) => {
  requireAuth(request);
  const queryText = normalise(request.data?.query || "");
  const category = String(request.data?.category || "").trim();
  if (category && !CATEGORIES.has(category)) throw new HttpsError("invalid-argument", "Choose a valid service category.");
  const snapshot = await db.collection("keeperServices").limit(MAX_PUBLIC_RESULTS).get();
  const services = snapshot.docs
    .filter((item) => item.data()?.status === "approved")
    .map(publicService)
    .filter((item) => !category || item.category === category)
    .filter((item) => !queryText || normalise([item.name, item.city, item.region, item.country, item.postcode, item.description, ...item.animalGroups, ...item.features].join(" ")).includes(queryText))
    .sort((a, b) => a.name.localeCompare(b.name) || a.city.localeCompare(b.city));
  return { success: true, services, count: services.length };
});

exports.submitKeeperService = onCall({ region: "europe-west2", timeoutSeconds: 20 }, async (request) => {
  const uid = requireAuth(request);
  const pendingSnapshot = await db.collection("keeperServiceSubmissions").where("submittedByUid", "==", uid).limit(20).get();
  const pendingCount = pendingSnapshot.docs.filter((item) => item.data()?.status === "pending").length;
  if (pendingCount >= MAX_PENDING_PER_USER) throw new HttpsError("resource-exhausted", "You already have five service suggestions waiting for review.");

  const name = textValue(request.data?.name, "name", 120, true);
  const category = enumValue(request.data?.category, CATEGORIES, "service category");
  const city = textValue(request.data?.city, "city", 100, true);
  const region = textValue(request.data?.region, "region", 100);
  const country = textValue(request.data?.country, "country", 100, true);
  const postcode = textValue(request.data?.postcode, "postcode", 30);
  const website = httpUrl(request.data?.website, "website");
  const publicEmail = emailValue(request.data?.publicEmail);
  const publicPhone = textValue(request.data?.publicPhone, "publicPhone", 50);
  const openingHours = textValue(request.data?.openingHours, "openingHours", 200);
  const description = multilineValue(request.data?.description, "description", 1200);
  const professionalRegistration = textValue(request.data?.professionalRegistration, "professionalRegistration", 200);
  const evidenceUrl = httpUrl(request.data?.evidenceUrl, "evidenceUrl");
  const animalGroups = enumList(request.data?.animalGroups, ANIMAL_GROUPS, 8, "animal group");
  const features = enumList(request.data?.features, FEATURES, 7, "feature");
  if (!animalGroups.length) throw new HttpsError("invalid-argument", "Choose at least one animal group this service supports.");

  const [location, userSnapshot] = await Promise.all([geocode(city, country), db.collection("users").doc(uid).get()]);
  const user = userSnapshot.data() || {};
  const ref = db.collection("keeperServiceSubmissions").doc();
  await ref.set({
    name,
    category,
    city: location?.canonicalCity || city,
    region,
    country: location?.canonicalCountry || country,
    countryCode: location?.countryCode || "",
    postcode,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    geocodingSource: location?.source || "unresolved",
    website,
    publicEmail,
    publicPhone,
    openingHours,
    description,
    animalGroups,
    features,
    professionalRegistration,
    evidenceUrl,
    status: "pending",
    submittedByUid: uid,
    submittedByName: String(user.displayName || request.auth.token?.name || "Tiny Titans keeper"),
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true, submissionId: ref.id, geocoded: Boolean(location) };
});

exports.listMyKeeperServiceSubmissions = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireAuth(request);
  const snapshot = await db.collection("keeperServiceSubmissions").where("submittedByUid", "==", uid).limit(50).get();
  const submissions = snapshot.docs.map(creatorSubmission).sort((a, b) => Number(b.submittedAt || 0) - Number(a.submittedAt || 0));
  return { success: true, submissions };
});

exports.getCreatorKeeperServiceSubmissions = onCall({ region: "europe-west2" }, async (request) => {
  await requireCreator(request);
  const requestedStatus = String(request.data?.status || "pending").trim();
  const snapshot = await db.collection("keeperServiceSubmissions").limit(300).get();
  const submissions = snapshot.docs
    .map(creatorSubmission)
    .filter((item) => requestedStatus === "all" || item.status === requestedStatus)
    .sort((a, b) => Number(a.submittedAt || 0) - Number(b.submittedAt || 0));
  return { success: true, submissions };
});

exports.reviewKeeperServiceSubmission = onCall({ region: "europe-west2" }, async (request) => {
  const creatorUid = await requireCreator(request);
  const submissionId = textValue(request.data?.submissionId, "submissionId", 120, true);
  const action = String(request.data?.action || "").trim();
  if (action !== "approve" && action !== "reject") throw new HttpsError("invalid-argument", "Review action must be approve or reject.");
  const reviewNote = multilineValue(request.data?.reviewNote, "reviewNote", 1000);
  const submissionRef = db.collection("keeperServiceSubmissions").doc(submissionId);
  const serviceRef = db.collection("keeperServices").doc(submissionId);
  const auditRef = db.collection("keeperServiceAudit").doc();
  const snapshot = await submissionRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Service suggestion not found.");
  const current = snapshot.data() || {};
  if (current.status !== "pending") throw new HttpsError("failed-precondition", "This service suggestion has already been reviewed.");

  const batch = db.batch();
  if (action === "approve") {
    batch.set(serviceRef, {
      status: "approved",
      name: String(current.name || ""),
      category: String(current.category || "other"),
      city: String(current.city || ""),
      region: String(current.region || ""),
      country: String(current.country || ""),
      countryCode: String(current.countryCode || ""),
      postcode: String(current.postcode || ""),
      latitude: current.latitude ?? null,
      longitude: current.longitude ?? null,
      website: String(current.website || ""),
      publicEmail: String(current.publicEmail || ""),
      publicPhone: String(current.publicPhone || ""),
      openingHours: String(current.openingHours || ""),
      description: String(current.description || ""),
      animalGroups: Array.isArray(current.animalGroups) ? current.animalGroups : [],
      features: Array.isArray(current.features) ? current.features : [],
      professionalRegistration: String(current.professionalRegistration || ""),
      reviewType: "creator-reviewed-listing",
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedByUid: creatorUid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  batch.set(submissionRef, {
    status: action === "approve" ? "approved" : "rejected",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedByUid: creatorUid,
    reviewNote,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  batch.set(auditRef, {
    action: `keeper_service_${action}`,
    submissionId,
    serviceId: action === "approve" ? submissionId : null,
    creatorUid,
    submittedByUid: String(current.submittedByUid || ""),
    reviewNote,
    createdAt: FieldValue.serverTimestamp(),
  });
  const submitterUid = String(current.submittedByUid || "");
  if (submitterUid) {
    const eventRef = db.collection("users").doc(submitterUid).collection("notificationEvents").doc(`keeper-service-review-${submissionId}`);
    batch.set(eventRef, {
      type: "keeper-service-review",
      title: action === "approve" ? "Service suggestion published" : "Service suggestion reviewed",
      body: action === "approve" ? `${String(current.name || "Your service suggestion")} is now listed in Tiny Titans Services.` : `${String(current.name || "Your service suggestion")} was reviewed but was not published.`,
      url: "/services",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  return { success: true, submissionId, status: action === "approve" ? "approved" : "rejected" };
});
