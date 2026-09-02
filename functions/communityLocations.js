const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

function isValidCoordinate(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function normalise(value) {
  return String(value || "").trim().toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
}

function cleanLocation(location) {
  if (!location || typeof location !== "object") return null;
  const city = String(location.city || "").trim();
  const country = String(location.country || "").trim();
  if (!city || !country) return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (isValidCoordinate(latitude, -90, 90) && isValidCoordinate(longitude, -180, 180) && !(latitude === 0 && longitude === 0)) {
    return {
      city,
      country,
      countryCode: typeof location.countryCode === "string" ? location.countryCode.toUpperCase() : undefined,
      areaId: typeof location.areaId === "string" && location.areaId.trim() ? location.areaId.trim() : `geo-${normalise(city)}-${normalise(country)}`,
      latitude: Number(latitude.toFixed(2)),
      longitude: Number(longitude.toFixed(2)),
      precision: "city",
    };
  }
  return null;
}

async function geocode(city, country) {
  if (!city || !country) return null;
  const params = new URLSearchParams({ name: `${city}, ${country}`, count: "10", language: "en", format: "json" });
  const response = await fetch(`${GEO_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`);
  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];
  const cityKey = normalise(city);
  const countryKey = normalise(country);
  const exact = results.find((result) => normalise(result.name) === cityKey && normalise(result.country) === countryKey);
  const sameCountry = results.find((result) => normalise(result.country) === countryKey);
  const match = exact || sameCountry || results[0];
  if (!match || !isValidCoordinate(match.latitude, -90, 90) || !isValidCoordinate(match.longitude, -180, 180)) return null;
  return {
    city,
    country,
    countryCode: typeof match.country_code === "string" ? match.country_code.toUpperCase() : undefined,
    areaId: `geo-${match.id}`,
    latitude: Number(Number(match.latitude).toFixed(2)),
    longitude: Number(Number(match.longitude).toFixed(2)),
    precision: "city",
  };
}

async function resolveMembership(uid) {
  const userRef = db.collection("users").doc(uid);
  const [userSnapshot, privacySnapshot] = await Promise.all([
    userRef.get(),
    userRef.collection("settings").doc("privacy").get(),
  ]);
  if (!userSnapshot.exists) return null;
  const data = userSnapshot.data() || {};
  const privacy = privacySnapshot.exists ? (privacySnapshot.data() || {}) : {};
  const legacy = data.dataCollectionPreferences || {};
  const locationConsent = privacySnapshot.exists ? privacy.communityLocation === true : legacy.approximateLocation === true;
  if (!locationConsent) return null;
  const rawLocation = data.approximateLocation;
  if (!rawLocation || typeof rawLocation !== "object") return null;
  return cleanLocation(rawLocation) || await geocode(String(rawLocation.city || ""), String(rawLocation.country || ""));
}

async function updateMembership(uid) {
  const membershipRef = db.collection("communityLocationMemberships").doc(uid);
  const membershipSnapshot = await membershipRef.get();
  const previous = membershipSnapshot.exists ? membershipSnapshot.data() : null;
  const next = await resolveMembership(uid);

  await db.runTransaction(async (transaction) => {
    const currentMembership = await transaction.get(membershipRef);
    const oldAreaId = currentMembership.exists ? String(currentMembership.data()?.areaId || "") : String(previous?.areaId || "");
    const oldAreaRef = oldAreaId ? db.collection("communityLocationAreas").doc(oldAreaId) : null;
    const nextAreaRef = next ? db.collection("communityLocationAreas").doc(next.areaId) : null;
    const oldAreaSnapshot = oldAreaRef ? await transaction.get(oldAreaRef) : null;
    const nextAreaSnapshot = nextAreaRef && next.areaId !== oldAreaId ? await transaction.get(nextAreaRef) : oldAreaSnapshot;

    if (oldAreaRef && oldAreaId !== next?.areaId) {
      const oldData = oldAreaSnapshot?.exists ? oldAreaSnapshot.data() : null;
      const oldCount = Number(oldData?.memberCount || 0);
      if (oldCount <= 1) transaction.delete(oldAreaRef);
      else transaction.update(oldAreaRef, { memberCount: oldCount - 1, updatedAt: FieldValue.serverTimestamp() });
    }

    if (!next || !nextAreaRef) {
      if (currentMembership.exists) transaction.delete(membershipRef);
      return;
    }

    const existing = nextAreaSnapshot?.exists ? nextAreaSnapshot.data() : null;
    const baseCount = Number(existing?.memberCount || 0);
    const sameArea = oldAreaId === next.areaId;
    transaction.set(nextAreaRef, {
      areaId: next.areaId,
      city: next.city,
      country: next.country,
      ...(next.countryCode ? { countryCode: next.countryCode } : {}),
      latitude: next.latitude,
      longitude: next.longitude,
      precision: "city",
      memberCount: sameArea ? Math.max(1, baseCount) : baseCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(membershipRef, { areaId: next.areaId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return next;
}

function toPublicArea(snapshot) {
  const data = snapshot.data() || {};
  const memberCount = Number(data.memberCount || 0);
  if (!snapshot.exists || !data.city || !data.country || !Number.isFinite(memberCount) || memberCount <= 0 || !isValidCoordinate(data.latitude, -90, 90) || !isValidCoordinate(data.longitude, -180, 180)) return null;
  return {
    areaId: String(data.areaId || snapshot.id),
    city: String(data.city),
    country: String(data.country),
    ...(data.countryCode ? { countryCode: String(data.countryCode) } : {}),
    latitude: Number(Number(data.latitude).toFixed(2)),
    longitude: Number(Number(data.longitude).toFixed(2)),
    memberCount: Math.floor(memberCount),
  };
}

exports.getCommunityLocationAreas = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  try {
    // Home receives aggregate areas only: never user documents, UIDs, names or keeper records.
    const snapshot = await db.collection("communityLocationAreas").get();
    return { success: true, areas: snapshot.docs.map(toPublicArea).filter(Boolean) };
  } catch (error) {
    console.error("Community location area read failed", error);
    throw new HttpsError("internal", "Unable to load the Tiny Titans community globe.");
  }
});

exports.syncCommunityLocationMembership = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  try {
    const location = await updateMembership(request.auth.uid);
    return { success: true, represented: Boolean(location), areaId: location?.areaId || null };
  } catch (error) {
    console.error("Community location membership sync failed", { uid: request.auth.uid, error });
    throw new HttpsError("internal", "Unable to synchronise community location.");
  }
});

exports.syncCommunityLocationOnUserWrite = onDocumentWritten({ region: "europe-west2", document: "users/{userId}" }, async (event) => {
  const uid = String(event.params.userId || "").trim();
  if (!uid) return;
  try { await updateMembership(uid); } catch (error) { console.error("Community location user-write sync failed", { uid, error }); }
});

exports.syncCommunityLocationOnPrivacyWrite = onDocumentWritten({ region: "europe-west2", document: "users/{userId}/settings/privacy" }, async (event) => {
  const uid = String(event.params.userId || "").trim();
  if (!uid) return;
  try { await updateMembership(uid); } catch (error) { console.error("Community location privacy-write sync failed", { uid, error }); }
});
