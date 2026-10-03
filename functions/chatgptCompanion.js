const crypto = require("node:crypto");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const COMPANION_TIERS = new Set(["titan_pro", "business_starter", "business_plus", "business_advanced", "rescue"]);
const CONNECTION_TTL_DAYS = 90;
const TOKEN_PREFIX = "ttgpt_";
const DEFAULT_PERMISSIONS = Object.freeze([
  "read_animals",
  "read_records",
  "write_records",
  "undo_own_actions",
]);
const WRITE_TOOLS = new Set([
  "log_feeding",
  "log_weight",
  "log_shed",
  "log_behaviour",
  "log_health_observation",
  "undo_last_action",
]);

const FOOD_TYPES = new Set([
  "Pinkie Mouse", "Fuzzy Mouse", "Hopper Mouse", "Adult Mouse",
  "Rat Pup", "Rat Fuzzy", "Adult Rat", "Rabbit", "Piglet", "Quail",
  "Other Bird", "Fish", "Amphibian", "Egg", "Reptile Prey",
  "Invertebrate", "Other",
]);
const FEEDING_METHODS = new Set(["Tongs", "Drop Feed", "Hand Fed", "Scented", "Other"]);
const FEEDING_RESPONSES = new Set(["Accepted", "Refused", "Partial", "Regurgitated"]);
const PREY_CATEGORIES = new Set(["rodent", "lagomorph", "bird", "fish", "amphibian", "egg", "reptile", "invertebrate", "other"]);
const SHED_STATUS = new Set(["Complete", "Partial", "Problematic"]);
const SHED_QUALITY = new Set(["Perfect", "Good", "Partial", "Difficult", "Unknown"]);
const SHED_ASSISTANCE = new Set(["None", "Monitoring Only", "Humidity Adjustment", "Keeper Intervention", "Veterinary Assistance"]);
const BEHAVIOUR_OBSERVATIONS = new Set(["Exploring", "Burrowing", "Hiding", "Defensive display", "Huffing", "Hooding", "Bluff strike", "Musk", "Thanatosis", "Handling response", "Other"]);
const BEHAVIOUR_CONTEXTS = new Set(["Routine observation", "Handling", "After feeding", "Pre-shed", "Enclosure change", "Other"]);
const HEALTH_EVENT_TYPES = new Set(["Routine Check", "Vet Visit", "Medication", "Illness", "Injury", "Observation", "Other"]);
const HEALTH_STATUSES = new Set(["Normal", "Monitoring", "Treatment", "Recovered"]);

const TOOL_CATALOG = [
  { name: "list_animals", mode: "read", description: "List animals visible to the connected Tiny Titans account." },
  { name: "resolve_animal", mode: "read", description: "Resolve an animal name or nickname to Tiny Titans record IDs." },
  { name: "get_animal_summary", mode: "read", description: "Get an animal profile and recent keeper-record summary." },
  { name: "get_feeding_history", mode: "read", description: "Read feeding history for a snake." },
  { name: "get_weight_history", mode: "read", description: "Read weight history for a snake." },
  { name: "get_shed_history", mode: "read", description: "Read shed history for a snake." },
  { name: "get_recent_activity", mode: "read", description: "Read recent feeding, weight, shed, behaviour and health activity." },
  { name: "log_feeding", mode: "write", description: "Create a structured feeding record." },
  { name: "log_weight", mode: "write", description: "Create a weight record and synchronise the current animal weight." },
  { name: "log_shed", mode: "write", description: "Create a structured shed record." },
  { name: "log_behaviour", mode: "write", description: "Create a keeper behaviour observation." },
  { name: "log_health_observation", mode: "write", description: "Create a health observation or veterinary record." },
  { name: "undo_last_action", mode: "write", description: "Undo the most recent reversible record created through ChatGPT Companion." },
];

function nowIso() {
  return new Date().toISOString();
}

function normaliseString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseName(value) {
  return normaliseString(value).toLowerCase().replace(/\s+/g, " ");
}

