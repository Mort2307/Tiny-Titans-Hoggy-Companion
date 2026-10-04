import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type ChatGPTCompanionPermission =
  | "read_animals"
  | "read_records"
  | "write_records"
  | "undo_own_actions"
  | "read_reminders"
  | "write_reminders";

export type ChatGPTCompanionStatus = {
  available: boolean;
  connected: boolean;
  prepared: boolean;
  upgradeRequired: boolean;
  revoked: boolean;
  expired: boolean;
  linkExpired: boolean;
  effectiveTier: string;
  source: string;
  permissions: ChatGPTCompanionPermission[];
  connectedAt?: unknown;
  expiresAt?: unknown;
  linkExpiresAt?: unknown;
  lastUsedAt?: unknown;
  lastTool?: string | null;
  mcpServer: string;
  connectionVersion: number;
  timezone: string;
};

export type ChatGPTCompanionConnection = {
  linkCode: string;
  token?: string;
  tokenShownOnce: boolean;
  linkExpiresAt: string;
  expiresAt?: string;
  permissions: ChatGPTCompanionPermission[];
  mcpServer: string;
  apiBase: string;
  timezone?: string;
};

export type ChatGPTCompanionActivity = {
  id: string;
  tool: string | null;
  animalId: string | null;
  animalName: string | null;
  recordId: string | null;
  summary: string | null;
  reversible: boolean;
  createdAt?: unknown;
  undoneAt?: unknown;
};

const functions = getFunctions(app, "europe-west2");

export type ChatGPTCompanionServerCheck = { ready: boolean; message: string; toolCount: number };

/** Public discovery only: never sends the keeper link code or Firebase token. */
export async function checkChatGPTCompanionServer(): Promise<ChatGPTCompanionServerCheck> {
  const base = "https://tinytitanskeeper.web.app";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    async function readJson(path: string, body?: object) {
      const response = await fetch(`${base}${path}`, {
        method: body ? "POST" : "GET", cache: "no-store", signal: controller.signal,
        headers: { Accept: "application/json, text/event-stream", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The Tiny Titans connection server is unavailable or its routes are not deployed. Please try again or contact Tiny Titans support.");
      }
      return response.json();
    }
    const [resource, authorization, discovery] = await Promise.all([
      readJson("/.well-known/oauth-protected-resource/mcp"),
      readJson("/.well-known/oauth-authorization-server"),
      readJson("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" }),
    ]);
    const names = new Set<string>((discovery.result?.tools || []).map((tool: { name: string }) => tool.name));
    const required = ["get_profile", "list_animals", "resolve_animal", "get_animal_summary", "get_keeper_snapshot", "get_feeding_history", "get_weight_history", "get_shed_history", "get_recent_activity", "list_reminders", "log_feeding", "log_weight", "log_shed", "log_behaviour", "log_health_observation", "create_reminders", "undo_last_action"];
    if (resource.resource !== `${base}/mcp` || authorization.issuer !== base || !authorization.code_challenge_methods_supported?.includes("S256") || !required.every((name) => names.has(name))) {
      throw new Error("The connection server has an incomplete update. Tiny Titans support needs to deploy the current connection functions and website together.");
    }
    return { ready: true, toolCount: names.size, message: `Connection server ready. ${names.size} keeper commands available. Your account still needs to be authorized in ChatGPT.` };
  } catch (error) {
    return { ready: false, toolCount: 0, message: error instanceof Error && error.name !== "AbortError" ? error.message : "The connection check timed out. Check your connection and try again." };
  } finally {
    clearTimeout(timeout);
  }
}

const statusCall = httpsCallable<undefined, { success: boolean } & ChatGPTCompanionStatus>(
  functions,
  "getChatGPTCompanionStatus",
);
const connectCall = httpsCallable<{ timezone: string }, { success: boolean } & ChatGPTCompanionConnection>(
  functions,
  "createChatGPTCompanionConnection",
);
const revokeCall = httpsCallable<undefined, { success: boolean }>(
  functions,
  "revokeChatGPTCompanionConnection",
);
const activityCall = httpsCallable<undefined, { success: boolean; actions: ChatGPTCompanionActivity[] }>(
  functions,
  "getChatGPTCompanionActivity",
);

export async function getChatGPTCompanionStatus(): Promise<ChatGPTCompanionStatus> {
  const response = await statusCall(undefined);
  const data = response.data;
  return {
    available: data.available === true,
    connected: data.connected === true,
    prepared: data.prepared === true,
    upgradeRequired: data.upgradeRequired === true,
    revoked: data.revoked === true,
    expired: data.expired === true,
    linkExpired: data.linkExpired === true,
    effectiveTier: String(data.effectiveTier || "free"),
    source: String(data.source || "free"),
    permissions: Array.isArray(data.permissions) ? data.permissions as ChatGPTCompanionPermission[] : [],
    connectedAt: data.connectedAt,
    expiresAt: data.expiresAt,
    linkExpiresAt: data.linkExpiresAt,
    lastUsedAt: data.lastUsedAt,
    lastTool: data.lastTool ?? null,
    mcpServer: String(data.mcpServer || "https://tinytitanskeeper.web.app/mcp"),
    connectionVersion: Number(data.connectionVersion || 0),
    timezone: String(data.timezone || "UTC"),
  };
}

export async function createChatGPTCompanionConnection(): Promise<ChatGPTCompanionConnection> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const response = await connectCall({ timezone });
  return {
    linkCode: String(response.data.linkCode || response.data.token || ""),
    token: response.data.token,
    tokenShownOnce: response.data.tokenShownOnce === true,
    linkExpiresAt: String(response.data.linkExpiresAt || response.data.expiresAt || ""),
    expiresAt: response.data.expiresAt,
    permissions: response.data.permissions,
    mcpServer: String(response.data.mcpServer || "https://tinytitanskeeper.web.app/mcp"),
    apiBase: response.data.apiBase,
    timezone: response.data.timezone,
  };
}

export async function revokeChatGPTCompanionConnection(): Promise<void> {
  await revokeCall(undefined);
}

export async function getChatGPTCompanionActivity(): Promise<ChatGPTCompanionActivity[]> {
  const response = await activityCall(undefined);
  return Array.isArray(response.data.actions) ? response.data.actions : [];
}
