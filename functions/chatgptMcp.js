const crypto = require("node:crypto");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { _chatgptCompanionInternal: companion } = require("./chatgptCompanion");

const db = getFirestore();

const REGION = "europe-west2";
const PROJECT_ID = "tinytitans-hoggy-companion";
const APP_ORIGIN = "https://tinytitanskeeper.web.app";
const MCP_ROOT = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/tinyTitansMcp`;
const MCP_RESOURCE = `${MCP_ROOT}/mcp`;
const OAUTH_ISSUER = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/tinyTitansOAuth`;
const AUTHORIZE_URL = `${APP_ORIGIN}/account/integrations/chatgpt/authorize`;
const CHATGPT_CLIENT_ID = "https://chatgpt.com/oauth/client.json";
const CHATGPT_REDIRECT_URI = "https://chatgpt.com/connector_platform_oauth_redirect";

const AUTH_CODE_TTL_SECONDS = 300;
const ACCESS_TOKEN_TTL_SECONDS = 3600;
const REFRESH_TOKEN_TTL_DAYS = 90;
const OAUTH_ACCESS_PREFIX = "ttoauth_";
const OAUTH_REFRESH_PREFIX = "ttrfr_";
const OAUTH_CODE_PREFIX = "ttcode_";

const SUPPORTED_SCOPES = Object.freeze([
  "profile",
  "animals.read",
  "records.read",
  "records.write",
  "actions.undo",
  "offline_access",
]);

const SCOPE_LABELS = Object.freeze({
  profile: "Identify your connected Tiny Titans profile",
  "animals.read": "Read animal names and profile basics",
  "records.read": "Read feeding, weight, shed, behaviour and health history",
  "records.write": "Create feeding, weight, shed, behaviour and health records",
  "actions.undo": "Undo records created through Tiny Titans Companion",
  offline_access: "Keep the ChatGPT connection signed in securely",
});

const TOOL_SCOPES = Object.freeze({
  get_profile: ["profile"],
  list_animals: ["animals.read"],
  resolve_animal: ["animals.read"],
  get_animal_summary: ["animals.read", "records.read"],
  get_feeding_history: ["records.read"],
  get_weight_history: ["records.read"],
  get_shed_history: ["records.read"],
  get_recent_activity: ["records.read"],
  log_feeding: ["records.write"],
  log_weight: ["records.write"],
  log_shed: ["records.write"],
  log_behaviour: ["records.write"],
  log_health_observation: ["records.write"],
  undo_last_action: ["actions.undo"],
});

function tokenHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function randomToken(prefix, bytes = 32) {
  return `${prefix}${crypto.randomBytes(bytes).toString("base64url")}`;
}

function base64UrlSha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseScope(value) {
  const requested = String(value || "").split(/\s+/).map((item) => item.trim()).filter(Boolean);
  const unique = Array.from(new Set(requested));
  if (unique.some((scope) => !SUPPORTED_SCOPES.includes(scope))) {
    throw new HttpsError("invalid-argument", "ChatGPT requested a Tiny Titans permission that is not supported.");
  }
  return unique.length ? unique : ["profile", "animals.read", "records.read"];
}

function permissionsForScopes(scopes) {
  const permissions = [];
  if (scopes.includes("animals.read")) permissions.push("read_animals");
  if (scopes.includes("records.read")) permissions.push("read_records");
  if (scopes.includes("records.write")) permissions.push("write_records");
  if (scopes.includes("actions.undo")) permissions.push("undo_own_actions");
  return permissions;
}

function requiredScopesPresent(granted, required) {
  return required.every((scope) => granted.includes(scope));
}

function oauthChallenge(requiredScopes = []) {
  const scopePart = requiredScopes.length ? `, scope="${requiredScopes.join(" ")}"` : "";
  return `Bearer resource_metadata="${MCP_ROOT}/.well-known/oauth-protected-resource"${scopePart}, error="insufficient_scope", error_description="Connect your Tiny Titans account to continue"`;
}