function expiryMillis(value) {
  if (!value) return null;
  if (typeof value === "object" && typeof value.toMillis === "function") return value.toMillis();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function activeFuture(value) {
  const millis = expiryMillis(value);
  return millis !== null && millis > Date.now();
}

function isOwnerData(data) {
  return String(data?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

async function resolveEffectiveTier(uid) {
  const [userSnapshot, entitlementSnapshot, overrideSnapshot, trialSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("paidEntitlements").doc(uid).get(),
    db.collection("paidTesterOverrides").doc(uid).get(),
    db.collection("paidTrials").doc(uid).get(),
  ]);

  const user = userSnapshot.exists ? userSnapshot.data() || {} : {};
  if (isOwnerData(user)) return { tier: "business_advanced", source: "owner", user };

  const override = overrideSnapshot.exists ? overrideSnapshot.data() || {} : {};
  if (
    override.enabled === true &&
    COMPANION_TIERS.has(String(override.tier || "")) &&
    (!override.expiresAt || activeFuture(override.expiresAt))
  ) {
    return { tier: String(override.tier), source: "tester", user };
  }

  const entitlement = entitlementSnapshot.exists ? entitlementSnapshot.data() || {} : {};
  const entitlementTier = String(entitlement.tier || user.subscriptionTier || "free");
  const status = String(entitlement.status || user.subscriptionStatus || "free");
  if (COMPANION_TIERS.has(entitlementTier) && ["active", "trialing"].includes(status)) {
    return { tier: entitlementTier, source: "subscription", user };
  }

  const trial = trialSnapshot.exists ? trialSnapshot.data() || {} : {};
  if (
    trial.enabled === true &&
    COMPANION_TIERS.has(String(trial.tier || "")) &&
    activeFuture(trial.expiresAt)
  ) {
    return { tier: String(trial.tier), source: "trial", user };
  }

  return { tier: "free", source: "free", user };
}

async function requireCompanionAccess(uid) {
  const access = await resolveEffectiveTier(uid);
  if (!COMPANION_TIERS.has(access.tier)) {
    throw new HttpsError("permission-denied", "ChatGPT Companion requires Titan Pro or an eligible Business/Rescue tier.");
  }
  return access;
}

async function resolveAccountContext(uid) {
  const userSnapshot = await db.collection("users").doc(uid).get();
  const user = userSnapshot.exists ? userSnapshot.data() || {} : {};
  const familyId = normaliseString(user.familyId);
  if (!familyId) return { requesterUid: uid, dataOwnerUid: uid, familyId: null, sharedFamily: false };

  const familySnapshot = await db.collection("families").doc(familyId).get();
  if (!familySnapshot.exists) return { requesterUid: uid, dataOwnerUid: uid, familyId: null, sharedFamily: false };
  const family = familySnapshot.data() || {};
  const members = Array.isArray(family.memberUids) ? family.memberUids : [];
  if (!members.includes(uid)) return { requesterUid: uid, dataOwnerUid: uid, familyId: null, sharedFamily: false };

  const ownerUid = normaliseString(family.ownerUid) || uid;
  return { requesterUid: uid, dataOwnerUid: ownerUid, familyId, sharedFamily: ownerUid !== uid };
}

function requireFamilyWriteOwner(context) {
  if (context.sharedFamily) {
    const error = new Error("ChatGPT Companion write actions currently require the Tiny Titans Family Owner account. Shared family members remain read-only in this first release.");
    error.statusCode = 403;
    throw error;
  }
}

function connectionRef(uid) {
  return db.collection("chatgptConnections").doc(uid);
}

function actionsCollection(uid) {
  return connectionRef(uid).collection("actions");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeTimingEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function connectionState(data, access) {
  const expiresAt = expiryMillis(data?.expiresAt);
  const legacyConnected = Boolean(data?.secretHash && data?.revoked !== true && (expiresAt === null || expiresAt > Date.now()));
  const oauthConnected = data?.oauthConnected === true && data?.oauthRevoked !== true;
  const eligible = COMPANION_TIERS.has(access.tier);
  const connected = Boolean(data && eligible && (oauthConnected || legacyConnected));
  const expired = !oauthConnected && expiresAt !== null && expiresAt <= Date.now();
  const revoked = Boolean(data && !connected && (data.revoked === true || data.oauthRevoked === true));
  return {
    available: eligible,
    connected,
    revoked,
    expired,
    connectionMode: oauthConnected ? "oauth" : legacyConnected ? "legacy_token" : null,
    effectiveTier: access.tier,
    source: access.source,
    permissions: Array.isArray(data?.permissions) ? data.permissions : DEFAULT_PERMISSIONS,
    grantedScopes: Array.isArray(data?.oauthScopes) ? data.oauthScopes : [],
    connectedAt: data?.oauthConnectedAt || data?.createdAt || null,
    expiresAt: oauthConnected ? null : data?.expiresAt || null,
    lastUsedAt: data?.lastUsedAt || null,
    lastTool: data?.lastTool || null,
  };
}

exports.getChatGPTCompanionStatus = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const access = await resolveEffectiveTier(request.auth.uid);
  const snapshot = await connectionRef(request.auth.uid).get();
  return {
    success: true,
    ...connectionState(snapshot.exists ? snapshot.data() || {} : null, access),
  };
});

exports.createChatGPTCompanionConnection = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  const access = await requireCompanionAccess(uid);
  const context = await resolveAccountContext(uid);
  if (context.sharedFamily) {
    throw new HttpsError("failed-precondition", "Connect ChatGPT Companion from the Tiny Titans Family Owner account for write-safe shared records.");
  }

  const token = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  const prefix = token.slice(0, 18);
  const expiresAt = Timestamp.fromMillis(Date.now() + CONNECTION_TTL_DAYS * 86400000);
  const permissions = [...DEFAULT_PERMISSIONS];

  await connectionRef(uid).set({
    uid,
    prefix,
    secretHash: tokenHash(token),
    permissions,
    revoked: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt,
    effectiveTierAtCreation: access.tier,
    sourceAtCreation: access.source,
    connectionVersion: 1,
  }, { merge: true });

  return {
    success: true,
    token,
    tokenShownOnce: true,
    expiresAt: expiresAt.toDate().toISOString(),
    permissions,
    apiBase: "https://europe-west2-tinytitans-hoggy-companion.cloudfunctions.net/chatGPTCompanionApi/v1",
  };
});

