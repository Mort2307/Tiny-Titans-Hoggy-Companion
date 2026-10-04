const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const PUBLIC_ORIGIN = "https://tinytitanskeeper.web.app";
const GATEWAY_ENDPOINT = `${PUBLIC_ORIGIN}/api/device-gateway`;
const KEY_PREFIX = "ttdg_";
const MAX_BODY_BYTES = 32 * 1024;
const MAX_DEVICES_RETURNED = 100;
const ALLOWED_SOURCES = new Set(["home_assistant", "mqtt", "esphome", "node_red", "custom"]);
const NUMBER_FIELDS = Object.freeze({
  temperatureC: [-50, 100],
  humidityPct: [0, 100],
  batteryPct: [0, 100],
  powerW: [0, 100000],
  lightLux: [0, 10000000],
  co2Ppm: [0, 100000],
  pressureHpa: [100, 2000],
  waterLevelPct: [0, 100],
});
const BOOLEAN_FIELDS = new Set(["switchState", "heatSourceState", "lightState", "fanState"]);

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}
function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
function gatewayKey() {
  return `${KEY_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
}
function stringValue(value, field, maxLength, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${field} is required.`);
  if (result.length > maxLength) throw new Error(`${field} is too long.`);
  return result;
}
function timestampMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (Number.isFinite(Number(value))) return Number(value);
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
function safeSource(value) {
  const source = String(value || "custom").trim().toLowerCase();
  if (!ALLOWED_SOURCES.has(source)) throw new Error("source must be home_assistant, mqtt, esphome, node_red, or custom.");
  return source;
}
function validateMetrics(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("metrics must be an object.");
  const metrics = {};
  for (const [field, range] of Object.entries(NUMBER_FIELDS)) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === "") continue;
    const value = Number(raw[field]);
    if (!Number.isFinite(value) || value < range[0] || value > range[1]) throw new Error(`${field} is outside its accepted range.`);
    metrics[field] = value;
  }
  for (const field of BOOLEAN_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) continue;
    if (typeof raw[field] !== "boolean") throw new Error(`${field} must be true or false.`);
    metrics[field] = raw[field];
  }
  if (!Object.keys(metrics).length) throw new Error("At least one supported metric is required.");
  return metrics;
}
function keyFromRequest(req) {
  const authorization = String(req.headers.authorization || "");
  if (/^Bearer\s+/i.test(authorization)) return authorization.replace(/^Bearer\s+/i, "").trim();
  return String(req.headers["x-tinytitans-key"] || "").trim();
}
function deviceDocumentId(uid, deviceId) {
  return hashSecret(`${uid}|${deviceId}`).slice(0, 48);
}
function json(res, status, body) {
  res.set("Cache-Control", "no-store");
  return res.status(status).json(body);
}