function mcpAuthError(requiredScopes) {
  return {
    content: [{ type: "text", text: "Connect your Tiny Titans account to use this tool." }],
    _meta: { "mcp/www_authenticate": [oauthChallenge(requiredScopes)] },
    isError: true,
  };
}

function textResult(data, summary) {
  return {
    content: [{ type: "text", text: summary || JSON.stringify(data) }],
    structuredContent: data,
    isError: false,
  };
}

function errorResult(error) {
  return {
    content: [{
      type: "text",
      text: error instanceof Error ? error.message : "Tiny Titans could not complete that action.",
    }],
    isError: true,
  };
}

function formBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) return request.body;
  const raw = Buffer.isBuffer(request.rawBody)
    ? request.rawBody.toString("utf8")
    : typeof request.body === "string"
      ? request.body
      : "";
  return Object.fromEntries(new URLSearchParams(raw));
}

function sendJson(response, status, payload) {
  response.status(status).set({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  }).json(payload);
}

function validateAuthorizeRequest(input) {
  const responseType = String(input.responseType || input.response_type || "");
  const clientId = String(input.clientId || input.client_id || "");
  const redirectUri = String(input.redirectUri || input.redirect_uri || "");
  const codeChallenge = String(input.codeChallenge || input.code_challenge || "");
  const codeChallengeMethod = String(input.codeChallengeMethod || input.code_challenge_method || "");
  const resource = String(input.resource || "");
  const state = String(input.state || "");
  const scopes = parseScope(input.scope);

  if (responseType !== "code") throw new HttpsError("invalid-argument", "Tiny Titans only supports the OAuth authorization-code flow.");
  if (clientId !== CHATGPT_CLIENT_ID) throw new HttpsError("permission-denied", "This authorization request is not from the supported ChatGPT client.");
  if (redirectUri !== CHATGPT_REDIRECT_URI) throw new HttpsError("permission-denied", "The ChatGPT redirect URI is not approved for Tiny Titans.");
  if (resource !== MCP_RESOURCE) throw new HttpsError("invalid-argument", "The OAuth resource does not match the Tiny Titans MCP server.");
  if (codeChallengeMethod !== "S256") throw new HttpsError("invalid-argument", "PKCE S256 is required.");
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) throw new HttpsError("invalid-argument", "The PKCE code challenge is invalid.");
  if (!state || state.length > 2048) throw new HttpsError("invalid-argument", "The OAuth state value is missing or invalid.");

  return { clientId, redirectUri, codeChallenge, resource, state, scopes };
}

exports.getChatGPTCompanionLinkInfo = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  await companion.requireCompanionAccess(request.auth.uid);
  return {
    success: true,
    mcpUrl: MCP_RESOURCE,
    authorizationUrl: AUTHORIZE_URL,
    chatgptUrl: "https://chatgpt.com/",
    scopes: SUPPORTED_SCOPES.map((scope) => ({ scope, label: SCOPE_LABELS[scope] })),
    authMode: "oauth_2_1_pkce",
  };
});

exports.approveChatGPTCompanionAuthorization = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in to Tiny Titans before approving ChatGPT.");
  const uid = request.auth.uid;
  await companion.requireCompanionAccess(uid);
  const context = await companion.resolveAccountContext(uid);
  if (context.sharedFamily) {
    throw new HttpsError("failed-precondition", "Connect ChatGPT from the Tiny Titans Family Owner account so write permissions remain safe.");
  }

  const authRequest = validateAuthorizeRequest(request.data || {});
  const code = randomToken(OAUTH_CODE_PREFIX, 32);
  const codeRef = db.collection("chatgptOAuthCodes").doc(tokenHash(code));
  const expiresAt = Timestamp.fromMillis(Date.now() + AUTH_CODE_TTL_SECONDS * 1000);

  await codeRef.set({
    uid,
    clientId: authRequest.clientId,
    redirectUri: authRequest.redirectUri,
    codeChallenge: authRequest.codeChallenge,
    codeChallengeMethod: "S256",
    resource: authRequest.resource,
    scopes: authRequest.scopes,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  const callback = new URL(authRequest.redirectUri);
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", authRequest.state);
  callback.searchParams.set("iss", OAUTH_ISSUER);

  return {
    success: true,
    redirectUrl: callback.toString(),
    scopes: authRequest.scopes,
  };
});