async function revokeOAuthTokens(uid) {
  for (const collectionName of ["chatgptOAuthAccessTokens", "chatgptOAuthRefreshTokens"]) {
    const snapshot = await db.collection(collectionName).where("uid", "==", uid).where("revoked", "==", false).limit(250).get();
    if (snapshot.empty) continue;
    const batch = db.batch();
    for (const token of snapshot.docs) {
      batch.set(token.ref, {
        revoked: true,
        revokedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
  }
}

exports.revokeChatGPTCompanionConnection = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = request.auth.uid;
  await Promise.all([
    connectionRef(uid).set({
      revoked: true,
      revokedAt: FieldValue.serverTimestamp(),
      oauthConnected: false,
      oauthRevoked: true,
      oauthRevokedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }),
    revokeOAuthTokens(uid),
  ]);
  return { success: true };
});

exports.getChatGPTCompanionActivity = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await requireCompanionAccess(request.auth.uid);
  const snapshot = await actionsCollection(request.auth.uid).orderBy("createdAt", "desc").limit(20).get();
  return {
    success: true,
    actions: snapshot.docs.map((item) => {
      const data = item.data() || {};
      return {
        id: item.id,
        tool: data.tool || null,
        animalId: data.animalId || null,
        animalName: data.animalName || null,
        recordId: data.recordId || null,
        summary: data.summary || null,
        reversible: data.reversible === true && !data.undoneAt,
        createdAt: data.createdAt || null,
        undoneAt: data.undoneAt || null,
      };
    }),
  };
});

