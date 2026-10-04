const crypto = require("node:crypto");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();

const OWNER_EMAIL = "tinytitans.exotics@gmail.com";
const COMPANION_TIERS = new Set(["titan_pro", "business_starter", "business_plus", "business_advanced", "rescue"]);
const CONNECTION_TTL_DAYS = 90; // legacy v1 bearer connections only
const TOKEN_PREFIX = "ttgpt_"; // legacy v1 bearer prefix
const LINK_CODE_PREFIX = "ttlink_";
const OAUTH_CODE_PREFIX = "ttcode_";
const OAUTH_ACCESS_PREFIX = "ttat_";
const OAUTH_REFRESH_PREFIX = "ttrt_";
const LINK_CODE_TTL_MINUTES = 15;
const OAUTH_CODE_TTL_MINUTES = 5;
const OAUTH_ACCESS_TTL_MINUTES = 60;
const OAUTH_REFRESH_TTL_DAYS = 90;
const PUBLIC_ORIGIN = "https://tinytitanskeeper.web.app";
const MCP_RESOURCE = `${PUBLIC_ORIGIN}/mcp`;
const OAUTH_ISSUER = PUBLIC_ORIGIN;
const PROTECTED_RESOURCE_METADATA = `${PUBLIC_ORIGIN}/.well-known/oauth-protected-resource`;
const FIREBASE_WEB_CONFIG = Object.freeze({
  apiKey: "AIzaSyCaUnpNpfoGcmgs3cfe8PXYTeU7_lz50d0",
  authDomain: "tinytitans-hoggy-companion.firebaseapp.com",
  projectId: "tinytitans-hoggy-companion",
  storageBucket: "tinytitans-hoggy-companion.firebasestorage.app",
  messagingSenderId: "309730999071",
  appId: "1:309730999071:web:c2b9364b584f7879900e2a",
});
const OAUTH_SCOPES = Object.freeze([
  "animals.read",
  "records.read",
  "records.write",
  "records.undo",
  "reminders.read",
  "reminders.write",
]);
const SCOPE_PERMISSION_MAP = Object.freeze({
  "animals.read": "read_animals",
  "records.read": "read_records",
  "records.write": "write_records",
  "records.undo": "undo_own_actions",
  "reminders.read": "read_reminders",
  "reminders.write": "write_reminders",
});
const DEFAULT_PERMISSIONS = Object.freeze([
  "read_animals",
  "read_records",
  "write_records",
  "undo_own_actions",
  "read_reminders",
  "write_reminders",
]);
const WRITE_TOOLS = new Set([
  "log_feeding",
  "log_weight",
  "log_shed",
  "log_behaviour",
  "log_health_observation",
  "create_reminders",
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
  { name: "get_keeper_snapshot", mode: "read", description: "Read a multi-animal Tiny Titans keeper snapshot in one request." },
  { name: "list_reminders", mode: "read", description: "Read Tiny Titans keeper reminders." },
  { name: "log_feeding", mode: "write", description: "Create a structured feeding record." },
  { name: "log_weight", mode: "write", description: "Create a weight record and synchronise the current animal weight." },
  { name: "log_shed", mode: "write", description: "Create a structured shed record." },
  { name: "log_behaviour", mode: "write", description: "Create a keeper behaviour observation." },
  { name: "log_health_observation", mode: "write", description: "Create a health observation or veterinary record." },
  { name: "create_reminders", mode: "write", description: "Create one-time or recurring Tiny Titans reminders for one or more animals." },
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

function encodeLinkSubject(uid) {
  return Buffer.from(String(uid || ""), "utf8").toString("base64url");
}

function createRoutedLinkCode(uid) {
  const subject = encodeLinkSubject(uid);
  const secret = crypto.randomBytes(32).toString("base64url");
  return `${LINK_CODE_PREFIX}${subject}.${secret}`;
}

function parseRoutedLinkCode(linkCode) {
  const code = normaliseString(linkCode);
  if (!code.startsWith(LINK_CODE_PREFIX)) return null;
  const body = code.slice(LINK_CODE_PREFIX.length);
  const separator = body.indexOf(".");
  if (separator <= 0 || separator === body.length - 1) return null;

  const encodedUid = body.slice(0, separator);
  const secret = body.slice(separator + 1);
  if (!/^[A-Za-z0-9_-]{16,}$/.test(secret)) return null;

  try {
    const uid = Buffer.from(encodedUid, "base64url").toString("utf8");
    if (!uid || uid.length > 128 || encodeLinkSubject(uid) !== encodedUid) return null;
    return { uid };
  } catch {
    return null;
  }
}

function connectionState(data, access) {
  const now = Date.now();
  const revoked = data?.revoked === true;
  const eligible = COMPANION_TIERS.has(access.tier);
  const oauthRefreshExpiresAt = expiryMillis(data?.oauthRefreshExpiresAt);
  const legacyExpiresAt = expiryMillis(data?.expiresAt);
  const linkExpiresAt = expiryMillis(data?.linkExpiresAt);
  const oauthConnected = Boolean(
    data?.oauthConnectedAt &&
    oauthRefreshExpiresAt !== null &&
    oauthRefreshExpiresAt > now,
  );
  const legacyConnected = Boolean(
    data?.connectionVersion === 1 &&
    data?.secretHash &&
    legacyExpiresAt !== null &&
    legacyExpiresAt > now,
  );
  const connected = Boolean(data && !revoked && eligible && (oauthConnected || legacyConnected));
  const permissions = Array.isArray(data?.permissions) ? data.permissions : DEFAULT_PERMISSIONS;
  const upgradeRequired = connected && DEFAULT_PERMISSIONS.some((permission) => !permissions.includes(permission));
  const prepared = Boolean(
    data &&
    !revoked &&
    eligible &&
    data?.linkSecretHash &&
    !data?.linkUsedAt &&
    linkExpiresAt !== null &&
    linkExpiresAt > now,
  );
  const expired = Boolean(
    !connected &&
    ((oauthRefreshExpiresAt !== null && oauthRefreshExpiresAt <= now) ||
      (legacyExpiresAt !== null && legacyExpiresAt <= now)),
  );
  const linkExpired = Boolean(
    data?.linkSecretHash &&
    !data?.linkUsedAt &&
    linkExpiresAt !== null &&
    linkExpiresAt <= now,
  );

  return {
    available: eligible,
    connected,
    prepared,
    revoked,
    expired,
    linkExpired,
    effectiveTier: access.tier,
    source: access.source,
    permissions,
    upgradeRequired,
    connectedAt: data?.oauthConnectedAt || (legacyConnected ? data?.createdAt : null),
    expiresAt: data?.oauthRefreshExpiresAt || (legacyConnected ? data?.expiresAt : null),
    linkExpiresAt: data?.linkExpiresAt || null,
    lastUsedAt: data?.lastUsedAt || null,
    lastTool: data?.lastTool || null,
    mcpServer: MCP_RESOURCE,
    connectionVersion: Number(data?.connectionVersion || 0),
    timezone: normaliseString(data?.timezone) || "UTC",
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

  const linkCode = createRoutedLinkCode(uid);
  const linkExpiresAt = Timestamp.fromMillis(Date.now() + LINK_CODE_TTL_MINUTES * 60_000);
  const permissions = [...DEFAULT_PERMISSIONS];
  const requestedTimezone = normaliseString(request.data?.timezone);
  const timezone = isValidTimezone(requestedTimezone) ? requestedTimezone : "UTC";
  const ref = connectionRef(uid);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() || {} : {};
    const oauthGeneration = Number(current.oauthGeneration || 0) + 1;

    transaction.set(ref, {
      uid,
      permissions,
      timezone,
      revoked: false,
      revokedAt: FieldValue.delete(),
      linkPrefix: FieldValue.delete(),
      linkCodeVersion: 3,
      linkSecretHash: tokenHash(linkCode),
      linkCreatedAt: FieldValue.serverTimestamp(),
      linkExpiresAt,
      linkUsedAt: FieldValue.delete(),
      oauthGeneration,
      oauthConnectedAt: FieldValue.delete(),
      oauthRefreshExpiresAt: FieldValue.delete(),
      prefix: FieldValue.delete(),
      secretHash: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
      createdAt: current.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      effectiveTierAtCreation: access.tier,
      sourceAtCreation: access.source,
      connectionVersion: 2,
    }, { merge: true });
  });

  return {
    success: true,
    linkCode,
    token: linkCode,
    tokenShownOnce: true,
    linkExpiresAt: linkExpiresAt.toDate().toISOString(),
    expiresAt: linkExpiresAt.toDate().toISOString(),
    permissions,
    timezone,
    mcpServer: MCP_RESOURCE,
    apiBase: "https://europe-west2-tinytitans-hoggy-companion.cloudfunctions.net/chatGPTCompanionApi/v1",
  };
});