async function resolveAccessToken(request) {
  const header = String(request.get("authorization") || "");
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token.startsWith(OAUTH_ACCESS_PREFIX)) return null;

  const ref = db.collection("chatgptOAuthAccessTokens").doc(tokenHash(token));
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  if (data.revoked === true || data.resource !== MCP_RESOURCE) return null;
  if (!data.expiresAt || data.expiresAt.toMillis() <= Date.now()) return null;

  const access = await companion.resolveEffectiveTier(data.uid);
  if (!companion.COMPANION_TIERS.has(access.tier)) return null;

  const scopes = Array.isArray(data.scopes) ? data.scopes : [];
  return {
    uid: data.uid,
    scopes,
    permissions: permissionsForScopes(scopes),
    access,
    context: await companion.resolveAccountContext(data.uid),
    ref: companion.connectionRef(data.uid),
    oauthTokenRef: ref,
  };
}

async function issueTokens({ uid, scopes, clientId, resource, refreshTokenId = null }) {
  const accessToken = randomToken(OAUTH_ACCESS_PREFIX, 32);
  const refreshToken = randomToken(OAUTH_REFRESH_PREFIX, 40);
  const accessExpiresAt = Timestamp.fromMillis(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000);
  const refreshExpiresAt = Timestamp.fromMillis(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400000);

  const accessRef = db.collection("chatgptOAuthAccessTokens").doc(tokenHash(accessToken));
  const refreshRef = db.collection("chatgptOAuthRefreshTokens").doc(tokenHash(refreshToken));
  const batch = db.batch();

  batch.set(accessRef, {
    uid,
    scopes,
    clientId,
    resource,
    revoked: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: accessExpiresAt,
  });

  batch.set(refreshRef, {
    uid,
    scopes,
    clientId,
    resource,
    revoked: false,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: refreshExpiresAt,
    rotatedFrom: refreshTokenId,
  });

  batch.set(companion.connectionRef(uid), {
    uid,
    permissions: permissionsForScopes(scopes),
    oauthScopes: scopes,
    oauthConnected: true,
    oauthRevoked: false,
    oauthConnectedAt: FieldValue.serverTimestamp(),
    oauthLastTokenAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    connectionVersion: 2,
  }, { merge: true });

  await batch.commit();

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: scopes.join(" "),
  };
}