function bearerToken(request) {
  const header = String(request.get("authorization") || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function authenticateBearer(request) {
  const token = bearerToken(request);
  if (!token.startsWith(TOKEN_PREFIX) || token.length < 30) return null;
  const prefix = token.slice(0, 18);
  const matches = await db.collection("chatgptConnections").where("prefix", "==", prefix).limit(3).get();

  for (const snapshot of matches.docs) {
    const data = snapshot.data() || {};
    if (data.revoked === true || !safeTimingEqual(data.secretHash, tokenHash(token))) continue;
    if (data.expiresAt && !activeFuture(data.expiresAt)) continue;

    const uid = snapshot.id;
    const access = await resolveEffectiveTier(uid);
    if (!COMPANION_TIERS.has(access.tier)) continue;

    return {
      uid,
      permissions: Array.isArray(data.permissions) ? data.permissions : DEFAULT_PERMISSIONS,
      access,
      context: await resolveAccountContext(uid),
      ref: snapshot.ref,
    };
  }
  return null;
}

function hasPermission(auth, permission) {
  return auth.permissions.includes(permission);
}

function toolPermission(auth, tool) {
  if (WRITE_TOOLS.has(tool)) return hasPermission(auth, tool === "undo_last_action" ? "undo_own_actions" : "write_records");
  return hasPermission(auth, "read_records") || (tool === "list_animals" || tool === "resolve_animal") && hasPermission(auth, "read_animals");
}

function sendJson(response, status, payload) {
  response.status(status).set("Cache-Control", "no-store").json(payload);
}

function fail(statusCode, message, code = "REQUEST_INVALID") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function cleanLimit(value, fallback = 20, max = 100) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return Math.min(number, max);
}

function validateIsoDate(value, field = "date", options = {}) {
  const date = normaliseString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, `${field} must use YYYY-MM-DD.`, "DATE_INVALID");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail(400, `${field} is not a valid date.`, "DATE_INVALID");
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (options.allowFuture !== true && date > tomorrow.toISOString().slice(0, 10)) fail(400, `${field} cannot be in the future.`, "DATE_FUTURE");
  return date;
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function metadata(auth, tool) {
  return {
    source: "chatgpt_companion",
    integration: "Tiny Titans Companion",
    tool,
    requesterUid: auth.uid,
    recordedAt: nowIso(),
  };
}

function idForAction(auth, tool, idempotencyKey) {
  const key = normaliseString(idempotencyKey);
  if (key) return `gpt-${crypto.createHash("sha256").update(`${auth.uid}|${tool}|${key}`).digest("hex").slice(0, 24)}`;
  return `gpt-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;
}

async function listAnimals(auth) {
  const owner = auth.context.dataOwnerUid;
  const [snakes, animals] = await Promise.all([
    db.collection("users").doc(owner).collection("snakes").limit(300).get(),
    db.collection("users").doc(owner).collection("animals").limit(300).get(),
  ]);

  const snakeRows = snakes.docs.map((item) => {
    const data = item.data() || {};
    return {
      id: item.id,
      recordType: "snake",
      name: data.name || "Unnamed animal",
      nickname: data.nickname || null,
      species: data.species || null,
      sex: data.sex || "Unknown",
      status: data.status || "Active",
      currentWeightGrams: typeof data.weight === "number" ? data.weight : null,
      trackingSupported: true,
    };
  });
  const universalRows = animals.docs.map((item) => {
    const data = item.data() || {};
    return {
      id: item.id,
      recordType: "universal_animal",
      name: data.name || "Unnamed animal",
      nickname: null,
      species: data.speciesCommonName || data.scientificName || null,
      sex: data.sex || "unknown",
      status: data.status || "active",
      currentWeightGrams: null,
      trackingSupported: false,
    };
  });

  return [...snakeRows, ...universalRows].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

async function resolveAnimal(auth, args) {
  const query = normaliseName(args.query || args.name);
  if (!query) fail(400, "An animal name or search query is required.", "ANIMAL_QUERY_MISSING");
  const animals = await listAnimals(auth);
  const scored = animals.map((animal) => {
    const name = normaliseName(animal.name);
    const nickname = normaliseName(animal.nickname);
    let score = 0;
    if (name === query || nickname === query) score = 100;
    else if (name.startsWith(query) || nickname.startsWith(query)) score = 75;
    else if (name.includes(query) || nickname.includes(query)) score = 50;
    return { animal, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || String(a.animal.name).localeCompare(String(b.animal.name)));

  return {
    query: args.query || args.name,
    matches: scored.slice(0, 10).map((item) => ({ ...item.animal, confidence: item.score === 100 ? "exact" : item.score >= 75 ? "strong" : "partial" })),
    requiresDisambiguation: scored.length > 1 && scored[0]?.score === scored[1]?.score,
  };
}

async function getAnimal(auth, animalId) {
  const id = normaliseString(animalId);
  if (!id) fail(400, "animalId is required.", "ANIMAL_ID_MISSING");
  const owner = auth.context.dataOwnerUid;
  const snakeRef = db.collection("users").doc(owner).collection("snakes").doc(id);
  const snake = await snakeRef.get();
  if (snake.exists) return { id, recordType: "snake", ref: snakeRef, data: snake.data() || {} };

  const animalRef = db.collection("users").doc(owner).collection("animals").doc(id);
  const animal = await animalRef.get();
  if (animal.exists) return { id, recordType: "universal_animal", ref: animalRef, data: animal.data() || {} };
  fail(404, "That animal could not be found in this Tiny Titans account.", "ANIMAL_NOT_FOUND");
}

async function requireSnake(auth, animalId) {
  const animal = await getAnimal(auth, animalId);
  if (animal.recordType !== "snake") {
    fail(409, "This tracker write is not yet available for universal animal records. Tiny Titans will not create an invisible record that the app cannot display.", "TRACKER_NOT_AVAILABLE");
  }
  return animal;
}

async function recentRecords(owner, snakeId, name, limit = 10) {
  const snapshot = await db.collection("users").doc(owner).collection("snakes").doc(snakeId).collection(name).orderBy("date", "desc").limit(limit).get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function getAnimalSummary(auth, args) {
  const animal = await getAnimal(auth, args.animalId);
  if (animal.recordType !== "snake") {
    return {
      id: animal.id,
      recordType: animal.recordType,
      name: animal.data.name || "Unnamed animal",
      species: animal.data.speciesCommonName || animal.data.scientificName || null,
      sex: animal.data.sex || "unknown",
      status: animal.data.status || "active",
      notes: animal.data.notes || null,
      trackingSupported: false,
    };
  }

  const owner = auth.context.dataOwnerUid;
  const [feedings, weights, sheds, behaviours, health] = await Promise.all([
    recentRecords(owner, animal.id, "feedings", 1),
    recentRecords(owner, animal.id, "weights", 2),
    recentRecords(owner, animal.id, "sheds", 1),
    recentRecords(owner, animal.id, "behaviours", 1),
    recentRecords(owner, animal.id, "health", 1),
  ]);

  return {
    id: animal.id,
    recordType: "snake",
    name: animal.data.name || "Unnamed animal",
    nickname: animal.data.nickname || null,
    species: animal.data.species || null,
    sex: animal.data.sex || "Unknown",
    morphs: Array.isArray(animal.data.morphs) ? animal.data.morphs : [],
    status: animal.data.status || "Active",
    currentWeightGrams: typeof animal.data.weight === "number" ? animal.data.weight : weights[0]?.weight ?? null,
    lastWeighedDate: animal.data.lastWeighedDate || weights[0]?.date || null,
    lastMealDate: animal.data.lastMealDate || feedings.find((item) => item.response === "Accepted" || item.response === "Partial")?.date || null,
    latestFeeding: feedings[0] || null,
    latestShed: sheds[0] || null,
    latestBehaviour: behaviours[0] || null,
    latestHealth: health[0] || null,
    trackingSupported: true,
  };
}

async function getHistory(auth, args, collectionName) {
  const snake = await requireSnake(auth, args.animalId);
  const limit = cleanLimit(args.limit, 20, 100);
  return {
    animalId: snake.id,
    animalName: snake.data.name || "Unnamed animal",
    records: await recentRecords(auth.context.dataOwnerUid, snake.id, collectionName, limit),
  };
}

async function getRecentActivity(auth, args) {
  const snake = await requireSnake(auth, args.animalId);
  const limit = cleanLimit(args.limit, 20, 50);
  const owner = auth.context.dataOwnerUid;
  const [feedings, weights, sheds, behaviours, health] = await Promise.all([
    recentRecords(owner, snake.id, "feedings", limit),
    recentRecords(owner, snake.id, "weights", limit),
    recentRecords(owner, snake.id, "sheds", limit),
    recentRecords(owner, snake.id, "behaviours", limit),
    recentRecords(owner, snake.id, "health", limit),
  ]);
  const combine = (records, type) => records.map((record) => ({ type, date: record.date || "", record }));
  return {
    animalId: snake.id,
    animalName: snake.data.name || "Unnamed animal",
    activity: [
      ...combine(feedings, "feeding"),
      ...combine(weights, "weight"),
      ...combine(sheds, "shed"),
      ...combine(behaviours, "behaviour"),
      ...combine(health, "health"),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limit),
  };
}

async function auditAction(auth, details) {
  const ref = actionsCollection(auth.uid).doc();
  await ref.set({
    ...details,
    requesterUid: auth.uid,
    dataOwnerUid: auth.context.dataOwnerUid,
    source: "chatgpt_companion",
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: nowIso(),
  });
  return ref.id;
}

async function touchConnection(auth, tool) {
  await auth.ref.set({
    lastUsedAt: FieldValue.serverTimestamp(),
    lastTool: tool,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function existingRecord(ref) {
  const snapshot = await ref.get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function logFeeding(auth, args) {
  requireFamilyWriteOwner(auth.context);
  const snake = await requireSnake(auth, args.animalId);
  const date = validateIsoDate(args.date);
  const foodType = FOOD_TYPES.has(args.foodType) ? args.foodType : "Other";
  const customFood = foodType === "Other" ? normaliseString(args.customFood || args.foodDescription) : "";
  if (foodType === "Other" && !customFood) fail(400, "customFood is required when foodType is Other.", "FOOD_MISSING");
  const response = FEEDING_RESPONSES.has(args.response) ? args.response : "Accepted";
  const feedingMethod = FEEDING_METHODS.has(args.feedingMethod) ? args.feedingMethod : undefined;
  const preyCategory = PREY_CATEGORIES.has(args.preyCategory) ? args.preyCategory : undefined;
  const weight = args.weightGrams === undefined && args.weight === undefined ? undefined : Number(args.weightGrams ?? args.weight);
  if (weight !== undefined && (!Number.isFinite(weight) || weight < 0 || weight > 100000)) fail(400, "Prey weight must be a sensible value in grams.", "PREY_WEIGHT_INVALID");
  const quantity = args.quantity === undefined ? 1 : Number(args.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) fail(400, "quantity must be a whole number between 1 and 100.", "QUANTITY_INVALID");

  const id = idForAction(auth, "log_feeding", args.idempotencyKey);
  const ref = snake.ref.collection("feedings").doc(id);
  const duplicate = await existingRecord(ref);
  if (duplicate) return { duplicate: true, record: duplicate, deepLink: `/snakes/${snake.id}/feeding?record=${encodeURIComponent(id)}` };

  const record = {
    id,
    snakeId: snake.id,
    date,
    foodType,
    ...(customFood ? { customFood } : {}),
    ...(normaliseString(args.size) ? { size: normaliseString(args.size) } : {}),
    ...(weight !== undefined ? { weight } : {}),
    ...(quantity !== 1 ? { quantity } : {}),
    ...(preyCategory ? { preyCategory } : {}),
    ...(feedingMethod ? { feedingMethod } : {}),
    response,
    ...(normaliseString(args.notes) ? { notes: normaliseString(args.notes) } : {}),
    lastModifiedBy: auth.uid,
    integrationMetadata: metadata(auth, "log_feeding"),
  };
  await ref.set(record);

  const rootUpdate = { updatedAt: FieldValue.serverTimestamp() };
  if ((response === "Accepted" || response === "Partial") && (!snake.data.lastMealDate || date >= String(snake.data.lastMealDate))) {
    rootUpdate.lastMealDate = date;
    const schedule = snake.data.feedingSchedule;
    if (schedule?.enabled === true && Number.isInteger(Number(schedule.intervalDays)) && Number(schedule.intervalDays) > 0) {
      rootUpdate["feedingSchedule.nextFeedingDate"] = addDays(date, Number(schedule.intervalDays));
    }
  }
  await snake.ref.update(rootUpdate);

  const actionId = await auditAction(auth, {
    tool: "log_feeding",
    animalId: snake.id,
    animalName: snake.data.name || null,
    recordId: id,
    recordPath: ref.path,
    recordCollection: "feedings",
    summary: `${snake.data.name || "Animal"} · ${response} · ${foodType}${weight !== undefined ? ` · ${weight}g` : ""}`,
    reversible: true,
  });
  return { record, actionId, deepLink: `/snakes/${snake.id}/feeding?record=${encodeURIComponent(id)}` };
}

async function logWeight(auth, args) {
  requireFamilyWriteOwner(auth.context);
  const snake = await requireSnake(auth, args.animalId);
  const date = validateIsoDate(args.date);
  let value = Number(args.weightGrams ?? args.weight);
  const unit = normaliseString(args.unit || "g").toLowerCase();
  if (unit === "kg") value *= 1000;
  if (!Number.isFinite(value) || value <= 0 || value > 100000) fail(400, "Weight must be a sensible positive value in grams or kilograms.", "WEIGHT_INVALID");

  const sameDay = await snake.ref.collection("weights").where("date", "==", date).limit(1).get();
  const id = idForAction(auth, "log_weight", args.idempotencyKey);
  const ref = snake.ref.collection("weights").doc(id);
  const duplicate = await existingRecord(ref);
  if (duplicate) return { duplicate: true, record: duplicate, deepLink: `/snakes/${snake.id}/weights?record=${encodeURIComponent(id)}` };
  if (!sameDay.empty) fail(409, "A weight record already exists for this date. Ask to edit the existing record instead of creating a duplicate.", "WEIGHT_DUPLICATE_DATE");

  const record = {
    id,
    snakeId: snake.id,
    weight: value,
    unit: "g",
    date,
    lastModifiedBy: auth.uid,
    integrationMetadata: metadata(auth, "log_weight"),
  };
  await ref.set(record);
  if (!snake.data.lastWeighedDate || date >= String(snake.data.lastWeighedDate)) {
    await snake.ref.update({ weight: value, lastWeighedDate: date, updatedAt: FieldValue.serverTimestamp() });
  }

  const actionId = await auditAction(auth, {
    tool: "log_weight",
    animalId: snake.id,
    animalName: snake.data.name || null,
    recordId: id,
    recordPath: ref.path,
    recordCollection: "weights",
    summary: `${snake.data.name || "Animal"} · ${Number(value.toFixed(2))}g`,
    reversible: true,
  });
  return { record, actionId, deepLink: `/snakes/${snake.id}/weights?record=${encodeURIComponent(id)}` };
}

async function logShed(auth, args) {
  requireFamilyWriteOwner(auth.context);
  const snake = await requireSnake(auth, args.animalId);
  const date = validateIsoDate(args.date);
  const status = SHED_STATUS.has(args.status) ? args.status : "Complete";
  const quality = SHED_QUALITY.has(args.quality) ? args.quality : "Unknown";
  const assistance = SHED_ASSISTANCE.has(args.assistance) ? args.assistance : "None";
  const retainedAreas = Array.isArray(args.retainedAreas) ? args.retainedAreas.filter((value) => ["Eye Cap", "Head", "Tail Tip", "Body", "Other"].includes(value)) : [];
  const retainedEyeCaps = args.retainedEyeCaps === true || retainedAreas.includes("Eye Cap");
  const retainedTailTip = args.retainedTailTip === true || retainedAreas.includes("Tail Tip");
  const canonicalAreas = Array.from(new Set([...retainedAreas, ...(retainedEyeCaps ? ["Eye Cap"] : []), ...(retainedTailTip ? ["Tail Tip"] : [])]));

  const id = idForAction(auth, "log_shed", args.idempotencyKey);
  const ref = snake.ref.collection("sheds").doc(id);
  const duplicate = await existingRecord(ref);
  if (duplicate) return { duplicate: true, record: duplicate, deepLink: `/snakes/${snake.id}/shedding?record=${encodeURIComponent(id)}` };

  const record = {
    id,
    snakeId: snake.id,
    date,
    currentStage: "Complete",
    completedAt: date,
    shedCompleted: true,
    retainedAreas: canonicalAreas,
    retainedShedArea: canonicalAreas.length === 0 ? "None" : canonicalAreas.length === 1 ? canonicalAreas[0] : "Multiple Areas",
    retainedEyeCaps,
    retainedTailTip,
    status,
    quality,
    assistance,
    notes: normaliseString(args.notes),
    lastModifiedBy: auth.uid,
    integrationMetadata: metadata(auth, "log_shed"),
  };
  await ref.set(record);
  const actionId = await auditAction(auth, {
    tool: "log_shed",
    animalId: snake.id,
    animalName: snake.data.name || null,
    recordId: id,
    recordPath: ref.path,
    recordCollection: "sheds",
    summary: `${snake.data.name || "Animal"} · ${status} shed · ${quality}`,
    reversible: true,
  });
  return { record, actionId, deepLink: `/snakes/${snake.id}/shedding?record=${encodeURIComponent(id)}` };
}

async function logBehaviour(auth, args) {
  requireFamilyWriteOwner(auth.context);
  const snake = await requireSnake(auth, args.animalId);
  const date = validateIsoDate(args.date);
  const observation = BEHAVIOUR_OBSERVATIONS.has(args.observation) ? args.observation : "Other";
  const context = BEHAVIOUR_CONTEXTS.has(args.context) ? args.context : "Routine observation";
  const description = normaliseString(args.description || args.notes);
  if (!description) fail(400, "A behaviour description is required.", "BEHAVIOUR_DESCRIPTION_MISSING");

  const id = idForAction(auth, "log_behaviour", args.idempotencyKey);
  const ref = snake.ref.collection("behaviours").doc(id);
  const duplicate = await existingRecord(ref);
  if (duplicate) return { duplicate: true, record: duplicate, deepLink: `/snakes/${snake.id}/behaviour?record=${encodeURIComponent(id)}` };

  const record = {
    id,
    snakeId: snake.id,
    date,
    observation,
    context,
    description,
    ...(normaliseString(args.duration) ? { duration: normaliseString(args.duration) } : {}),
    ...(normaliseString(args.relatedChange) ? { relatedChange: normaliseString(args.relatedChange) } : {}),
    ...(normaliseString(args.notes) && args.notes !== description ? { notes: normaliseString(args.notes) } : {}),
    lastModifiedBy: auth.uid,
    integrationMetadata: metadata(auth, "log_behaviour"),
  };
  await ref.set(record);
  const actionId = await auditAction(auth, {
    tool: "log_behaviour",
    animalId: snake.id,
    animalName: snake.data.name || null,
    recordId: id,
    recordPath: ref.path,
    recordCollection: "behaviours",
    summary: `${snake.data.name || "Animal"} · ${observation}`,
    reversible: true,
  });
  return { record, actionId, deepLink: `/snakes/${snake.id}/behaviour?record=${encodeURIComponent(id)}` };
}

async function logHealthObservation(auth, args) {
  requireFamilyWriteOwner(auth.context);
  const snake = await requireSnake(auth, args.animalId);
  const date = validateIsoDate(args.date);
  const eventType = HEALTH_EVENT_TYPES.has(args.eventType) ? args.eventType : "Observation";
  const status = HEALTH_STATUSES.has(args.status) ? args.status : "Monitoring";
  const title = normaliseString(args.title) || (eventType === "Observation" ? "Keeper observation" : eventType);
  const description = normaliseString(args.description || args.notes);
  if (!description) fail(400, "A health observation description is required.", "HEALTH_DESCRIPTION_MISSING");

  const id = idForAction(auth, "log_health_observation", args.idempotencyKey);
  const ref = snake.ref.collection("health").doc(id);
  const duplicate = await existingRecord(ref);
  if (duplicate) return { duplicate: true, record: duplicate, deepLink: `/snakes/${snake.id}/health?record=${encodeURIComponent(id)}` };

  const record = {
    id,
    snakeId: snake.id,
    date,
    eventType,
    status,
    title,
    description,
    ...(normaliseString(args.medication) ? { medication: normaliseString(args.medication) } : {}),
    ...(normaliseString(args.dosage) ? { dosage: normaliseString(args.dosage) } : {}),
    ...(normaliseString(args.vetName) ? { vetName: normaliseString(args.vetName) } : {}),
    ...(normaliseString(args.followUpDate) ? { followUpDate: validateIsoDate(args.followUpDate, "followUpDate", { allowFuture: true }) } : {}),
    ...(normaliseString(args.notes) && args.notes !== description ? { notes: normaliseString(args.notes) } : {}),
    lastModifiedBy: auth.uid,
    integrationMetadata: metadata(auth, "log_health_observation"),
  };
  await ref.set(record);
  const actionId = await auditAction(auth, {
    tool: "log_health_observation",
    animalId: snake.id,
    animalName: snake.data.name || null,
    recordId: id,
    recordPath: ref.path,
    recordCollection: "health",
    summary: `${snake.data.name || "Animal"} · ${eventType} · ${status}`,
    reversible: true,
  });
  return { record, actionId, deepLink: `/snakes/${snake.id}/health?record=${encodeURIComponent(id)}` };
}

async function recomputeWeightSummary(snakeRef) {
  const latest = await snakeRef.collection("weights").orderBy("date", "desc").limit(1).get();
  if (latest.empty) {
    const snake = (await snakeRef.get()).data() || {};
    await snakeRef.update({ weight: snake.startingWeight ?? null, lastWeighedDate: "", updatedAt: FieldValue.serverTimestamp() });
    return;
  }
  const data = latest.docs[0].data() || {};
  await snakeRef.update({ weight: Number(data.weight), lastWeighedDate: data.date || "", updatedAt: FieldValue.serverTimestamp() });
}

async function recomputeFeedingSummary(snakeRef) {
  const recent = await snakeRef.collection("feedings").orderBy("date", "desc").limit(100).get();
  const accepted = recent.docs.map((item) => item.data() || {}).find((data) => data.response === "Accepted" || data.response === "Partial");
  await snakeRef.update({ lastMealDate: accepted?.date || "", updatedAt: FieldValue.serverTimestamp() });
}

async function undoLastAction(auth) {
  requireFamilyWriteOwner(auth.context);
  const snapshot = await actionsCollection(auth.uid).orderBy("createdAt", "desc").limit(20).get();
  const candidate = snapshot.docs.find((item) => {
    const data = item.data() || {};
    return data.reversible === true && !data.undoneAt && typeof data.recordPath === "string";
  });
  if (!candidate) fail(404, "There is no reversible ChatGPT Companion action to undo.", "UNDO_NOTHING");

  const action = candidate.data() || {};
  const recordRef = db.doc(action.recordPath);
  const record = await recordRef.get();
  if (record.exists) await recordRef.delete();

  if (action.animalId && action.recordCollection) {
    const snakeRef = db.collection("users").doc(auth.context.dataOwnerUid).collection("snakes").doc(action.animalId);
    if (action.recordCollection === "weights") await recomputeWeightSummary(snakeRef);
    if (action.recordCollection === "feedings") await recomputeFeedingSummary(snakeRef);
  }

  await candidate.ref.set({
    undoneAt: FieldValue.serverTimestamp(),
    undoneAtIso: nowIso(),
    reversible: false,
  }, { merge: true });

  await auditAction(auth, {
    tool: "undo_last_action",
    animalId: action.animalId || null,
    animalName: action.animalName || null,
    recordId: action.recordId || null,
    recordPath: action.recordPath || null,
    recordCollection: action.recordCollection || null,
    summary: `Undid: ${action.summary || action.tool || "ChatGPT Companion action"}`,
    reversible: false,
    undidActionId: candidate.id,
  });

  return {
    undone: true,
    actionId: candidate.id,
    summary: action.summary || null,
    animalId: action.animalId || null,
  };
}

async function dispatchTool(auth, tool, args) {
  if (!toolPermission(auth, tool)) fail(403, "This Tiny Titans connection does not have permission for that action.", "PERMISSION_DENIED");
  if (WRITE_TOOLS.has(tool)) requireFamilyWriteOwner(auth.context);

  switch (tool) {
    case "list_animals": return { animals: await listAnimals(auth) };
    case "resolve_animal": return resolveAnimal(auth, args);
    case "get_animal_summary": return getAnimalSummary(auth, args);
    case "get_feeding_history": return getHistory(auth, args, "feedings");
    case "get_weight_history": return getHistory(auth, args, "weights");
    case "get_shed_history": return getHistory(auth, args, "sheds");
    case "get_recent_activity": return getRecentActivity(auth, args);
    case "log_feeding": return logFeeding(auth, args);
    case "log_weight": return logWeight(auth, args);
    case "log_shed": return logShed(auth, args);
    case "log_behaviour": return logBehaviour(auth, args);
    case "log_health_observation": return logHealthObservation(auth, args);
    case "undo_last_action": return undoLastAction(auth);
    default: fail(404, "Unknown Tiny Titans Companion tool.", "TOOL_UNKNOWN");
  }
}

exports.chatGPTCompanionApi = onRequest({ region: "europe-west2", cors: false, timeoutSeconds: 60 }, async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "authorization, content-type, x-idempotency-key");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return response.status(204).send("");

  const path = String(request.path || "/").replace(/\/+$/, "") || "/";
  try {
    if (request.method === "GET" && (path === "/" || path === "/v1/health")) {
      return sendJson(response, 200, {
        ok: true,
        service: "Tiny Titans ChatGPT Companion API",
        version: "v1",
        writeActions: true,
      });
    }

    const auth = await authenticateBearer(request);
    if (!auth) return sendJson(response, 401, { ok: false, error: "Invalid, expired, revoked or ineligible Tiny Titans Companion connection." });

    if (request.method === "GET" && path === "/v1/me") {
      await touchConnection(auth, "me");
      return sendJson(response, 200, {
        ok: true,
        data: {
          uid: auth.uid,
          effectiveTier: auth.access.tier,
          accessSource: auth.access.source,
          permissions: auth.permissions,
          sharedFamily: auth.context.sharedFamily,
        },
      });
    }

    if (request.method === "GET" && path === "/v1/tools") {
      await touchConnection(auth, "tools");
      return sendJson(response, 200, { ok: true, data: { tools: TOOL_CATALOG } });
    }

    const match = request.method === "POST" ? path.match(/^\/v1\/tools\/([a-z0-9_]+)$/) : null;
    if (!match) return sendJson(response, 404, { ok: false, error: "Unknown Tiny Titans Companion endpoint." });

    const tool = match[1];
    const args = request.body && typeof request.body === "object" ? { ...request.body } : {};
    if (!args.idempotencyKey && request.get("x-idempotency-key")) args.idempotencyKey = request.get("x-idempotency-key");
    const data = await dispatchTool(auth, tool, args);
    await touchConnection(auth, tool);
    return sendJson(response, 200, { ok: true, tool, data });
  } catch (error) {
    console.error("Tiny Titans: ChatGPT Companion API failure", {
      path,
      method: request.method,
      code: error?.code,
      message: error?.message,
    });
    const status = Number(error?.statusCode);
    return sendJson(response, Number.isInteger(status) && status >= 400 && status < 600 ? status : 500, {
      ok: false,
      code: error?.code || "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Tiny Titans Companion could not complete that request.",
    });
  }
});

exports._chatgptCompanionInternal = {
  TOOL_CATALOG,
  COMPANION_TIERS,
  DEFAULT_PERMISSIONS,
  WRITE_TOOLS,
  dispatchTool,
  resolveEffectiveTier,
  requireCompanionAccess,
  resolveAccountContext,
  connectionRef,
  touchConnection,
};

exports._chatgptCompanionTest = {
  TOOL_CATALOG,
  COMPANION_TIERS,
  DEFAULT_PERMISSIONS,
};