exports.getIntegrationHubStatus = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireAuth(request);
  const statusRef = db.collection("integrationUserStatus").doc(uid);
  const [statusSnapshot, devicesSnapshot, tokenSnapshot] = await Promise.all([
    statusRef.get(),
    db.collection("integrationDevices").where("uid", "==", uid).limit(MAX_DEVICES_RETURNED).get(),
    db.collection("users").doc(uid).collection("notificationTokens").where("enabled", "==", true).get(),
  ]);
  const status = statusSnapshot.data() || {};
  const devices = devicesSnapshot.docs.map((item) => {
    const data = item.data() || {};
    return {
      id: item.id,
      deviceId: String(data.deviceId || ""),
      name: String(data.name || data.deviceId || "Connected device"),
      source: String(data.source || "custom"),
      enclosureId: String(data.enclosureId || ""),
      animalId: String(data.animalId || ""),
      metrics: data.metrics || {},
      lastSeenAt: timestampMillis(data.lastSeenAt),
      firstSeenAt: timestampMillis(data.firstSeenAt),
      readingCount: Number(data.readingCount || 0),
    };
  }).sort((a, b) => Number(b.lastSeenAt || 0) - Number(a.lastSeenAt || 0));
  return {
    policy: {
      mode: "zero-cost",
      thirdPartyBudgetGbpMonthly: 0,
      paidProvidersEnabled: false,
      meteredProvidersEnabled: false,
      statement: "No optional paid APIs or metered third-party integrations are enabled.",
    },
    gateway: {
      enabled: status.gatewayEnabled === true,
      keySuffix: String(status.keySuffix || ""),
      createdAt: timestampMillis(status.gatewayCreatedAt),
      lastUsedAt: timestampMillis(status.gatewayLastUsedAt),
      endpoint: GATEWAY_ENDPOINT,
    },
    push: {
      enabledDeviceCount: tokenSnapshot.size,
      available: true,
    },
    devices,
    providers: [
      { id: "device_gateway", name: "Tiny Titans Device Gateway", cost: "free", status: status.gatewayEnabled === true ? "connected" : "available" },
      { id: "home_assistant", name: "Home Assistant", cost: "free", status: status.gatewayEnabled === true ? "ready" : "available" },
      { id: "mqtt", name: "MQTT", cost: "free", status: status.gatewayEnabled === true ? "ready" : "available" },
      { id: "esphome", name: "ESPHome", cost: "free", status: status.gatewayEnabled === true ? "ready" : "available" },
      { id: "node_red", name: "Node-RED", cost: "free", status: status.gatewayEnabled === true ? "ready" : "available" },
      { id: "calendar_ics", name: "ICS Calendar Export", cost: "free", status: "available" },
      { id: "push", name: "Tiny Titans Push Notifications", cost: "free", status: tokenSnapshot.size > 0 ? "connected" : "available" },
    ],
  };
});