exports.revokeChatGPTCompanionConnection = onCall({ region: "europe-west2" }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  const ref = connectionRef(request.auth.uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() || {} : {};
    transaction.set(ref, {
      revoked: true,
      revokedAt: FieldValue.serverTimestamp(),
      oauthGeneration: Number(data.oauthGeneration || 0) + 1,
      linkUsedAt: data.linkUsedAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
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

function permissionsFromScopes(scopes) {
  const permissions = new Set();
  for (const scope of Array.isArray(scopes) ? scopes : []) {
    const permission = SCOPE_PERMISSION_MAP[scope];
    if (permission) permissions.add(permission);
  }
  return [...permissions];
}

async function authenticateOAuthAccessToken(token) {
  if (!token.startsWith(OAUTH_ACCESS_PREFIX) || token.length < 30) return null;
  const tokenSnapshot = await db.collection("chatgptOauthAccessTokens").doc(tokenHash(token)).get();
  if (!tokenSnapshot.exists) return null;
  const tokenData = tokenSnapshot.data() || {};
  if (tokenData.revoked === true || !activeFuture(tokenData.expiresAt)) return null;
  if (tokenData.resource !== MCP_RESOURCE) return null;

  const uid = normaliseString(tokenData.uid);
  if (!uid) return null;
  const connectionSnapshot = await connectionRef(uid).get();
  if (!connectionSnapshot.exists) return null;
  const connection = connectionSnapshot.data() || {};
  if (connection.revoked === true) return null;
  if (Number(connection.oauthGeneration || 0) !== Number(tokenData.generation || -1)) return null;

  const access = await resolveEffectiveTier(uid);
  if (!COMPANION_TIERS.has(access.tier)) return null;

  const scopes = Array.isArray(tokenData.scopes) ? tokenData.scopes : [];
  return {
    uid,
    permissions: permissionsFromScopes(scopes),
    scopes,
    access,
    context: await resolveAccountContext(uid),
    ref: connectionSnapshot.ref,
    oauth: true,
    resource: tokenData.resource,
    timezone: normaliseString(connection.timezone) || "UTC",
  };
}

async function authenticateBearer(request) {
  const token = bearerToken(request);
  if (token.startsWith(OAUTH_ACCESS_PREFIX)) return authenticateOAuthAccessToken(token);
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
      scopes: OAUTH_SCOPES,
      access,
      context: await resolveAccountContext(uid),
      ref: snapshot.ref,
      oauth: false,
      timezone: normaliseString(data.timezone) || "UTC",
    };
  }
  return null;
}

function hasPermission(auth, permission) {
  return auth.permissions.includes(permission);
}

function toolPermission(auth, tool) {
  if (tool === "create_reminders") return hasPermission(auth, "write_reminders");
  if (tool === "list_reminders") return hasPermission(auth, "read_reminders");
  if (WRITE_TOOLS.has(tool)) return hasPermission(auth, tool === "undo_last_action" ? "undo_own_actions" : "write_records");
  if (tool === "list_animals" || tool === "resolve_animal") return hasPermission(auth, "read_animals");
  return hasPermission(auth, "read_records");
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
  if (options.allowFuture !== true && date > tomorrow.toISOString().slice(0, 10)) {
    fail(400, `${field} cannot be in the future.`, "DATE_FUTURE");
  }
  return date;
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isValidTimezone(timezone) {
  if (!normaliseString(timezone)) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function localDateKey(date, timezone) {
  const parts = localParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedTimeToUtc(dateKey, time, timezone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = desired;
  for (let index = 0; index < 3; index += 1) {
    const parts = localParts(new Date(guess), timezone);
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    guess -= asUtc - desired;
  }
  return new Date(guess);
}

function validateClockTime(value) {
  const time = normaliseString(value || "09:00");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(400, "time must use 24-hour HH:MM.", "TIME_INVALID");
  return time;
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
    feedingSchedule: animal.data.feedingSchedule || null,
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

function scoreAnimalName(animal, query) {
  const target = normaliseName(query);
  const name = normaliseName(animal.name);
  const nickname = normaliseName(animal.nickname);
  if (name === target || nickname === target) return 100;
  if (name.startsWith(target) || nickname.startsWith(target)) return 75;
  if (name.includes(target) || nickname.includes(target)) return 50;
  return 0;
}

async function selectRequestedAnimals(auth, args, options = {}) {
  const animals = await listAnimals(auth);
  const max = Math.max(1, Math.min(100, Number(options.max || 25)));
  const names = Array.isArray(args.animalNames) ? args.animalNames.map(normaliseString).filter(Boolean) : [];
  const ids = Array.isArray(args.animalIds) ? args.animalIds.map(normaliseString).filter(Boolean) : [];
  const selected = [];
  const seen = new Set();

  for (const id of ids) {
    const match = animals.find((animal) => animal.id === id);
    if (!match) fail(404, `Animal ID ${id} was not found in this Tiny Titans account.`, "ANIMAL_NOT_FOUND");
    if (!seen.has(match.id)) { selected.push(match); seen.add(match.id); }
  }

  for (const name of names) {
    const matches = animals
      .map((animal) => ({ animal, score: scoreAnimalName(animal, name) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(a.animal.name).localeCompare(String(b.animal.name)));
    if (!matches.length) fail(404, `No Tiny Titans animal matched "${name}".`, "ANIMAL_NOT_FOUND");
    if (matches.length > 1 && matches[0].score === matches[1].score) {
      fail(409, `More than one Tiny Titans animal matched "${name}". Use the exact animal name.`, "ANIMAL_AMBIGUOUS");
    }
    const match = matches[0].animal;
    if (!seen.has(match.id)) { selected.push(match); seen.add(match.id); }
  }

  if (!names.length && !ids.length) {
    const limit = cleanLimit(args.limit, 25, max);
    return animals.filter((animal) => animal.trackingSupported).slice(0, limit);
  }
  if (selected.length > max) fail(400, `A maximum of ${max} animals can be queried at once.`, "ANIMAL_LIMIT");
  return selected;
}

async function getKeeperSnapshot(auth, args) {
  const selected = await selectRequestedAnimals(auth, args, { max: 25 });
  const summaries = await Promise.all(selected.map((animal) => getAnimalSummary(auth, { animalId: animal.id })));
  return {
    count: summaries.length,
    animals: summaries,
    generatedAt: nowIso(),
    note: "Use lastMealDate for the last successful/partial feeding date; latestFeeding is the latest feeding attempt.",
  };
}

async function listRemindersForAuth(auth, args = {}) {
  const owner = auth.context.dataOwnerUid;
  const snapshot = await db.collection("users").doc(owner).collection("reminders").limit(500).get();
  let reminders = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const kind = normaliseString(args.kind);
  const status = normaliseString(args.status);
  if (kind) reminders = reminders.filter((item) => item.kind === kind);
  if (status) reminders = reminders.filter((item) => item.status === status);
  if (args.includeCompleted !== true) reminders = reminders.filter((item) => item.status !== "completed");

  const names = Array.isArray(args.animalNames) ? args.animalNames.map(normaliseName).filter(Boolean) : [];
  if (names.length) {
    const selected = await selectRequestedAnimals(auth, { animalNames: args.animalNames }, { max: 50 });
    const ids = new Set(selected.map((animal) => animal.id));
    reminders = reminders.filter((item) => !item.snakeId || ids.has(item.snakeId));
  }

  reminders.sort((a, b) => String(a.nextNotificationAt || "").localeCompare(String(b.nextNotificationAt || "")));
  return { reminders: reminders.slice(0, cleanLimit(args.limit, 100, 500)), count: reminders.length };
}

function reminderDocumentId(auth, animalId, kind, dueDate, time, key) {
  const stable = normaliseString(key);
  if (!stable) return null;
  return `gpt-reminder-${crypto.createHash("sha256").update(`${auth.uid}|${animalId || "all"}|${kind}|${dueDate}|${time}|${stable}`).digest("hex").slice(0, 24)}`;
}

async function reanchorRecurringFeedingReminders(auth, snake, feedingDate) {
  const owner = auth.context.dataOwnerUid;
  const remindersRef = db.collection("users").doc(owner).collection("reminders");
  const snapshot = await remindersRef.limit(500).get();
  const matching = snapshot.docs.filter((item) => {
    const data = item.data() || {};
    return data.kind === "feeding" && data.status === "active" && data.snakeId === snake.id && data.scheduleType !== "once" && data.oneTime !== true;
  });
  await Promise.all(matching.map(async (item) => {
    const data = item.data() || {};
    const frequencyDays = Math.max(1, Math.min(3650, Math.round(Number(data.frequencyDays) || 1)));
    const nextDate = addDays(feedingDate, frequencyDays);
    const timezone = isValidTimezone(data.timezone) ? data.timezone : (isValidTimezone(auth.timezone) ? auth.timezone : "UTC");
    const time = validateClockTime(data.time || "09:00");
    await item.ref.update({
      nextNotificationAt: zonedTimeToUtc(nextDate, time, timezone).toISOString(),
      nextOccurrenceDate: nextDate, nextPhase: "due", leadUpEnabled: false, leadUpDays: 0,
      lockedUntil: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
    });
  }));
}

async function createReminders(auth, args) {
  requireFamilyWriteOwner(auth.context);
  const kind = normaliseString(args.kind || "custom");
  const allowedKinds = new Set(["weight", "feeding", "shedding", "health", "husbandry", "water-change", "custom"]);
  if (!allowedKinds.has(kind)) fail(400, "kind is not a supported Tiny Titans reminder type.", "REMINDER_KIND_INVALID");
  const timezone = normaliseString(args.timezone || auth.timezone);
  if (!isValidTimezone(timezone)) fail(400, "A valid IANA timezone is required for reminders.", "TIMEZONE_INVALID");
  const dueDate = validateIsoDate(args.dueDate || args.date, "dueDate", { allowFuture: true });
  if (dueDate < localDateKey(new Date(), timezone)) fail(400, "A reminder due date cannot be in the past.", "REMINDER_DATE_PAST");
  const time = validateClockTime(args.time || "09:00");
  const repeatRaw = args.repeatEveryDays;
  const recurring = repeatRaw !== undefined && repeatRaw !== null;
  const frequencyDays = recurring ? Number(repeatRaw) : 1;
  if (recurring && (!Number.isInteger(frequencyDays) || frequencyDays < 1 || frequencyDays > 3650)) {
    fail(400, "repeatEveryDays must be a whole number between 1 and 3650.", "REMINDER_FREQUENCY_INVALID");
  }

  const requestedNames = Array.isArray(args.animalNames) ? args.animalNames.map(normaliseString).filter(Boolean) : [];
  const requestedIds = Array.isArray(args.animalIds) ? args.animalIds.map(normaliseString).filter(Boolean) : [];
  if (kind === "feeding" && requestedNames.length === 0 && requestedIds.length === 0) {
    fail(400, "Feeding reminders must identify at least one animal.", "REMINDER_ANIMAL_REQUIRED");
  }

  const targets = requestedNames.length || requestedIds.length
    ? await selectRequestedAnimals(auth, { animalNames: requestedNames, animalIds: requestedIds }, { max: 25 })
    : [null];
  if (targets.some((animal) => animal && !animal.trackingSupported)) {
    fail(409, "Reminder targeting currently requires a tracked snake record.", "TRACKER_NOT_AVAILABLE");
  }

  const owner = auth.context.dataOwnerUid;
  const remindersRef = db.collection("users").doc(owner).collection("reminders");
  const existingSnapshot = await remindersRef.limit(500).get();
  const title = normaliseString(args.title) || ({
    feeding: "Feeding reminder", weight: "Weight check", shedding: "Shed check", health: "Health check",
    husbandry: "Husbandry check", "water-change": "Water change", custom: "Tiny Titans reminder",
  }[kind]);
  const description = normaliseString(args.description);
  const created = [];
  const duplicates = [];
  const createdRefs = [];

  for (const animal of targets) {
    const animalId = animal?.id || null;
    const animalName = animal?.name || null;
    const duplicate = existingSnapshot.docs.find((item) => {
      const data = item.data() || {};
      return data.status === "active" && data.kind === kind && (data.snakeId || null) === animalId &&
        String(data.nextOccurrenceDate || data.startDate || "") === dueDate && String(data.time || "09:00") === time &&
        (recurring ? Number(data.frequencyDays) === frequencyDays && data.scheduleType !== "once" : data.scheduleType === "once" || data.oneTime === true);
    });
    if (duplicate) {
      duplicates.push({ id: duplicate.id, animalId, animalName, dueDate, time });
      continue;
    }

    let occurrenceDate = dueDate;
    if (kind === "feeding" && recurring && animal) {
      const snake = await getAnimal(auth, animal.id);
      const anchor = normaliseString(snake.data.lastMealDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(anchor)) occurrenceDate = addDays(anchor, frequencyDays);
    }

    const stableId = reminderDocumentId(auth, animalId, kind, dueDate, time, args.idempotencyKey);
    const ref = stableId ? remindersRef.doc(stableId) : remindersRef.doc();
    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data() || {};
      duplicates.push({ id: ref.id, animalId, animalName, dueDate: data.nextOccurrenceDate || dueDate, time: data.time || time });
      continue;
    }

    const record = {
      kind, title, description, snakeId: animalId, snakeName: animalName,
      frequencyDays, time, startDate: dueDate, timezone, leadUpEnabled: false, leadUpDays: 0, status: "active",
      scheduleType: recurring ? "recurring" : "once", oneTime: !recurring,
      nextNotificationAt: zonedTimeToUtc(occurrenceDate, time, timezone).toISOString(),
      nextOccurrenceDate: occurrenceDate, nextPhase: "due", lastNotifiedAt: null, lastCompletedAt: null, lockedUntil: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      integrationMetadata: metadata(auth, "create_reminders"),
    };
    await ref.set(record);
    createdRefs.push(ref.path);
    created.push({ id: ref.id, animalId, animalName, kind, dueDate: occurrenceDate, time, timezone, recurring, repeatEveryDays: recurring ? frequencyDays : null });
  }

  let actionId = null;
  if (createdRefs.length) {
    actionId = await auditAction(auth, {
      tool: "create_reminders", recordPaths: createdRefs, recordCollection: "reminders",
      summary: `Created ${createdRefs.length} ${kind} reminder${createdRefs.length === 1 ? "" : "s"} for ${dueDate}`,
      reversible: true,
    });
  }
  return { created, duplicates, actionId, deepLink: "/reminders", oneTime: !recurring };
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
  if (response === "Accepted" || response === "Partial") {
    await reanchorRecurringFeedingReminders(auth, snake, date);
  }

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
    return data.reversible === true && !data.undoneAt && (typeof data.recordPath === "string" || Array.isArray(data.recordPaths));
  });
  if (!candidate) fail(404, "There is no reversible ChatGPT Companion action to undo.", "UNDO_NOTHING");

  const action = candidate.data() || {};
  const recordPaths = Array.isArray(action.recordPaths) ? action.recordPaths.filter((path) => typeof path === "string") : (typeof action.recordPath === "string" ? [action.recordPath] : []);
  for (const recordPath of recordPaths) {
    const recordRef = db.doc(recordPath);
    const record = await recordRef.get();
    if (record.exists) await recordRef.delete();
  }

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
    case "get_keeper_snapshot": return getKeeperSnapshot(auth, args);
    case "list_reminders": return listRemindersForAuth(auth, args);
    case "log_feeding": return logFeeding(auth, args);
    case "log_weight": return logWeight(auth, args);
    case "log_shed": return logShed(auth, args);
    case "log_behaviour": return logBehaviour(auth, args);
    case "log_health_observation": return logHealthObservation(auth, args);
    case "create_reminders": return createReminders(auth, args);
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



// ---------------------------------------------------------------------------
// Tiny Titans MCP + OAuth 2.1 bridge
// ---------------------------------------------------------------------------

const MCP_SERVER_INFO = Object.freeze({
  name: "tiny-titans-keeper-companion",
  title: "Tiny Titans Keeper Companion",
  version: "2.0.0",
  description: "Secure conversational keeper records for Tiny Titans.",
  websiteUrl: PUBLIC_ORIGIN,
});

const MCP_INSTRUCTIONS = "Complete every part of a compound keeper request, not just the first clause. Prefer get_keeper_snapshot for multi-animal or account-wide keeper questions instead of repeatedly resolving animals one by one. Use create_reminders for reminder requests and convert relative dates such as Monday into an absolute YYYY-MM-DD using the user current date. Never invent animal IDs. Read keeper records when useful. Only create, change, or undo records when the user asks for that action. Tiny Titans tools are scoped to the authenticated keeper account and never provide generic database access.";

function oauthCollection(name) {
  return db.collection(name);
}

function randomCredential(prefix) {
  return `${prefix}${crypto.randomBytes(32).toString("base64url")}`;
}

function timestampFromNowMillis(ms) {
  return Timestamp.fromMillis(Date.now() + ms);
}

function parseScopeString(value) {
  return normaliseString(value).split(/\s+/).filter(Boolean);
}

function requestedScopesOrDefault(value) {
  const requested = parseScopeString(value);
  return requested.length ? requested : [...OAUTH_SCOPES];
}

function invalidScopes(scopes) {
  return scopes.filter((scope) => !OAUTH_SCOPES.includes(scope));
}

function oauthField(request, key) {
  const body = request.body && typeof request.body === "object" ? request.body : {};
  const value = body[key] ?? request.query?.[key];
  return Array.isArray(value) ? normaliseString(value[0]) : normaliseString(value);
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

function base64UrlSha256(value) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

function oauthJson(response, status, payload) {
  return response
    .status(status)
    .set("Cache-Control", "no-store")
    .set("Pragma", "no-cache")
    .json(payload);
}

function validChatGptClient(clientId, redirectUri) {
  if (
    clientId === "https://chatgpt.com/oauth/client.json" &&
    redirectUri === "https://chatgpt.com/connector_platform_oauth_redirect"
  ) {
    return true;
  }

  const match = clientId.match(/^https:\/\/chatgpt\.com\/oauth\/([^/]+)\/client\.json$/);
  return Boolean(
    match &&
    redirectUri === `https://chatgpt.com/connector/oauth/${match[1]}`
  );
}

function validateOAuthAuthorizeInput(input) {
  if (input.responseType !== "code") return "response_type must be code.";
  if (!validChatGptClient(input.clientId, input.redirectUri)) return "This OAuth client or redirect URI is not allowed.";
  if (input.resource !== MCP_RESOURCE) return "The OAuth resource does not match the Tiny Titans MCP server.";
  if (input.codeChallengeMethod !== "S256" || !input.codeChallenge) return "PKCE with S256 is required.";
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(input.codeChallenge)) return "The PKCE code challenge is invalid.";
  const unsupported = invalidScopes(input.scopes);
  if (unsupported.length) return `Unsupported OAuth scope: ${unsupported.join(", ")}`;
  return "";
}

function oauthAuthorizeInput(request) {
  return {
    responseType: oauthField(request, "response_type"),
    clientId: oauthField(request, "client_id"),
    redirectUri: oauthField(request, "redirect_uri"),
    scope: oauthField(request, "scope"),
    scopes: requestedScopesOrDefault(oauthField(request, "scope")),
    state: oauthField(request, "state"),
    codeChallenge: oauthField(request, "code_challenge"),
    codeChallengeMethod: oauthField(request, "code_challenge_method"),
    resource: oauthField(request, "resource"),
  };
}

function redirectOAuth(response, input, params) {
  const target = new URL(input.redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") target.searchParams.set(key, String(value));
  }
  target.searchParams.set("iss", OAUTH_ISSUER);
  return response.redirect(302, target.toString());
}

function renderAuthorizePage(response, input, errorMessage = "") {
  const hidden = [
    ["response_type", input.responseType],
    ["client_id", input.clientId],
    ["redirect_uri", input.redirectUri],
    ["scope", input.scopes.join(" ")],
    ["state", input.state],
    ["code_challenge", input.codeChallenge],
    ["code_challenge_method", input.codeChallengeMethod],
    ["resource", input.resource],
  ].map(([name, value]) => `<input type="hidden" name="${htmlEscape(name)}" value="${htmlEscape(value)}">`).join("");

  const scopeLabels = input.scopes.map((scope) => {
    const label = {
      "animals.read": "Read animal identity and profile basics",
      "records.read": "Read keeper tracker history",
      "records.write": "Create feeding, weight, shed, behaviour and health records",
      "records.undo": "Undo records created through the Tiny Titans connection",
      "reminders.read": "Read keeper reminders",
      "reminders.write": "Create keeper reminders",
    }[scope] || scope;
    return `<li>${htmlEscape(label)}</li>`;
  }).join("");

  const error = errorMessage
    ? `<div class="error" role="alert">${htmlEscape(errorMessage)}</div>`
    : "";
  const firebaseConfig = JSON.stringify(FIREBASE_WEB_CONFIG).replace(/</g, "\\u003c");

  return response
    .status(200)
    .set("Cache-Control", "no-store")
    .set("Content-Type", "text/html; charset=utf-8")
    .send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect Tiny Titans to ChatGPT</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0f0f16;color:#f4f2ea;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.card{width:min(680px,100%);background:linear-gradient(145deg,#181724,#11111a);border:1px solid #343242;border-radius:24px;padding:28px;box-shadow:0 24px 70px #0008}.kicker{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:#8fded4;font-weight:850}.brand{font-size:1.9rem;font-weight:900;margin:6px 0 8px}.muted{color:#b9b6c4;line-height:1.55}.permissions{background:#ffffff0a;border-radius:15px;padding:14px 18px;line-height:1.7}.field{display:grid;gap:7px;margin-top:12px}.field label{font-weight:850}.field input{width:100%;min-height:48px;border:1px solid #535064;border-radius:13px;background:#09090e;color:#fff;padding:11px 13px;font:inherit}.button{width:100%;min-height:48px;border:1px solid #65d5c8;border-radius:13px;background:linear-gradient(135deg,#2d726b,#4a356e);color:#fff;font-weight:900;font:inherit;margin-top:12px;cursor:pointer}.button.secondary{background:#171621;border-color:#4a4858}.button:disabled{opacity:.45;cursor:not-allowed}.error{border:1px solid #ff7373;background:#ff737316;border-radius:12px;padding:11px 13px;margin-top:14px}.fine{font-size:.82rem;color:#9693a1;line-height:1.5;margin-top:16px}.account{border:1px solid #3b675f;background:#65d5c812;border-radius:14px;padding:14px;margin:16px 0}.account strong,.account span{display:block}.account span{color:#b9b6c4;margin-top:4px}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.status{min-height:24px;color:#b9b6c4;margin-top:10px}@media(max-width:560px){.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<main class="card">
<div class="kicker">Tiny Titans · Secure account authorization</div>
<div class="brand">Connect Tiny Titans to ChatGPT</div>
<p class="muted">Sign in with the same Tiny Titans account you already use, then approve the requested access. There is no pairing code to copy or paste.</p>
${error}
<h2>ChatGPT is requesting</h2>
<ul class="permissions">${scopeLabels}</ul>

<form id="authorize-form" method="post" action="/oauth/authorize" autocomplete="off">
${hidden}
<input id="firebase_id_token" type="hidden" name="firebase_id_token" value="">
<input id="timezone" type="hidden" name="timezone" value="">

<div id="account" class="account" hidden>
  <strong id="account-name">Tiny Titans account</strong>
  <span id="account-email"></span>
</div>

<div id="login">
  <button id="google-signin" class="button" type="button">Continue with Google</button>
  <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="username"></div>
  <div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password"></div>
  <button id="email-signin" class="button secondary" type="button">Sign in with email</button>
</div>

<div id="signed-in-actions" hidden>
  <button id="allow" class="button" type="submit">Allow and connect</button>
  <button id="switch-account" class="button secondary" type="button">Use a different Tiny Titans account</button>
</div>
<button class="button secondary" type="submit" name="decision" value="deny" formnovalidate>Cancel</button>
<div id="auth-status" class="status" role="status"></div>
</form>

<p class="fine">Tiny Titans verifies your Firebase account server-side and then issues revocable, scoped OAuth credentials to ChatGPT. Your Firebase password and generic Firestore access are never shared with ChatGPT.</p>
</main>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const app = initializeApp(${firebaseConfig});
const auth = getAuth(app);
const form = document.getElementById("authorize-form");
const login = document.getElementById("login");
const account = document.getElementById("account");
const signedInActions = document.getElementById("signed-in-actions");
const accountName = document.getElementById("account-name");
const accountEmail = document.getElementById("account-email");
const status = document.getElementById("auth-status");
const tokenField = document.getElementById("firebase_id_token");
const timezoneField = document.getElementById("timezone");
const email = document.getElementById("email");
const password = document.getElementById("password");

function setStatus(message) { status.textContent = message || ""; }
function showUser(user) {
  const signedIn = Boolean(user);
  login.hidden = signedIn;
  account.hidden = !signedIn;
  signedInActions.hidden = !signedIn;
  if (user) {
    accountName.textContent = user.displayName || "Tiny Titans account";
    accountEmail.textContent = user.email || "Signed in";
    setStatus("Signed in. Review the permissions above, then allow the connection.");
  } else {
    accountName.textContent = "Tiny Titans account";
    accountEmail.textContent = "";
    setStatus("Sign in to Tiny Titans to continue.");
  }
}

onAuthStateChanged(auth, showUser);

document.getElementById("google-signin").addEventListener("click", async () => {
  try {
    setStatus("Opening Google sign-in…");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  } catch (error) {
    setStatus(error && error.message ? error.message : "Google sign-in could not be completed.");
  }
});

document.getElementById("email-signin").addEventListener("click", async () => {
  try {
    if (!email.value || !password.value) {
      setStatus("Enter your Tiny Titans email and password.");
      return;
    }
    setStatus("Signing in…");
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
  } catch (error) {
    setStatus(error && error.message ? error.message : "Email sign-in could not be completed.");
  }
});

document.getElementById("switch-account").addEventListener("click", async () => {
  try {
    await signOut(auth);
    setStatus("Choose the Tiny Titans account you want to connect.");
  } catch {
    setStatus("Tiny Titans could not switch accounts.");
  }
});

form.addEventListener("submit", async (event) => {
  if (event.submitter && event.submitter.value === "deny") return;
  event.preventDefault();
  try {
    const user = auth.currentUser;
    if (!user) {
      setStatus("Sign in to Tiny Titans before allowing the connection.");
      return;
    }
    setStatus("Authorizing Tiny Titans…");
    tokenField.value = await user.getIdToken(true);
    timezoneField.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    HTMLFormElement.prototype.submit.call(form);
  } catch (error) {
    setStatus(error && error.message ? error.message : "Tiny Titans could not authorize this connection.");
  }
});
</script>
</body>
</html>`);
}

async function findLinkConnection(linkCode) {
  const code = normaliseString(linkCode);
  if (!code.startsWith(LINK_CODE_PREFIX) || code.length < 30) return null;

  // v3 link codes route directly to the authenticated user's connection doc.
  // The route segment is not sufficient to authenticate anything: the entire
  // one-time code is still verified against the SHA-256 hash stored server-side.
  const routed = parseRoutedLinkCode(code);
  if (routed) {
    const snapshot = await connectionRef(routed.uid).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    if (!safeTimingEqual(data.linkSecretHash, tokenHash(code))) return null;
    return { snapshot, data };
  }

  // Backwards compatibility for v2 codes already issued before routed links.
  const linkPrefix = code.slice(0, 20);
  const snapshots = await db.collection("chatgptConnections").where("linkPrefix", "==", linkPrefix).limit(3).get();
  for (const snapshot of snapshots.docs) {
    const data = snapshot.data() || {};
    if (!safeTimingEqual(data.linkSecretHash, tokenHash(code))) continue;
    return { snapshot, data };
  }
  return null;
}

async function createOAuthAuthorizationCode(input, linkCode) {
  const match = await findLinkConnection(linkCode);
  if (!match) return { error: "That link code is invalid." };

  const authorizationCode = randomCredential(OAUTH_CODE_PREFIX);
  const authorizationCodeRef = oauthCollection("chatgptOauthCodes").doc(tokenHash(authorizationCode));
  const connection = match.snapshot.ref;
  const expiresAt = timestampFromNowMillis(OAUTH_CODE_TTL_MINUTES * 60_000);

  try {
    await db.runTransaction(async (transaction) => {
      const freshSnapshot = await transaction.get(connection);
      if (!freshSnapshot.exists) throw new Error("LINK_INVALID");
      const fresh = freshSnapshot.data() || {};
      if (fresh.revoked === true) throw new Error("LINK_REVOKED");
      if (fresh.linkUsedAt) throw new Error("LINK_USED");
      if (!activeFuture(fresh.linkExpiresAt)) throw new Error("LINK_EXPIRED");
      if (!safeTimingEqual(fresh.linkSecretHash, tokenHash(linkCode))) throw new Error("LINK_INVALID");

      transaction.set(authorizationCodeRef, {
        uid: freshSnapshot.id,
        clientId: input.clientId,
        redirectUri: input.redirectUri,
        scopes: input.scopes,
        resource: input.resource,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: "S256",
        generation: Number(fresh.oauthGeneration || 0),
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
        usedAt: null,
      });
      transaction.set(connection, {
        linkUsedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  } catch (error) {
    const code = String(error?.message || "");
    const message = {
      LINK_REVOKED: "That Tiny Titans connection has been revoked.",
      LINK_USED: "That link code has already been used. Generate a new one in Tiny Titans.",
      LINK_EXPIRED: "That link code has expired. Generate a new one in Tiny Titans.",
      LINK_INVALID: "That link code is invalid.",
    }[code] || "Tiny Titans could not validate that link code.";
    return { error: message };
  }

  return { authorizationCode };
}

async function createOAuthAuthorizationCodeForUid(input, uid, timezone) {
  const access = await resolveEffectiveTier(uid);
  if (!COMPANION_TIERS.has(access.tier)) {
    return { error: "ChatGPT Companion requires Titan Pro or an eligible Business/Rescue tier." };
  }

  const context = await resolveAccountContext(uid);
  if (context.sharedFamily) {
    return { error: "Connect ChatGPT from the Tiny Titans Family Owner account so write access remains safe." };
  }

  const authorizationCode = randomCredential(OAUTH_CODE_PREFIX);
  const authorizationCodeRef = oauthCollection("chatgptOauthCodes").doc(tokenHash(authorizationCode));
  const connection = connectionRef(uid);
  const expiresAt = timestampFromNowMillis(OAUTH_CODE_TTL_MINUTES * 60_000);
  const requestedTimezone = normaliseString(timezone);
  const safeTimezone = isValidTimezone(requestedTimezone) ? requestedTimezone : "UTC";
  const permissions = permissionsFromScopes(input.scopes);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(connection);
    const current = snapshot.exists ? snapshot.data() || {} : {};
    const generation = Number(current.oauthGeneration || 0) + 1;

    transaction.set(authorizationCodeRef, {
      uid,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      scopes: input.scopes,
      resource: input.resource,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: "S256",
      generation,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
    });

    transaction.set(connection, {
      uid,
      permissions,
      timezone: safeTimezone,
      revoked: false,
      revokedAt: FieldValue.delete(),
      oauthGeneration: generation,
      oauthConnectedAt: FieldValue.delete(),
      oauthRefreshExpiresAt: FieldValue.delete(),
      linkPrefix: FieldValue.delete(),
      linkCodeVersion: FieldValue.delete(),
      linkSecretHash: FieldValue.delete(),
      linkCreatedAt: FieldValue.delete(),
      linkExpiresAt: FieldValue.delete(),
      linkUsedAt: FieldValue.delete(),
      prefix: FieldValue.delete(),
      secretHash: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
      createdAt: current.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      effectiveTierAtCreation: access.tier,
      sourceAtCreation: access.source,
      connectionVersion: 3,
      authorizationMode: "firebase_oauth",
    }, { merge: true });
  });

  return { authorizationCode };
}

async function exchangeAuthorizationCode({ code, clientId, redirectUri, codeVerifier, resource }) {
  if (!code.startsWith(OAUTH_CODE_PREFIX) || code.length < 30) return { error: "invalid_grant", description: "Authorization code is invalid." };
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) return { error: "invalid_grant", description: "PKCE code_verifier is invalid." };

  const codeRef = oauthCollection("chatgptOauthCodes").doc(tokenHash(code));
  const accessToken = randomCredential(OAUTH_ACCESS_PREFIX);
  const refreshToken = randomCredential(OAUTH_REFRESH_PREFIX);
  const accessRef = oauthCollection("chatgptOauthAccessTokens").doc(tokenHash(accessToken));
  const refreshRef = oauthCollection("chatgptOauthRefreshTokens").doc(tokenHash(refreshToken));
  const accessExpiresAt = timestampFromNowMillis(OAUTH_ACCESS_TTL_MINUTES * 60_000);
  const refreshExpiresAt = timestampFromNowMillis(OAUTH_REFRESH_TTL_DAYS * 86_400_000);

  try {
    let output;
    await db.runTransaction(async (transaction) => {
      const codeSnapshot = await transaction.get(codeRef);
      if (!codeSnapshot.exists) throw new Error("CODE_INVALID");
      const authCode = codeSnapshot.data() || {};
      if (authCode.usedAt) throw new Error("CODE_USED");
      if (!activeFuture(authCode.expiresAt)) throw new Error("CODE_EXPIRED");
      if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) throw new Error("CLIENT_MISMATCH");
      if (authCode.resource !== resource || resource !== MCP_RESOURCE) throw new Error("RESOURCE_MISMATCH");
      if (!safeTimingEqual(base64UrlSha256(codeVerifier), authCode.codeChallenge)) throw new Error("PKCE_MISMATCH");

      const connection = connectionRef(authCode.uid);
      const connectionSnapshot = await transaction.get(connection);
      if (!connectionSnapshot.exists) throw new Error("CONNECTION_INVALID");
      const connectionData = connectionSnapshot.data() || {};
      if (connectionData.revoked === true) throw new Error("CONNECTION_REVOKED");
      if (Number(connectionData.oauthGeneration || 0) !== Number(authCode.generation || -1)) throw new Error("GENERATION_MISMATCH");

      const common = {
        uid: authCode.uid,
        clientId,
        scopes: authCode.scopes,
        resource,
        generation: authCode.generation,
        createdAt: FieldValue.serverTimestamp(),
        revoked: false,
      };

      transaction.set(accessRef, { ...common, expiresAt: accessExpiresAt });
      transaction.set(refreshRef, { ...common, expiresAt: refreshExpiresAt });
      transaction.set(codeRef, { usedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(connection, {
        oauthConnectedAt: FieldValue.serverTimestamp(),
        oauthRefreshExpiresAt: refreshExpiresAt,
        updatedAt: FieldValue.serverTimestamp(),
        revoked: false,
        connectionVersion: 2,
      }, { merge: true });

      output = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: OAUTH_ACCESS_TTL_MINUTES * 60,
        refresh_token: refreshToken,
        scope: authCode.scopes.join(" "),
        resource,
      };
    });
    return output;
  } catch (error) {
    const codeName = String(error?.message || "");
    const description = {
      CODE_INVALID: "Authorization code is invalid.",
      CODE_USED: "Authorization code has already been used.",
      CODE_EXPIRED: "Authorization code has expired.",
      CLIENT_MISMATCH: "OAuth client or redirect URI does not match the authorization request.",
      RESOURCE_MISMATCH: "OAuth resource does not match the authorization request.",
      PKCE_MISMATCH: "PKCE verification failed.",
      CONNECTION_INVALID: "Tiny Titans connection no longer exists.",
      CONNECTION_REVOKED: "Tiny Titans connection has been revoked.",
      GENERATION_MISMATCH: "Tiny Titans connection has been rotated. Connect the account again.",
    }[codeName] || "Authorization code could not be exchanged.";
    return { error: "invalid_grant", description };
  }
}

async function exchangeRefreshToken({ refreshToken, clientId, resource }) {
  if (!refreshToken.startsWith(OAUTH_REFRESH_PREFIX) || refreshToken.length < 30) {
    return { error: "invalid_grant", description: "Refresh token is invalid." };
  }

  const oldRefreshRef = oauthCollection("chatgptOauthRefreshTokens").doc(tokenHash(refreshToken));
  const nextAccessToken = randomCredential(OAUTH_ACCESS_PREFIX);
  const nextRefreshToken = randomCredential(OAUTH_REFRESH_PREFIX);
  const accessRef = oauthCollection("chatgptOauthAccessTokens").doc(tokenHash(nextAccessToken));
  const refreshRef = oauthCollection("chatgptOauthRefreshTokens").doc(tokenHash(nextRefreshToken));
  const accessExpiresAt = timestampFromNowMillis(OAUTH_ACCESS_TTL_MINUTES * 60_000);
  const refreshExpiresAt = timestampFromNowMillis(OAUTH_REFRESH_TTL_DAYS * 86_400_000);

  try {
    let output;
    await db.runTransaction(async (transaction) => {
      const refreshSnapshot = await transaction.get(oldRefreshRef);
      if (!refreshSnapshot.exists) throw new Error("REFRESH_INVALID");
      const stored = refreshSnapshot.data() || {};
      if (stored.revoked === true || stored.rotatedAt) throw new Error("REFRESH_REVOKED");
      if (!activeFuture(stored.expiresAt)) throw new Error("REFRESH_EXPIRED");
      if (stored.clientId !== clientId) throw new Error("CLIENT_MISMATCH");
      if (stored.resource !== resource || resource !== MCP_RESOURCE) throw new Error("RESOURCE_MISMATCH");

      const connection = connectionRef(stored.uid);
      const connectionSnapshot = await transaction.get(connection);
      if (!connectionSnapshot.exists) throw new Error("CONNECTION_INVALID");
      const connectionData = connectionSnapshot.data() || {};
      if (connectionData.revoked === true) throw new Error("CONNECTION_REVOKED");
      if (Number(connectionData.oauthGeneration || 0) !== Number(stored.generation || -1)) throw new Error("GENERATION_MISMATCH");

      const common = {
        uid: stored.uid,
        clientId: stored.clientId,
        scopes: stored.scopes,
        resource: stored.resource,
        generation: stored.generation,
        createdAt: FieldValue.serverTimestamp(),
        revoked: false,
      };

      transaction.set(oldRefreshRef, {
        revoked: true,
        rotatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(accessRef, { ...common, expiresAt: accessExpiresAt });
      transaction.set(refreshRef, { ...common, expiresAt: refreshExpiresAt });
      transaction.set(connection, {
        oauthRefreshExpiresAt: refreshExpiresAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      output = {
        access_token: nextAccessToken,
        token_type: "Bearer",
        expires_in: OAUTH_ACCESS_TTL_MINUTES * 60,
        refresh_token: nextRefreshToken,
        scope: stored.scopes.join(" "),
        resource: stored.resource,
      };
    });
    return output;
  } catch (error) {
    const name = String(error?.message || "");
    const description = {
      REFRESH_INVALID: "Refresh token is invalid.",
      REFRESH_REVOKED: "Refresh token has already been rotated or revoked.",
      REFRESH_EXPIRED: "Refresh token has expired.",
      CLIENT_MISMATCH: "OAuth client does not match this refresh token.",
      RESOURCE_MISMATCH: "OAuth resource does not match this refresh token.",
      CONNECTION_INVALID: "Tiny Titans connection no longer exists.",
      CONNECTION_REVOKED: "Tiny Titans connection has been revoked.",
      GENERATION_MISMATCH: "Tiny Titans connection has been rotated. Connect the account again.",
    }[name] || "Refresh token could not be exchanged.";
    return { error: "invalid_grant", description };
  }
}

function oauthSecurity(scopes) {
  const scheme = { type: "oauth2", scopes };
  return {
    securitySchemes: [scheme],
    _meta: { securitySchemes: [scheme] },
  };
}

const PROFILE_OUTPUT_SCHEMA = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    id: {
      type: "string",
      minLength: 1,
      pattern: "\\S",
      description: "Opaque Tiny Titans profile identifier, stable across token refresh and reconnection.",
    },
    name: { type: "string", description: "Display name for the authenticated Tiny Titans profile." },
    email: { type: "string", description: "Email address for display; not used as the profile identity." },
    nickname: { type: "string", description: "Useful label that helps distinguish connected Tiny Titans profiles." },
  },
  required: ["id"],
  additionalProperties: false,
});

function objectSchema(properties = {}, required = []) {
  return { type: "object", properties, required, additionalProperties: false };
}

function mcpToolDescriptor({
  name,
  title,
  description,
  inputSchema,
  scopes,
  readOnly = false,
  destructive = false,
  outputSchema = { type: "object", additionalProperties: true },
  profile = false,
  invoking,
  invoked,
}) {
  const auth = oauthSecurity(scopes);
  return {
    name,
    title,
    description,
    inputSchema,
    outputSchema,
    annotations: {
      readOnlyHint: readOnly,
      destructiveHint: destructive,
      openWorldHint: false,
      ...(readOnly ? {} : { idempotentHint: false }),
    },
    securitySchemes: auth.securitySchemes,
    _meta: {
      ...auth._meta,
      ...(profile ? { "openai/profile": true } : {}),
      ...(invoking ? { "openai/toolInvocation/invoking": invoking } : {}),
      ...(invoked ? { "openai/toolInvocation/invoked": invoked } : {}),
    },
  };
}

const MCP_TOOL_DESCRIPTORS = Object.freeze([
  mcpToolDescriptor({
    name: "get_profile",
    title: "Get Tiny Titans profile",
    description: "Return the Tiny Titans profile represented by the authenticated connection. Use this only to identify which keeper account is connected.",
    inputSchema: objectSchema(),
    outputSchema: PROFILE_OUTPUT_SCHEMA,
    scopes: ["animals.read"],
    readOnly: true,
    profile: true,
  }),
  mcpToolDescriptor({
    name: "list_animals",
    title: "List animals",
    description: "List animals visible to the connected Tiny Titans keeper account. Use this before guessing an animal ID.",
    inputSchema: objectSchema(),
    scopes: ["animals.read"],
    readOnly: true,
  }),
  mcpToolDescriptor({
    name: "resolve_animal",
    title: "Resolve animal",
    description: "Resolve an animal name or nickname to Tiny Titans record IDs. Use this before tracker reads or writes when the user names an animal instead of supplying an ID.",
    inputSchema: objectSchema({ query: { type: "string", minLength: 1, description: "Animal name, nickname, or partial name." } }, ["query"]),
    scopes: ["animals.read"],
    readOnly: true,
  }),
  mcpToolDescriptor({
    name: "get_animal_summary",
    title: "Get animal summary",
    description: "Read a Tiny Titans animal profile and its latest keeper-record summary.",
    inputSchema: objectSchema({ animalId: { type: "string", minLength: 1 } }, ["animalId"]),
    scopes: ["animals.read", "records.read"],
    readOnly: true,
  }),
  mcpToolDescriptor({
    name: "get_keeper_snapshot",
    title: "Get keeper snapshot",
    description: "Read several Tiny Titans animals in one call, including last successful feeding date, latest feeding attempt, current weight, feeding schedule, latest shed, behaviour and health. Prefer this for multi-animal questions such as who ate last, who has refused food, or comparing several animals.",
    inputSchema: objectSchema({
      animalNames: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 25, uniqueItems: true, description: "Exact or unambiguous animal names. Omit to return up to limit tracked animals." },
      animalIds: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 25, uniqueItems: true },
      limit: { type: "integer", minimum: 1, maximum: 25, default: 25 },
    }),
    scopes: ["animals.read", "records.read"],
    readOnly: true,
  }),
  mcpToolDescriptor({
    name: "list_reminders",
    title: "List keeper reminders",
    description: "Read Tiny Titans reminders, optionally filtered by animal, reminder kind or status.",
    inputSchema: objectSchema({
      animalNames: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 50, uniqueItems: true },
      kind: { type: "string", enum: ["weight", "feeding", "shedding", "health", "husbandry", "water-change", "custom"] },
      status: { type: "string", enum: ["active", "paused", "completed"] },
      includeCompleted: { type: "boolean", default: false },
      limit: { type: "integer", minimum: 1, maximum: 500, default: 100 },
    }),
    scopes: ["reminders.read"],
    readOnly: true,
  }),
  ...[
    ["get_feeding_history", "Get feeding history", "Read feeding history for one Tiny Titans snake."],
    ["get_weight_history", "Get weight history", "Read weight history for one Tiny Titans snake."],
    ["get_shed_history", "Get shed history", "Read shed history for one Tiny Titans snake."],
    ["get_recent_activity", "Get recent activity", "Read recent feeding, weight, shed, behaviour, and health activity for one Tiny Titans snake."],
  ].map(([name, title, description]) => mcpToolDescriptor({
    name,
    title,
    description,
    inputSchema: objectSchema({
      animalId: { type: "string", minLength: 1 },
      limit: { type: "integer", minimum: 1, maximum: name === "get_recent_activity" ? 50 : 100, default: 20 },
    }, ["animalId"]),
    scopes: ["animals.read", "records.read"],
    readOnly: true,
  })),
  mcpToolDescriptor({
    name: "log_feeding",
    title: "Log feeding",
    description: "Create a structured feeding record in Tiny Titans for the animal the user identified. This changes keeper data.",
    inputSchema: objectSchema({
      animalId: { type: "string", minLength: 1 },
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Feeding date in YYYY-MM-DD." },
      foodType: { type: "string", enum: [...FOOD_TYPES] },
      customFood: { type: "string" },
      size: { type: "string" },
      weightGrams: { type: "number", minimum: 0, maximum: 100000 },
      quantity: { type: "integer", minimum: 1, maximum: 100 },
      preyCategory: { type: "string", enum: [...PREY_CATEGORIES] },
      feedingMethod: { type: "string", enum: [...FEEDING_METHODS] },
      response: { type: "string", enum: [...FEEDING_RESPONSES], default: "Accepted" },
      notes: { type: "string" },
      idempotencyKey: { type: "string" },
    }, ["animalId", "date"]),
    scopes: ["animals.read", "records.write"],
    invoking: "Logging feeding…",
    invoked: "Feeding logged",
  }),
  mcpToolDescriptor({
    name: "log_weight",
    title: "Log weight",
    description: "Create a weight record in Tiny Titans and synchronise the animal's current weight. This changes keeper data.",
    inputSchema: objectSchema({
      animalId: { type: "string", minLength: 1 },
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      weightGrams: { type: "number", exclusiveMinimum: 0, maximum: 100000 },
      unit: { type: "string", enum: ["g", "kg"], default: "g" },
      idempotencyKey: { type: "string" },
    }, ["animalId", "date", "weightGrams"]),
    scopes: ["animals.read", "records.write"],
    invoking: "Logging weight…",
    invoked: "Weight logged",
  }),
  mcpToolDescriptor({
    name: "log_shed",
    title: "Log shed",
    description: "Create a structured shed record in Tiny Titans, including retained shed details. This changes keeper data.",
    inputSchema: objectSchema({
      animalId: { type: "string", minLength: 1 },
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      status: { type: "string", enum: [...SHED_STATUS], default: "Complete" },
      quality: { type: "string", enum: [...SHED_QUALITY], default: "Unknown" },
      assistance: { type: "string", enum: [...SHED_ASSISTANCE], default: "None" },
      retainedAreas: { type: "array", items: { type: "string", enum: ["Eye Cap", "Head", "Tail Tip", "Body", "Other"] }, uniqueItems: true },
      retainedEyeCaps: { type: "boolean" },
      retainedTailTip: { type: "boolean" },
      notes: { type: "string" },
      idempotencyKey: { type: "string" },
    }, ["animalId", "date"]),
    scopes: ["animals.read", "records.write"],
    invoking: "Logging shed…",
    invoked: "Shed logged",
  }),
  mcpToolDescriptor({
    name: "log_behaviour",
    title: "Log behaviour",
    description: "Create a keeper behaviour observation in Tiny Titans. This changes keeper data.",
    inputSchema: objectSchema({
      animalId: { type: "string", minLength: 1 },
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      observation: { type: "string", enum: [...BEHAVIOUR_OBSERVATIONS] },
      context: { type: "string", enum: [...BEHAVIOUR_CONTEXTS] },
      description: { type: "string", minLength: 1 },
      duration: { type: "string" },
      relatedChange: { type: "string" },
      notes: { type: "string" },
      idempotencyKey: { type: "string" },
    }, ["animalId", "date", "description"]),
    scopes: ["animals.read", "records.write"],
    invoking: "Logging behaviour…",
    invoked: "Behaviour logged",
  }),
  mcpToolDescriptor({
    name: "log_health_observation",
    title: "Log health observation",
    description: "Create a health or veterinary observation in Tiny Titans. This changes keeper data; it does not diagnose or prescribe treatment.",
    inputSchema: objectSchema({
      animalId: { type: "string", minLength: 1 },
      date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      eventType: { type: "string", enum: [...HEALTH_EVENT_TYPES] },
      status: { type: "string", enum: [...HEALTH_STATUSES] },
      title: { type: "string" },
      description: { type: "string", minLength: 1 },
      medication: { type: "string" },
      dosage: { type: "string" },
      vetName: { type: "string" },
      followUpDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      notes: { type: "string" },
      idempotencyKey: { type: "string" },
    }, ["animalId", "date", "description"]),
    scopes: ["animals.read", "records.write"],
    invoking: "Logging health record…",
    invoked: "Health record logged",
  }),
  mcpToolDescriptor({
    name: "create_reminders",
    title: "Create keeper reminders",
    description: "Create one-time or recurring Tiny Titans reminders for one or more animals. For a request like set a feed reminder for Mort and Haze for Monday, pass kind feeding, both names and Monday converted to YYYY-MM-DD. Omit repeatEveryDays for a one-time reminder; provide it only when the user explicitly wants a recurring cadence.",
    inputSchema: objectSchema({
      kind: { type: "string", enum: ["weight", "feeding", "shedding", "health", "husbandry", "water-change", "custom"] },
      animalNames: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 25, uniqueItems: true },
      animalIds: { type: "array", items: { type: "string", minLength: 1 }, maxItems: 25, uniqueItems: true },
      dueDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Absolute due date in YYYY-MM-DD. Convert relative wording before calling." },
      time: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", default: "09:00" },
      timezone: { type: "string", description: "IANA timezone. Omit to use the timezone captured when Tiny Titans was linked." },
      repeatEveryDays: { type: "integer", minimum: 1, maximum: 3650, description: "Only set when the user wants a recurring reminder. Omit for one-time reminders." },
      title: { type: "string" },
      description: { type: "string" },
      idempotencyKey: { type: "string" },
    }, ["kind", "dueDate"]),
    scopes: ["animals.read", "reminders.write"],
    invoking: "Creating Tiny Titans reminder…",
    invoked: "Reminder created",
  }),
  mcpToolDescriptor({
    name: "undo_last_action",
    title: "Undo last Tiny Titans action",
    description: "Undo the most recent reversible record created through this Tiny Titans ChatGPT connection. It cannot delete arbitrary keeper records.",
    inputSchema: objectSchema(),
    scopes: ["records.undo"],
    destructive: true,
    invoking: "Undoing last action…",
    invoked: "Action undone",
  }),
]);

function descriptorForTool(name) {
  return MCP_TOOL_DESCRIPTORS.find((tool) => tool.name === name) || null;
}

function requiredScopesForTool(name) {
  const descriptor = descriptorForTool(name);
  return descriptor?.securitySchemes?.[0]?.scopes || [];
}

function hasRequiredScopes(auth, required) {
  const available = new Set(Array.isArray(auth?.scopes) ? auth.scopes : []);
  return required.every((scope) => available.has(scope));
}

async function getMcpProfile(auth) {
  const snapshot = await db.collection("users").doc(auth.uid).get();
  const user = snapshot.exists ? snapshot.data() || {} : {};
  const profile = { id: `ttprf_${tokenHash(auth.uid).slice(0, 24)}` };
  const name = normaliseString(user.displayName || user.name);
  const email = normaliseString(user.email);
  const nickname = normaliseString(user.nickname);
  if (name) profile.name = name;
  if (email) profile.email = email;
  if (nickname) profile.nickname = nickname;
  return profile;
}

function authChallenge(error = "invalid_token", description = "Connect Tiny Titans to continue.") {
  return `Bearer resource_metadata="${PROTECTED_RESOURCE_METADATA}", error="${error}", error_description="${description.replace(/"/g, "'")}"`;
}

function mcpAuthError(description, error = "invalid_token") {
  return {
    content: [{ type: "text", text: description }],
    _meta: { "mcp/www_authenticate": [authChallenge(error, description)] },
    isError: true,
  };
}

function mcpResultPayload(value) {
  const structuredContent = value && typeof value === "object" ? { ...value } : { value };
  if (structuredContent.deepLink && typeof structuredContent.deepLink === "string" && structuredContent.deepLink.startsWith("/")) {
    structuredContent.deepLink = `${PUBLIC_ORIGIN}${structuredContent.deepLink}`;
  }
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: false,
  };
}

function mcpErrorPayload(error) {
  const message = error instanceof Error ? error.message : "Tiny Titans could not complete that tool call.";
  return {
    content: [{ type: "text", text: message }],
    structuredContent: {
      ok: false,
      code: error?.code || "TOOL_ERROR",
      error: message,
    },
    isError: true,
  };
}

function modernMcpRequest(request, message) {
  if (message?.method === "server/discover") return true;
  if (String(request.get("mcp-protocol-version") || "") === "2026-07-28") return true;
  return message?.params?._meta?.["io.modelcontextprotocol/protocolVersion"] === "2026-07-28";
}

function withModernResultMeta(result, modern) {
  if (!modern) return result;
  return {
    resultType: result.resultType || "complete",
    ...result,
    _meta: {
      ...(result._meta || {}),
      "io.modelcontextprotocol/serverInfo": MCP_SERVER_INFO,
    },
  };
}

function jsonRpcResult(id, result, modern = false) {
  return { jsonrpc: "2.0", id, result: withModernResultMeta(result, modern) };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

async function handleMcpMessage(request, message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return jsonRpcError(message?.id ?? null, -32600, "Invalid Request");
  }

  const id = message.id;
  const modern = modernMcpRequest(request, message);

  if (message.method === "server/discover") {
    return jsonRpcResult(id, {
      supportedVersions: ["2026-07-28"],
      capabilities: { tools: { listChanged: false } },
      instructions: MCP_INSTRUCTIONS,
      ttlMs: 300000,
      cacheScope: "public",
    }, true);
  }

  if (message.method === "initialize") {
    const requested = normaliseString(message.params?.protocolVersion);
    const protocolVersion = ["2025-11-25", "2025-06-18"].includes(requested) ? requested : "2025-11-25";
    return jsonRpcResult(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: MCP_SERVER_INFO,
      instructions: MCP_INSTRUCTIONS,
    }, false);
  }

  if (message.method === "notifications/initialized") return null;
  if (message.method === "ping") return jsonRpcResult(id, {}, modern);

  if (message.method === "tools/list") {
    const result = modern
      ? {
          tools: MCP_TOOL_DESCRIPTORS,
          ttlMs: 300000,
          cacheScope: "public",
        }
      : { tools: MCP_TOOL_DESCRIPTORS };
    return jsonRpcResult(id, result, modern);
  }

  if (message.method !== "tools/call") {
    return jsonRpcError(id, -32601, "Method not found");
  }

  const toolName = normaliseString(message.params?.name);
  const descriptor = descriptorForTool(toolName);
  if (!descriptor) return jsonRpcError(id, -32602, "Unknown Tiny Titans tool.");

  const auth = await authenticateBearer(request);
  if (!auth) {
    return jsonRpcResult(id, mcpAuthError("Connect Tiny Titans to use this tool."), modern);
  }

  const requiredScopes = requiredScopesForTool(toolName);
  if (!hasRequiredScopes(auth, requiredScopes)) {
    return jsonRpcResult(id, mcpAuthError("The Tiny Titans connection needs additional permission for this tool.", "insufficient_scope"), modern);
  }

  try {
    let data;
    if (toolName === "get_profile") {
      data = await getMcpProfile(auth);
    } else {
      const args = message.params?.arguments && typeof message.params.arguments === "object"
        ? { ...message.params.arguments }
        : {};
      data = await dispatchTool(auth, toolName, args);
    }
    await touchConnection(auth, toolName);
    return jsonRpcResult(id, mcpResultPayload(data), modern);
  } catch (error) {
    console.error("Tiny Titans MCP tool failure", {
      tool: toolName,
      code: error?.code,
      message: error?.message,
    });
    return jsonRpcResult(id, mcpErrorPayload(error), modern);
  }
}

async function handleMcpHttp(request, response) {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "authorization, content-type, mcp-protocol-version, mcp-method, mcp-name");
  response.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  response.set("Access-Control-Expose-Headers", "WWW-Authenticate");
  response.set("Cache-Control", "no-store");

  if (request.method === "OPTIONS") return response.status(204).send("");
  if (request.method === "GET") {
    return response
      .status(405)
      .set("Allow", "POST")
      .json({ error: "Tiny Titans MCP uses stateless Streamable HTTP POST requests." });
  }
  if (request.method !== "POST") return response.status(405).send("Method Not Allowed");

  const body = request.body;
  const messages = Array.isArray(body) ? body : [body];
  if (!messages.length || messages.some((message) => !message || typeof message !== "object")) {
    return response.status(400).json(jsonRpcError(null, -32700, "Parse error"));
  }

  const results = [];
  for (const message of messages) {
    const result = await handleMcpMessage(request, message);
    if (result) results.push(result);
  }

  if (!results.length) return response.status(202).send("");
  return response
    .status(200)
    .set("Content-Type", "application/json; charset=utf-8")
    .json(Array.isArray(body) ? results : results[0]);
}

function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE,
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: [...OAUTH_SCOPES],
    resource_documentation: `${PUBLIC_ORIGIN}/account/integrations/chatgpt`,
  };
}

