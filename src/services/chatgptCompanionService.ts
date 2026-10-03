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
  revoked: boolean;
  expired: boolean;
  effectiveTier: string;
  source: string;
  permissions: ChatGPTCompanionPermission[];
  connectedAt?: unknown;
  expiresAt?: unknown;
  lastUsedAt?: unknown;
  lastTool?: string | null;
  connectionMode?: "oauth" | "legacy_token" | null;
  grantedScopes?: string[];
};

export type ChatGPTCompanionConnection = {
  token: string;
  tokenShownOnce: boolean;
  expiresAt: string;
  permissions: ChatGPTCompanionPermission[];
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

export type ChatGPTCompanionLinkInfo = {
  mcpUrl: string;
  authorizationUrl: string;
  chatgptUrl: string;
  authMode: "oauth_2_1_pkce";
  scopes: Array<{ scope: string; label: string }>;
};

export type ChatGPTCompanionAuthorizationRequest = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  state: string;
  scope: string;
};

export type ChatGPTCompanionAuthorizationApproval = {
  redirectUrl: string;
  scopes: string[];
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

const linkInfoCall = httpsCallable<undefined, { success: boolean } & ChatGPTCompanionLinkInfo>(
  functions,
  "getChatGPTCompanionLinkInfo",
);
const approveAuthorizationCall = httpsCallable<ChatGPTCompanionAuthorizationRequest, { success: boolean } & ChatGPTCompanionAuthorizationApproval>(
  functions,
  "approveChatGPTCompanionAuthorization",
);

export async function getChatGPTCompanionStatus(): Promise<ChatGPTCompanionStatus> {
  const response = await statusCall(undefined);
  const data = response.data;
  return {
    available: data.available === true,
    connected: data.connected === true,
    revoked: data.revoked === true,
    expired: data.expired === true,
    effectiveTier: String(data.effectiveTier || "free"),
    source: String(data.source || "free"),
    permissions: Array.isArray(data.permissions) ? data.permissions as ChatGPTCompanionPermission[] : [],
    connectedAt: data.connectedAt,
    expiresAt: data.expiresAt,
    lastUsedAt: data.lastUsedAt,
    lastTool: data.lastTool ?? null,
    connectionMode: data.connectionMode === "oauth" || data.connectionMode === "legacy_token" ? data.connectionMode : null,
    grantedScopes: Array.isArray(data.grantedScopes) ? data.grantedScopes.map(String) : [],
  };
}

export async function createChatGPTCompanionConnection(): Promise<ChatGPTCompanionConnection> {
  const response = await connectCall(undefined);
  return {
    token: response.data.token,
    tokenShownOnce: response.data.tokenShownOnce === true,
    expiresAt: response.data.expiresAt,
    permissions: response.data.permissions,
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


export async function getChatGPTCompanionLinkInfo(): Promise<ChatGPTCompanionLinkInfo> {
  const response = await linkInfoCall(undefined);
  return {
    mcpUrl: String(response.data.mcpUrl || ""),
    authorizationUrl: String(response.data.authorizationUrl || ""),
    chatgptUrl: String(response.data.chatgptUrl || "https://chatgpt.com/"),
    authMode: "oauth_2_1_pkce",
    scopes: Array.isArray(response.data.scopes)
      ? response.data.scopes.map((item) => ({ scope: String(item.scope || ""), label: String(item.label || item.scope || "") }))
      : [],
  };
}

export async function approveChatGPTCompanionAuthorization(
  request: ChatGPTCompanionAuthorizationRequest,
): Promise<ChatGPTCompanionAuthorizationApproval> {
  const response = await approveAuthorizationCall(request);
  return {
    redirectUrl: String(response.data.redirectUrl || ""),
    scopes: Array.isArray(response.data.scopes) ? response.data.scopes.map(String) : [],
  };
}