async function exchangeAuthorizationCode(body) {
  const code = String(body.code || "");
  const clientId = String(body.client_id || "");
  const redirectUri = String(body.redirect_uri || "");
  const codeVerifier = String(body.code_verifier || "");
  const resource = String(body.resource || "");

  if (!code.startsWith(OAUTH_CODE_PREFIX) || !codeVerifier) {
    const error = new Error("The authorization code or PKCE verifier is missing.");
    error.oauthCode = "invalid_grant";
    throw error;
  }

  const ref = db.collection("chatgptOAuthCodes").doc(tokenHash(code));
  let grant;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      const error = new Error("The authorization code is invalid.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    const data = snapshot.data() || {};
    if (data.used === true || !data.expiresAt || data.expiresAt.toMillis() <= Date.now()) {
      const error = new Error("The authorization code has expired or was already used.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    if (data.clientId !== clientId || data.redirectUri !== redirectUri || data.resource !== resource) {
      const error = new Error("The authorization request does not match the original grant.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    if (!safeEqual(data.codeChallenge, base64UrlSha256(codeVerifier))) {
      const error = new Error("PKCE verification failed.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    transaction.set(ref, { used: true, usedAt: FieldValue.serverTimestamp() }, { merge: true });
    grant = data;
  });

  await companion.requireCompanionAccess(grant.uid);
  return issueTokens({
    uid: grant.uid,
    scopes: grant.scopes,
    clientId: grant.clientId,
    resource: grant.resource,
  });
}

async function exchangeRefreshToken(body) {
  const refreshToken = String(body.refresh_token || "");
  const clientId = String(body.client_id || "");
  const resource = String(body.resource || MCP_RESOURCE);
  if (!refreshToken.startsWith(OAUTH_REFRESH_PREFIX)) {
    const error = new Error("The refresh token is invalid.");
    error.oauthCode = "invalid_grant";
    throw error;
  }

  const ref = db.collection("chatgptOAuthRefreshTokens").doc(tokenHash(refreshToken));
  let grant;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      const error = new Error("The refresh token is invalid.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    const data = snapshot.data() || {};
    if (data.revoked === true || !data.expiresAt || data.expiresAt.toMillis() <= Date.now()) {
      const error = new Error("The refresh token has expired or was revoked.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    if (data.clientId !== clientId || data.resource !== resource) {
      const error = new Error("The refresh token is not valid for this client or resource.");
      error.oauthCode = "invalid_grant";
      throw error;
    }
    transaction.set(ref, { revoked: true, revokedAt: FieldValue.serverTimestamp(), rotated: true }, { merge: true });
    grant = data;
  });

  await companion.requireCompanionAccess(grant.uid);
  return issueTokens({
    uid: grant.uid,
    scopes: grant.scopes,
    clientId: grant.clientId,
    resource: grant.resource,
    refreshTokenId: ref.id,
  });
}

exports.tinyTitansOAuth = onRequest({ region: REGION, cors: false, timeoutSeconds: 60 }, async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Headers", "authorization, content-type");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return response.status(204).send("");

  const path = String(request.path || "/").replace(/\/+$/, "") || "/";

  if (request.method === "GET" && (path === "/.well-known/oauth-authorization-server" || path === "/.well-known/openid-configuration")) {
    return sendJson(response, 200, {
      issuer: OAUTH_ISSUER,
      authorization_response_iss_parameter_supported: true,
      authorization_endpoint: AUTHORIZE_URL,
      token_endpoint: `${OAUTH_ISSUER}/oauth/token`,
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      scopes_supported: SUPPORTED_SCOPES,
    });
  }

  if (request.method === "POST" && path === "/oauth/token") {
    const body = formBody(request);
    try {
      if (String(body.client_id || "") !== CHATGPT_CLIENT_ID) {
        return sendJson(response, 401, { error: "invalid_client", error_description: "Unsupported OAuth client." });
      }
      const grantType = String(body.grant_type || "");
      const tokens = grantType === "authorization_code"
        ? await exchangeAuthorizationCode(body)
        : grantType === "refresh_token"
          ? await exchangeRefreshToken(body)
          : null;
      if (!tokens) return sendJson(response, 400, { error: "unsupported_grant_type" });
      return sendJson(response, 200, tokens);
    } catch (error) {
      console.error("Tiny Titans OAuth token exchange failed", error);
      return sendJson(response, 400, {
        error: error?.oauthCode || "invalid_grant",
        error_description: error instanceof Error ? error.message : "Token exchange failed.",
      });
    }
  }

  return sendJson(response, 404, { error: "not_found" });
});

function authScheme(scopes) {
  return [{ type: "oauth2", scopes }];
}

function toolMeta(scopes, extra = {}) {
  return {
    securitySchemes: authScheme(scopes),
    ...extra,
  };
}

function registerTool(server, auth, z, name, config, handler) {
  const scopes = TOOL_SCOPES[name] || [];
  server.registerTool(name, {
    ...config,
    securitySchemes: authScheme(scopes),
    _meta: toolMeta(scopes, config._meta || {}),
  }, async (args) => {
    if (!auth || !requiredScopesPresent(auth.scopes, scopes)) return mcpAuthError(scopes);
    try {
      const data = await handler(args);
      await companion.touchConnection(auth, name);
      return textResult(data);
    } catch (error) {
      console.error(`Tiny Titans MCP tool failed: ${name}`, error);
      return errorResult(error);
    }
  });
}

async function createMcpServer(auth) {
  const [{ McpServer }, { z }] = await Promise.all([
    import("@modelcontextprotocol/sdk/server/mcp.js"),
    import("zod"),
  ]);

  const server = new McpServer(
    { name: "tiny-titans-keeper-companion", version: "1.0.0" },
    {
      instructions: "Use resolve_animal before an animal-specific tool when the user supplied a name but no Tiny Titans animal ID. Never guess an animal ID. Read tools may be used directly. For writes, preserve the user's stated date, quantities and observations; do not invent husbandry facts.",
    },
  );

  registerTool(server, auth, z, "get_profile", {
    title: "Get Tiny Titans profile",
    description: "Use this to identify the Tiny Titans profile connected to the current ChatGPT account.",
    inputSchema: {},
    outputSchema: {
      id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      nickname: z.string().optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { "openai/profile": true },
  }, async () => {
    const user = auth.access.user || {};
    const profile = { id: `tinytitans:${auth.uid}` };
    if (String(user.displayName || "").trim()) profile.name = String(user.displayName).trim();
    if (String(user.email || "").trim()) profile.email = String(user.email).trim();
    if (String(user.keeperName || "").trim()) profile.nickname = String(user.keeperName).trim();
    return profile;
  });

  registerTool(server, auth, z, "list_animals", {
    title: "List Tiny Titans animals",
    description: "Use this when the user wants to see, identify or choose animals in their Tiny Titans collection.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async () => companion.dispatchTool(auth, "list_animals", {}));

  registerTool(server, auth, z, "resolve_animal", {
    title: "Resolve animal name",
    description: "Use this before another animal-specific tool when the user names an animal but no Tiny Titans animal ID is known. If the result requires disambiguation, ask the user which animal they meant.",
    inputSchema: { query: z.string().min(1) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "resolve_animal", args));

  const historySchema = {
    animalId: z.string().min(1),
    limit: z.number().int().min(1).max(100).optional(),
  };

  registerTool(server, auth, z, "get_animal_summary", {
    title: "Get animal summary",
    description: "Use this when the user asks for a Tiny Titans animal profile, current status or recent keeper-record summary.",
    inputSchema: { animalId: z.string().min(1) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "get_animal_summary", args));

  for (const [name, title, description] of [
    ["get_feeding_history", "Get feeding history", "Use this when the user asks about an animal's feeding history, refusals, prey or feeding dates."],
    ["get_weight_history", "Get weight history", "Use this when the user asks about an animal's weights, growth or weight trend records."],
    ["get_shed_history", "Get shed history", "Use this when the user asks about an animal's shed history or previous shed quality."],
    ["get_recent_activity", "Get recent animal activity", "Use this when the user asks what has recently been logged for one animal across feeding, weight, shed, behaviour and health."],
  ]) {
    registerTool(server, auth, z, name, {
      title,
      description,
      inputSchema: historySchema,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    }, async (args) => companion.dispatchTool(auth, name, args));
  }

  registerTool(server, auth, z, "log_feeding", {
    title: "Log feeding",
    description: "Use this when the user explicitly asks to record a feeding, refusal, partial feed or regurgitation in Tiny Titans. Resolve the animal first and do not invent missing details.",
    inputSchema: {
      animalId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      foodType: z.string().min(1),
      customFood: z.string().optional(),
      foodDescription: z.string().optional(),
      size: z.string().optional(),
      weightGrams: z.number().min(0).max(100000).optional(),
      quantity: z.number().int().min(1).max(100).optional(),
      preyCategory: z.string().optional(),
      feedingMethod: z.string().optional(),
      response: z.string().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "log_feeding", args));

  registerTool(server, auth, z, "log_weight", {
    title: "Log weight",
    description: "Use this when the user explicitly asks to record an animal weight in Tiny Titans. Resolve the animal first. Do not create a second weight for the same date.",
    inputSchema: {
      animalId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      weightGrams: z.number().positive().max(100000),
      unit: z.enum(["g", "kg"]).optional(),
      idempotencyKey: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "log_weight", args));

  registerTool(server, auth, z, "log_shed", {
    title: "Log shed",
    description: "Use this when the user explicitly asks to record a completed shed in Tiny Titans, including shed quality and retained areas when stated.",
    inputSchema: {
      animalId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.string().optional(),
      quality: z.string().optional(),
      assistance: z.string().optional(),
      retainedAreas: z.array(z.string()).optional(),
      retainedEyeCaps: z.boolean().optional(),
      retainedTailTip: z.boolean().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "log_shed", args));

  registerTool(server, auth, z, "log_behaviour", {
    title: "Log behaviour",
    description: "Use this when the user explicitly asks to record a behaviour observation for an animal in Tiny Titans.",
    inputSchema: {
      animalId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      observation: z.string().optional(),
      context: z.string().optional(),
      description: z.string().min(1),
      duration: z.string().optional(),
      relatedChange: z.string().optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "log_behaviour", args));

  registerTool(server, auth, z, "log_health_observation", {
    title: "Log health observation",
    description: "Use this when the user explicitly asks to record a health observation, vet visit, medication, illness or injury in Tiny Titans. Record only what the user supplied; do not diagnose.",
    inputSchema: {
      animalId: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      eventType: z.string().optional(),
      status: z.string().optional(),
      title: z.string().optional(),
      description: z.string().min(1),
      medication: z.string().optional(),
      dosage: z.string().optional(),
      vetName: z.string().optional(),
      followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      notes: z.string().optional(),
      idempotencyKey: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args) => companion.dispatchTool(auth, "log_health_observation", args));

  registerTool(server, auth, z, "undo_last_action", {
    title: "Undo last Companion action",
    description: "Use this only when the user explicitly asks to undo the most recent reversible record created through Tiny Titans Companion.",
    inputSchema: {},
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async () => companion.dispatchTool(auth, "undo_last_action", {}));

  return server;
}

function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE,
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: SUPPORTED_SCOPES,
    resource_documentation: `${APP_ORIGIN}/account/integrations/chatgpt`,
  };
}

exports.tinyTitansMcp = onRequest({ region: REGION, cors: false, timeoutSeconds: 60 }, async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  response.set("Access-Control-Allow-Headers", "authorization, content-type, mcp-session-id, mcp-protocol-version");
  response.set("Access-Control-Expose-Headers", "Mcp-Session-Id, WWW-Authenticate, Mcp-Protocol-Version");

  if (request.method === "OPTIONS") return response.status(204).send("");

  const path = String(request.path || "/").replace(/\/+$/, "") || "/";
  if (request.method === "GET" && (path === "/.well-known/oauth-protected-resource" || path === "/mcp/.well-known/oauth-protected-resource")) {
    return sendJson(response, 200, protectedResourceMetadata());
  }
  if (request.method === "GET" && path === "/") {
    return sendJson(response, 200, {
      ok: true,
      service: "Tiny Titans Keeper Companion MCP",
      mcp: MCP_RESOURCE,
      oauth: OAUTH_ISSUER,
    });
  }
  if (path !== "/mcp") return sendJson(response, 404, { error: "not_found" });

  const auth = await resolveAccessToken(request);
  const server = await createMcpServer(auth);
  const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  response.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    console.error("Tiny Titans MCP request failed", error);
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: "2.0",
        id: request.body?.id ?? null,
        error: { code: -32603, message: "Tiny Titans MCP internal error" },
      });
    }
  }
});

exports._chatgptMcpTest = {
  MCP_RESOURCE,
  OAUTH_ISSUER,
  AUTHORIZE_URL,
  CHATGPT_CLIENT_ID,
  CHATGPT_REDIRECT_URI,
  SUPPORTED_SCOPES,
  TOOL_SCOPES,
};