function authorizationServerMetadata() {
  return {
    issuer: OAUTH_ISSUER,
    authorization_endpoint: `${PUBLIC_ORIGIN}/oauth/authorize`,
    token_endpoint: `${PUBLIC_ORIGIN}/oauth/token`,
    revocation_endpoint: `${PUBLIC_ORIGIN}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [...OAUTH_SCOPES],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
  };
}

async function handleOauthAuthorize(request, response) {
  const input = oauthAuthorizeInput(request);
  const validationError = validateOAuthAuthorizeInput(input);

  if (request.method === "GET") {
    if (validationError) {
      return response
        .status(400)
        .set("Cache-Control", "no-store")
        .send(`Tiny Titans OAuth request rejected: ${htmlEscape(validationError)}`);
    }
    return renderAuthorizePage(response, input);
  }

  if (request.method !== "POST") return response.status(405).send("Method Not Allowed");
  if (validationError) {
    if (validChatGptClient(input.clientId, input.redirectUri)) {
      return redirectOAuth(response, input, {
        error: "invalid_request",
        error_description: validationError,
        state: input.state,
      });
    }
    return response.status(400).send(`Tiny Titans OAuth request rejected: ${htmlEscape(validationError)}`);
  }

  const decision = oauthField(request, "decision");
  if (decision === "deny") {
    return redirectOAuth(response, input, {
      error: "access_denied",
      error_description: "The Tiny Titans connection was cancelled.",
      state: input.state,
    });
  }

  const firebaseIdToken = oauthField(request, "firebase_id_token");
  if (!firebaseIdToken) return renderAuthorizePage(response, input, "Sign in to Tiny Titans before allowing the connection.");

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(firebaseIdToken, true);
  } catch {
    return renderAuthorizePage(response, input, "Your Tiny Titans sign-in expired or could not be verified. Sign in again.");
  }

  const linked = await createOAuthAuthorizationCodeForUid(
    input,
    decodedToken.uid,
    oauthField(request, "timezone"),
  );
  if (linked.error) return renderAuthorizePage(response, input, linked.error);

  return redirectOAuth(response, input, {
    code: linked.authorizationCode,
    state: input.state,
  });
}

async function handleOauthToken(request, response) {
  if (request.method !== "POST") return oauthJson(response, 405, { error: "invalid_request", error_description: "POST required." });

  const grantType = oauthField(request, "grant_type");
  const clientId = oauthField(request, "client_id");
  const resource = oauthField(request, "resource");
  if (!clientId || !resource) {
    return oauthJson(response, 400, { error: "invalid_request", error_description: "client_id and resource are required." });
  }

  if (grantType === "authorization_code") {
    const redirectUri = oauthField(request, "redirect_uri");
    if (!validChatGptClient(clientId, redirectUri)) {
      return oauthJson(response, 400, { error: "invalid_client", error_description: "OAuth client or redirect URI is not allowed." });
    }
    const result = await exchangeAuthorizationCode({
      code: oauthField(request, "code"),
      clientId,
      redirectUri,
      codeVerifier: oauthField(request, "code_verifier"),
      resource,
    });
    if (result.error) return oauthJson(response, 400, { error: result.error, error_description: result.description });
    return oauthJson(response, 200, result);
  }

  if (grantType === "refresh_token") {
    const result = await exchangeRefreshToken({
      refreshToken: oauthField(request, "refresh_token"),
      clientId,
      resource,
    });
    if (result.error) return oauthJson(response, 400, { error: result.error, error_description: result.description });
    return oauthJson(response, 200, result);
  }

  return oauthJson(response, 400, { error: "unsupported_grant_type", error_description: "Tiny Titans supports authorization_code and refresh_token grants." });
}

async function handleOauthRevoke(request, response) {
  if (request.method !== "POST") return response.status(405).send("Method Not Allowed");
  const token = oauthField(request, "token");
  if (token) {
    const hash = tokenHash(token);
    const refs = [];
    if (token.startsWith(OAUTH_ACCESS_PREFIX)) refs.push(oauthCollection("chatgptOauthAccessTokens").doc(hash));
    if (token.startsWith(OAUTH_REFRESH_PREFIX)) refs.push(oauthCollection("chatgptOauthRefreshTokens").doc(hash));
    for (const ref of refs) {
      const snapshot = await ref.get();
      if (snapshot.exists) {
        await ref.set({ revoked: true, revokedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
  }
  return response.status(200).set("Cache-Control", "no-store").send("");
}

exports.tinyTitansMcp = onRequest({ region: "europe-west2", cors: false, timeoutSeconds: 60 }, async (request, response) => {
  const path = String(request.path || "/").replace(/\/+$/, "") || "/";
  try {
    if (path === "/.well-known/oauth-protected-resource" && request.method === "GET") {
      return oauthJson(response, 200, protectedResourceMetadata());
    }
    if (path === "/.well-known/oauth-authorization-server" && request.method === "GET") {
      return oauthJson(response, 200, authorizationServerMetadata());
    }
    if (path === "/oauth/authorize") return handleOauthAuthorize(request, response);
    if (path === "/oauth/token") return handleOauthToken(request, response);
    if (path === "/oauth/revoke") return handleOauthRevoke(request, response);
    if (path === "/mcp" || path === "/") return handleMcpHttp(request, response);
    return response.status(404).set("Cache-Control", "no-store").json({ error: "Tiny Titans MCP endpoint not found." });
  } catch (error) {
    console.error("Tiny Titans MCP/OAuth failure", {
      path,
      method: request.method,
      code: error?.code,
      message: error?.message,
    });
    return response.status(500).set("Cache-Control", "no-store").json({
      error: "server_error",
      error_description: "Tiny Titans could not complete the MCP/OAuth request.",
    });
  }
});

exports._chatgptCompanionTest = {
  TOOL_CATALOG,
  COMPANION_TIERS,
  DEFAULT_PERMISSIONS,
  MCP_TOOL_DESCRIPTORS,
  OAUTH_SCOPES,
  MCP_RESOURCE,
};