exports.createIntegrationGatewayKey = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireAuth(request);
  const label = stringValue(request.data?.label || "My keeper gateway", "label", 80);
  const statusRef = db.collection("integrationUserStatus").doc(uid);
  const current = await statusRef.get();
  const oldHash = String(current.data()?.gatewayKeyHash || "");
  const secret = gatewayKey();
  const digest = hashSecret(secret);
  const batch = db.batch();
  if (oldHash) batch.set(db.collection("integrationGatewayKeys").doc(oldHash), { active: false, revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(db.collection("integrationGatewayKeys").doc(digest), {
    uid,
    label,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
    requestCount: 0,
  });
  batch.set(statusRef, {
    uid,
    gatewayEnabled: true,
    gatewayKeyHash: digest,
    keySuffix: secret.slice(-6),
    gatewayLabel: label,
    gatewayCreatedAt: FieldValue.serverTimestamp(),
    gatewayLastUsedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return {
    key: secret,
    endpoint: GATEWAY_ENDPOINT,
    keySuffix: secret.slice(-6),
    message: "This gateway key is shown once. Store it only in the device or bridge that will send telemetry.",
  };
});

exports.revokeIntegrationGatewayKey = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireAuth(request);
  const statusRef = db.collection("integrationUserStatus").doc(uid);
  const current = await statusRef.get();
  const keyHash = String(current.data()?.gatewayKeyHash || "");
  const batch = db.batch();
  if (keyHash) batch.set(db.collection("integrationGatewayKeys").doc(keyHash), { active: false, revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(statusRef, {
    gatewayEnabled: false,
    gatewayKeyHash: FieldValue.delete(),
    keySuffix: "",
    gatewayRevokedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return { success: true };
});

exports.getIntegrationTelemetry = onCall({ region: "europe-west2" }, async (request) => {
  const uid = requireAuth(request);
  const deviceId = stringValue(request.data?.deviceId, "deviceId", 80, true);
  const requestedLimit = Number(request.data?.limit || 100);
  const limit = Math.max(1, Math.min(250, Number.isFinite(requestedLimit) ? Math.round(requestedLimit) : 100));
  const deviceKey = deviceDocumentId(uid, deviceId);
  const snapshot = await db.collection("integrationTelemetry")
    .where("uid", "==", uid)
    .where("deviceKey", "==", deviceKey)
    .orderBy("recordedAt", "desc")
    .limit(limit)
    .get();
  return {
    deviceId,
    readings: snapshot.docs.map((item) => {
      const data = item.data() || {};
      return {
        id: item.id,
        recordedAt: timestampMillis(data.recordedAt),
        sourceTimestamp: String(data.sourceTimestamp || ""),
        metrics: data.metrics || {},
      };
    }),
  };
});

exports.deviceGatewayIngest = onRequest({ region: "europe-west2", invoker: "public", cors: false }, async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });
  if (req.rawBody && req.rawBody.length > MAX_BODY_BYTES) return json(res, 413, { error: "Payload too large." });
  const suppliedKey = keyFromRequest(req);
  if (!suppliedKey || !suppliedKey.startsWith(KEY_PREFIX) || suppliedKey.length < 30) return json(res, 401, { error: "A valid Tiny Titans gateway key is required." });

  const digest = hashSecret(suppliedKey);
  const keyRef = db.collection("integrationGatewayKeys").doc(digest);
  const keySnapshot = await keyRef.get();
  const keyRecord = keySnapshot.data() || {};
  if (!keySnapshot.exists || keyRecord.active !== true || !keyRecord.uid) return json(res, 401, { error: "Gateway key is invalid or revoked." });

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const uid = String(keyRecord.uid);
    const deviceId = stringValue(body.deviceId, "deviceId", 80, true);
    if (!/^[A-Za-z0-9._:-]+$/.test(deviceId)) throw new Error("deviceId may only contain letters, numbers, dot, underscore, colon and hyphen.");
    const source = safeSource(body.source);
    const name = stringValue(body.name || deviceId, "name", 100);
    const enclosureId = stringValue(body.enclosureId, "enclosureId", 100);
    const animalId = stringValue(body.animalId, "animalId", 100);
    const metrics = validateMetrics(body.metrics);
    const sourceTimestamp = body.timestamp ? new Date(String(body.timestamp)) : new Date();
    if (!Number.isFinite(sourceTimestamp.getTime())) throw new Error("timestamp must be a valid ISO date.");
    if (sourceTimestamp.getTime() > Date.now() + 5 * 60 * 1000) throw new Error("timestamp cannot be more than five minutes in the future.");
    if (sourceTimestamp.getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000) throw new Error("timestamp cannot be more than seven days old.");

    const deviceKey = deviceDocumentId(uid, deviceId);
    const deviceRef = db.collection("integrationDevices").doc(deviceKey);
    const telemetryRef = db.collection("integrationTelemetry").doc();
    const statusRef = db.collection("integrationUserStatus").doc(uid);
    const deviceSnapshot = await deviceRef.get();
    const batch = db.batch();
    batch.set(deviceRef, {
      uid,
      deviceId,
      name,
      source,
      enclosureId: enclosureId || null,
      animalId: animalId || null,
      metrics,
      lastSeenAt: FieldValue.serverTimestamp(),
      sourceTimestamp: sourceTimestamp.toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(deviceSnapshot.exists ? {} : { firstSeenAt: FieldValue.serverTimestamp() }),
      readingCount: FieldValue.increment(1),
    }, { merge: true });
    batch.set(telemetryRef, {
      uid,
      deviceKey,
      deviceId,
      source,
      enclosureId: enclosureId || null,
      animalId: animalId || null,
      metrics,
      sourceTimestamp: sourceTimestamp.toISOString(),
      recordedAt: FieldValue.serverTimestamp(),
    });
    batch.set(keyRef, { lastUsedAt: FieldValue.serverTimestamp(), requestCount: FieldValue.increment(1) }, { merge: true });
    batch.set(statusRef, { gatewayLastUsedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await batch.commit();

    return json(res, 202, {
      accepted: true,
      deviceId,
      source,
      metricCount: Object.keys(metrics).length,
    });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Invalid telemetry payload." });
  }
});
