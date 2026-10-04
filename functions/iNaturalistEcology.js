const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_LOOKUP_GAP_MS = 3000;
const API_BASE = "https://api.inaturalist.org/v1";
const USER_AGENT = "TinyTitans-Keeper-Companion/1.0 ecology-context";

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
}
function scientificName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 180) throw new HttpsError("invalid-argument", "A valid scientific name is required.");
  if (!/^[\p{L}\p{M} .()'’×-]+$/u.test(name)) throw new HttpsError("invalid-argument", "Scientific name contains unsupported characters.");
  return name;
}
function cacheId(name) {
  return "inat_" + crypto.createHash("sha256").update(name.toLowerCase()).digest("hex").slice(0, 40);
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function claimLookupWindow() {
  const ref = db.collection("externalApiRateLimits").doc("inaturalist");
  const nowMs = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const nextAllowedAtMs = Number(snapshot.data()?.nextAllowedAtMs || 0);
    if (nowMs < nextAllowedAtMs) return false;
    transaction.set(ref, { nextAllowedAtMs: nowMs + MIN_LOOKUP_GAP_MS, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}
async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("iNaturalist returned HTTP " + response.status);
  return response.json();
}
function publicCache(data, stale = false) {
  return {
    scientificName: String(data.scientificName || ""),
    taxonId: Number(data.taxonId || 0) || null,
    matchedName: String(data.matchedName || ""),
    commonName: String(data.commonName || ""),
    rank: String(data.rank || ""),
    iconicTaxon: String(data.iconicTaxon || ""),
    totalResearchGradeObservations: Number(data.totalResearchGradeObservations || 0),
    recentObservations: Array.isArray(data.recentObservations) ? data.recentObservations.slice(0, 12) : [],
    sourceUrl: String(data.sourceUrl || ""),
    fetchedAtMs: Number(data.fetchedAtMs || 0),
    stale,
    boundary: "Wild observation context only. It is not a captive husbandry recommendation.",
  };
}

exports.getINaturalistEcologyContext = onCall({ region: "europe-west2", timeoutSeconds: 20 }, async (request) => {
  requireAuth(request);
  const name = scientificName(request.data?.scientificName);
  const ref = db.collection("externalEcologyCache").doc(cacheId(name));
  const cachedSnapshot = await ref.get();
  const cached = cachedSnapshot.data() || {};
  const nowMs = Date.now();
  if (cachedSnapshot.exists && nowMs - Number(cached.fetchedAtMs || 0) < CACHE_TTL_MS) return publicCache(cached);

  const claimed = await claimLookupWindow();
  if (!claimed) {
    if (cachedSnapshot.exists) return publicCache(cached, true);
    throw new HttpsError("resource-exhausted", "Wild observation data is being refreshed. Try again in a few seconds.");
  }

  try {
    const taxaUrl = API_BASE + "/taxa?q=" + encodeURIComponent(name) + "&is_active=true&per_page=10";
    const taxa = await fetchJson(taxaUrl);
    const results = Array.isArray(taxa?.results) ? taxa.results : [];
    const exact = results.find((item) => String(item?.name || "").toLowerCase() === name.toLowerCase());
    const taxon = exact || results[0];
    if (!taxon?.id) throw new HttpsError("not-found", "iNaturalist does not currently have a matching active taxon.");

    await wait(1100);
    const observationsUrl = API_BASE + "/observations?taxon_id=" + encodeURIComponent(String(taxon.id)) + "&quality_grade=research&per_page=12&order_by=observed_on&order=desc";
    const observations = await fetchJson(observationsUrl);
    const recent = (Array.isArray(observations?.results) ? observations.results : []).map((item) => ({
      id: Number(item?.id || 0),
      observedOn: String(item?.observed_on || ""),
      placeGuess: String(item?.place_guess || "").slice(0, 180),
      qualityGrade: String(item?.quality_grade || ""),
      uri: String(item?.uri || ("https://www.inaturalist.org/observations/" + item?.id)),
    })).filter((item) => item.id && item.uri.startsWith("https://")).slice(0, 12);

    const record = {
      scientificName: name,
      taxonId: Number(taxon.id),
      matchedName: String(taxon.name || name),
      commonName: String(taxon.preferred_common_name || ""),
      rank: String(taxon.rank || ""),
      iconicTaxon: String(taxon.iconic_taxon_name || ""),
      totalResearchGradeObservations: Number(observations?.total_results || 0),
      recentObservations: recent,
      sourceUrl: "https://www.inaturalist.org/taxa/" + taxon.id,
      fetchedAt: FieldValue.serverTimestamp(),
      fetchedAtMs: nowMs,
      source: "iNaturalist",
      cacheTtlHours: 24,
    };
    await ref.set(record);
    return publicCache(record);
  } catch (error) {
    console.warn("Tiny Titans iNaturalist ecology lookup failed", { name, error: String(error?.message || error) });
    if (cachedSnapshot.exists) return publicCache(cached, true);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unavailable", "Wild observation context is temporarily unavailable.");
  }
});
