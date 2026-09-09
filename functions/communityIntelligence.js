const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const db = getFirestore();
const auth = getAuth();
const MIN_CONTRIBUTORS = 5;
const MAX_VALUES_PER_KEEPER = 200;

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

function hasCommunityConsent(privacy) {
  return privacy.communityContribution === true || privacy.communityHusbandryData === true;
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
 * Returns aggregate community intelligence only. Individual keeper records never
 * leave the server. Every consenting keeper with at least one snake is eligible;
 * snake count never acts as an intelligence gate.
 */
exports.getCommunityIntelligenceSnapshot = onCall({ region: "europe-west2", memory: "512MiB", timeoutSeconds: 120 }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await assertCreator(request.auth.uid);

  const users = await db.collection("users").get();
  let eligibleKeepers = 0;
  let contributingKeepers = 0;
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
    if (!hasCommunityConsent(privacy)) continue;

    const snakeSnapshot = await userDoc.ref.collection("snakes").get();
    if (snakeSnapshot.empty) continue;
    eligibleKeepers += 1;

    let keeperHasData = false;
    let keeperWeightValues = 0;
    let keeperFeedingValues = 0;
    let keeperShedValues = 0;

    for (const snakeDoc of snakeSnapshot.docs) {
      const snake = snakeDoc.data() || {};
      if (snake.deleted === true || snake.status === "Deleted") continue;
      snakes += 1;

      const species = typeof snake.species === "string" ? snake.species.trim() : "";
      if (species) speciesCounts.set(species, (speciesCounts.get(species) || 0) + 1);

      const morphs = Array.isArray(snake.morphs) ? snake.morphs : [];
      for (const morph of morphs) {
        if (typeof morph !== "string" || !morph.trim()) continue;
        const key = morph.trim();
        morphCounts.set(key, (morphCounts.get(key) || 0) + 1);
      }

      const [weights, feedings, sheds] = await Promise.all([
        snakeDoc.ref.collection("weights").get(),
        snakeDoc.ref.collection("feedings").get(),
        snakeDoc.ref.collection("sheds").get(),
      ]);

      for (const weightDoc of weights.docs) {
        const item = weightDoc.data() || {};
        if (item.deletedAt) continue;
        weightLogs += 1;
        if (keeperWeightValues >= MAX_VALUES_PER_KEEPER) continue;
        const value = number(item.weight);
        const converted = value === null ? null : kg(value, item.unit);
        if (converted !== null && converted > 0 && converted < 10) {
          validWeights += 1;
          totalKg += converted;
          keeperWeightValues += 1;
          keeperHasData = true;
        }
      }

      for (const feedingDoc of feedings.docs) {
        if (feedingDoc.data()?.deletedAt) continue;
        feedingLogs += 1;
        if (keeperFeedingValues < MAX_VALUES_PER_KEEPER) {
          keeperFeedingValues += 1;
          keeperHasData = true;
        }
      }

      for (const shedDoc of sheds.docs) {
        const shed = shedDoc.data() || {};
        if (shed.deletedAt) continue;
        shedLogs += 1;
        if (keeperShedValues >= MAX_VALUES_PER_KEEPER) continue;
        const length = number(shed.shedLength ?? shed.lengthCm);
        if (length !== null && length > 0 && length < 500) {
          validSheds += 1;
          totalShedLengthCm += length;
          keeperShedValues += 1;
          keeperHasData = true;
        }
      }
    }

    if (keeperHasData) contributingKeepers += 1;
  }

  const publishable = contributingKeepers >= MIN_CONTRIBUTORS;
  const sorted = (map) => Array.from(map.entries())
    .filter(([, count]) => count >= MIN_CONTRIBUTORS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([label, count]) => ({ label, count }));

  return {
    available: true,
    publishable,
    reason: publishable ? null : "insufficient-independent-contributor-count-for-public-aggregate",
    minimumContributors: MIN_CONTRIBUTORS,
    eligibleKeepers,
    contributingKeepers,
    contributors: contributingKeepers,
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
