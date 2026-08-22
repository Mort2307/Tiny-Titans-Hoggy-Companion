const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();
const MIN_CONTRIBUTORS = 5;
const MIN_RECORDS = 5;

function percentile(values, p) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function confidence(sampleSize, contributorCount) {
  if (sampleSize < MIN_RECORDS || contributorCount < MIN_CONTRIBUTORS) return "insufficient";
  if (sampleSize >= 50 && contributorCount >= 20) return "strong";
  if (sampleSize >= 20 && contributorCount >= 10) return "developing";
  return "limited";
}

function metric(metric, label, values, contributorCount, unit) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  const level = confidence(clean.length, contributorCount);
  return {
    metric,
    label,
    sampleSize: clean.length,
    contributorCount,
    ...(clean.length ? {
      median: percentile(clean, 0.5),
      lowerQuartile: percentile(clean, 0.25),
      upperQuartile: percentile(clean, 0.75),
    } : {}),
    unit,
    confidence: level,
    explanation: level === "insufficient"
      ? "There is not enough anonymised community data to produce a responsible benchmark yet."
      : level === "strong"
        ? "This benchmark has a strong contributor and record base."
        : level === "developing"
          ? "This benchmark is developing and should be treated as a useful indication, not a clinical or scientific threshold."
          : "This benchmark has limited coverage and should be treated cautiously.",
  };
}

function ageBandFromHatchDate(hatchDate) {
  if (typeof hatchDate !== "string") return "unknown";
  const parsed = Date.parse(hatchDate);
  if (!Number.isFinite(parsed)) return "unknown";
  const years = (Date.now() - parsed) / 31557600000;
  if (years < 0) return "unknown";
  if (years < 0.5) return "juvenile-early";
  if (years < 1) return "juvenile-late";
  if (years < 2) return "subadult";
  if (years < 5) return "adult";
  return "mature";
}

function normalise(value) { return String(value || "").trim().toLowerCase(); }

exports.getCommunityBenchmarks = onCall({ region: "europe-west2", memory: "512MiB", timeoutSeconds: 120 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");

  const caller = await db.collection("users").doc(request.auth.uid).get();
  const callerData = caller.data() || {};
  const claims = request.auth.token || {};
  const creator = claims.admin === true || claims.creator === true || callerData.role === "admin" || callerData.profileType === "creator";
  if (!creator) throw new HttpsError("permission-denied", "Creator authorization is required.");

  const input = request.data || {};
  const speciesFilter = normalise(input.species);
  const sexFilter = normalise(input.sex);
  const morphFilter = normalise(input.morph);
  const ageBandFilter = normalise(input.ageBand);

  const users = await db.collection("users").get();
  const weightValues = [];
  const feedingIntervals = [];
  const shedIntervals = [];
  const contributorIds = new Set();
  const snakeIds = new Set();

  for (const userDoc of users.docs) {
    const privacy = await userDoc.ref.collection("settings").doc("privacy").get();
    if (!privacy.exists || privacy.data()?.communityHusbandryData !== true) continue;

    const snakes = await userDoc.ref.collection("snakes").get();
    let userContributed = false;
    for (const snakeDoc of snakes.docs) {
      const snake = snakeDoc.data();
      if (snake.deleted === true || snake.status === "Deleted") continue;
      if (speciesFilter && normalise(snake.species) !== speciesFilter) continue;
      if (sexFilter && normalise(snake.sex) !== sexFilter) continue;
      if (morphFilter && !Array.isArray(snake.morphs) && normalise(snake.morph) !== morphFilter) continue;
      if (morphFilter && Array.isArray(snake.morphs) && !snake.morphs.some((m) => normalise(m) === morphFilter)) continue;
      if (ageBandFilter && ageBandFromHatchDate(snake.hatchDate) !== ageBandFilter) continue;

      const weights = Array.isArray(snake.weightHistory) ? snake.weightHistory : [];
      const validWeights = weights.map((entry) => Number(entry?.weight ?? entry?.grams)).filter((value) => Number.isFinite(value) && value > 0 && value < 10000);
      if (validWeights.length) {
        weightValues.push(...validWeights);
        userContributed = true;
      }

      const feedings = Array.isArray(snake.feedingHistory) ? snake.feedingHistory : [];
      const feedingDates = feedings.map((entry) => Date.parse(String(entry?.date || ""))).filter(Number.isFinite).sort((a, b) => a - b);
      for (let i = 1; i < feedingDates.length; i += 1) {
        const days = (feedingDates[i] - feedingDates[i - 1]) / 86400000;
        if (days > 0 && days <= 120) feedingIntervals.push(days);
      }
      if (feedingDates.length) userContributed = true;

      const sheds = Array.isArray(snake.shedHistory) ? snake.shedHistory : [];
      const shedDates = sheds.map((entry) => Date.parse(String(entry?.date || entry?.shedDate || ""))).filter(Number.isFinite).sort((a, b) => a - b);
      for (let i = 1; i < shedDates.length; i += 1) {
        const days = (shedDates[i] - shedDates[i - 1]) / 86400000;
        if (days > 0 && days <= 180) shedIntervals.push(days);
      }
      if (shedDates.length) userContributed = true;

      if (validWeights.length || feedingDates.length || shedDates.length) snakeIds.add(snakeDoc.id);
      if (validWeights.length || feedingDates.length || shedDates.length) userContributed = true;
    }
    if (userContributed) contributorIds.add(userDoc.id);
  }

  const contributorCount = contributorIds.size;
  if (contributorCount < MIN_CONTRIBUTORS) {
    return {
      generatedAt: new Date().toISOString(),
      contributorCount,
      snakeCount: snakeIds.size,
      cohortKey: [speciesFilter || "all", sexFilter || "all", morphFilter || "all", ageBandFilter || "all"].join("|"),
      metrics: [
        metric("weight", "Recorded weight", weightValues, contributorCount, "g"),
        metric("feedingInterval", "Feeding interval", feedingIntervals, contributorCount, "days"),
        metric("shedInterval", "Shed interval", shedIntervals, contributorCount, "days"),
      ],
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    contributorCount,
    snakeCount: snakeIds.size,
    cohortKey: [speciesFilter || "all", sexFilter || "all", morphFilter || "all", ageBandFilter || "all"].join("|"),
    metrics: [
      metric("weight", "Recorded weight", weightValues, contributorCount, "g"),
      metric("feedingInterval", "Feeding interval", feedingIntervals, contributorCount, "days"),
      metric("shedInterval", "Shed interval", shedIntervals, contributorCount, "days"),
    ],
  };
});
