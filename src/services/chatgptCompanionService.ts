import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

export type ChatGPTCompanionPermission =
  | "read_animals"
  | "read_records"
  | "write_records"
  | "undo_own_actions";

export type ChatGPTCompanionStatus = {
  available: boolean;
  connected: boolean;
  prepared: boolean;
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

const statusCall = httpsCallable<undefined, { success: boolean } & ChatGPTCompanionStatus>(
  functions,
  "getChatGPTCompanionStatus",
);
const connectCall = httpsCallable<undefined, { success: boolean } & ChatGPTCompanionConnection>(
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
  };
}

export async function createChatGPTCompanionConnection(): Promise<ChatGPTCompanionConnection> {
  const response = await connectCall(undefined);
  return {
    linkCode: String(response.data.linkCode || response.data.token || ""),
    token: response.data.token,
    tokenShownOnce: response.data.tokenShownOnce === true,
    linkExpiresAt: String(response.data.linkExpiresAt || response.data.expiresAt || ""),
    expiresAt: response.data.expiresAt,
    permissions: response.data.permissions,
    mcpServer: String(response.data.mcpServer || "https://tinytitanskeeper.web.app/mcp"),
    apiBase: response.data.apiBase,
  };
}

export async function revokeChatGPTCompanionConnection(): Promise<void> {
  await revokeCall(undefined);
}

export async function getChatGPTCompanionActivity(): Promise<ChatGPTCompanionActivity[]> {
  const response = await activityCall(undefined);
  return Array.isArray(response.data.actions) ? response.data.actions : [];
}
