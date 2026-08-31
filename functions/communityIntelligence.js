const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();
const MIN_CONTRIBUTORS = 5;
const PUBLIC_CACHE_TTL_MS = 60_000;
let publicContributionCache = null;
let publicContributionCacheAt = 0;

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampMillis(value) {
  if (!value) return null;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function kg(value, unit) {
  if (unit === "kg") return value;
  if (unit === "g") return value / 1000;
  return null;
}

async function assertCreator(uid) {
  const user = await auth.getUser(uid);
  const claims = user.customClaims || {};
  if (claims.admin === true || claims.creator === true) return;
  const profile = (await db.collection("users").doc(uid).get()).data() || {};
  if (profile.role === "admin" || profile.profileType === "creator") return;
  throw new HttpsError("permission-denied", "Creator authorization is required.");
}

/**
 * Returns aggregate community intelligence only. No UID, snake name, notes,
 * dates, photos, coordinates or individual records leave the server.
 */
exports.getCommunityIntelligenceSnapshot = onCall({ region: "europe-west2", memory: "512MiB", timeoutSeconds: 120 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await assertCreator(request.auth.uid);

  const users = await db.collection("users").get();
  let contributors = 0;
  let snakes = 0;
  let weightLogs = 0;
  let validWeights = 0;
  let totalKg = 0;
  let feedingLogs = 0;
  let shedLogs = 0;
  let validSheds = 0;
  let totalShedLengthCm = 0;
  const morphCounts = new Map();
  const speciesCounts = new Map();

  for (const userDoc of users.docs) {
    const privacy = (await userDoc.ref.collection("settings").doc("privacy").get()).data() || {};
    if (privacy.communityHusbandryData !== true) continue;

    const snakeSnapshot = await userDoc.ref.collection("snakes").get();
    if (snakeSnapshot.empty) continue;
    contributors += 1;
    snakes += snakeSnapshot.size;

    for (const snakeDoc of snakeSnapshot.docs) {
      const snake = snakeDoc.data() || {};
      const species = typeof snake.species === "string" ? snake.species.trim() : "";
      if (species) speciesCounts.set(species, (speciesCounts.get(species) || 0) + 1);

      const morphs = Array.isArray(snake.morphs) ? snake.morphs : [];
      for (const morph of morphs) {
        if (typeof morph !== "string" || !morph.trim()) continue;
        const key = morph.trim();
        morphCounts.set(key, (morphCounts.get(key) || 0) + 1);
      }

      const weights = await snakeDoc.ref.collection("weights").get();
      for (const weightDoc of weights.docs) {
        const item = weightDoc.data() || {};
        if (item.deletedAt) continue;
        weightLogs += 1;
        const value = number(item.weight);
        const converted = value === null ? null : kg(value, item.unit);
        if (converted !== null && converted > 0 && converted < 10) {
          validWeights += 1;
          totalKg += converted;
        }
      }

      const feedings = await snakeDoc.ref.collection("feedings").get();
      feedingLogs += feedings.docs.filter((doc) => !doc.data()?.deletedAt).length;

      const sheds = await snakeDoc.ref.collection("sheds").get();
      for (const shedDoc of sheds.docs) {
        const shed = shedDoc.data() || {};
        if (shed.deletedAt) continue;
        shedLogs += 1;
        const length = number(shed.shedLength ?? shed.lengthCm);
        if (length !== null && length > 0 && length < 500) {
          validSheds += 1;
          totalShedLengthCm += length;
        }
      }
    }
  }

  // Small cohorts are deliberately withheld to reduce re-identification risk.
  if (contributors < MIN_CONTRIBUTORS) {
    return {
      available: false,
      reason: "insufficient-cohort-size",
      minimumContributors: MIN_CONTRIBUTORS,
      contributors: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const sorted = (map) => Array.from(map.entries())
    .filter(([, count]) => count >= MIN_CONTRIBUTORS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([label, count]) => ({ label, count }));

  return {
    available: true,
    minimumContributors: MIN_CONTRIBUTORS,
    contributors,
    snakes,
    weightLogs,
    validWeights,
    averageWeightKg: validWeights ? totalKg / validWeights : null,
    feedingLogs,
    shedLogs,
    validSheds,
    averageShedLengthCm: validSheds ? totalShedLengthCm / validSheds : null,
    species: sorted(speciesCounts),
    morphs: sorted(morphCounts),
    generatedAt: new Date().toISOString(),
  };
});

async function calculatePublicContributionSnapshot() {
  const users = await db.collection("users").get();
  let contributors = 0;
  let snakes = 0;
  let weightLogs = 0;
  let feedingLogs = 0;
  let shedLogs = 0;

  for (const userDoc of users.docs) {
    const privacy = (await userDoc.ref.collection("settings").doc("privacy").get()).data() || {};
    if (privacy.communityHusbandryData !== true) continue;

    const snakeSnapshot = await userDoc.ref.collection("snakes").get();
    if (snakeSnapshot.empty) continue;
    contributors += 1;
    snakes += snakeSnapshot.size;

    await Promise.all(snakeSnapshot.docs.map(async (snakeDoc) => {
      const [weights, feedings, sheds] = await Promise.all([
        snakeDoc.ref.collection("weights").get(),
        snakeDoc.ref.collection("feedings").get(),
        snakeDoc.ref.collection("sheds").get(),
      ]);
      weightLogs += weights.docs.filter((doc) => !doc.data()?.deletedAt).length;
      feedingLogs += feedings.docs.filter((doc) => !doc.data()?.deletedAt).length;
      shedLogs += sheds.docs.filter((doc) => !doc.data()?.deletedAt).length;
    }));
  }

  const generatedAt = new Date().toISOString();
  if (contributors < MIN_CONTRIBUTORS) {
    return { available: false, minimumContributors: MIN_CONTRIBUTORS, contributors: 0, generatedAt };
  }

  return {
    available: true,
    minimumContributors: MIN_CONTRIBUTORS,
    contributors,
    snakes,
    weightLogs,
    feedingLogs,
    shedLogs,
    totalRecords: weightLogs + feedingLogs + shedLogs,
    generatedAt,
  };
}

/**
 * Signed-in users may see aggregate community contribution volume only.
 * No individual account, snake, location or record-level information is returned.
 * Detailed statistics remain protected by the minimum cohort threshold.
 */
exports.getPublicCommunityContributionSnapshot = onCall({ region: "europe-west2", memory: "256MiB", timeoutSeconds: 60 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const now = Date.now();
  if (publicContributionCache && now - publicContributionCacheAt < PUBLIC_CACHE_TTL_MS) return publicContributionCache;

  try {
    const snapshot = await calculatePublicContributionSnapshot();
    publicContributionCache = snapshot;
    publicContributionCacheAt = Date.now();
    return snapshot;
  } catch (error) {
    console.error("Public contribution snapshot failed", error);
    throw new HttpsError("internal", "Unable to load the community contribution tracker.");
  }
});
