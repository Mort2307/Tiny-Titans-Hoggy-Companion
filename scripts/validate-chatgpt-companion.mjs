import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const backend = read("functions/chatgptCompanion.js");
const mcp = read("functions/chatgptMcp.js");
const index = read("functions/index.js");
const config = read("src/config/paidTiers.ts");
const catalog = read("src/config/paidEntitlementCatalog.ts");
const route = read("src/routes/AuthenticatedRoutes.tsx");
const settings = read("src/pages/Settings.tsx");
const page = read("src/pages/ChatGPTCompanion.tsx");
const authorizePage = read("src/pages/ChatGPTCompanionAuthorize.tsx");
const service = read("src/services/chatgptCompanionService.ts");

function tierSlice(tierId) {
  const start = config.indexOf(`${tierId}:`);
  if (start < 0) return "";
  const candidates = ["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"]
    .map((id) => config.indexOf(`${id}:`))
    .filter((position) => position > start)
    .sort((a, b) => a - b);
  return config.slice(start, candidates[0] ?? config.length);
}

const writeTools = [
  "log_feeding",
  "log_weight",
  "log_shed",
  "log_behaviour",
  "log_health_observation",
  "undo_last_action",
];

const readTools = [
  "list_animals",
  "resolve_animal",
  "get_animal_summary",
  "get_feeding_history",
  "get_weight_history",
  "get_shed_history",
  "get_recent_activity",
];

const eligible = ["titan_pro", "business_starter", "business_plus", "business_advanced", "rescue"];

const checks = [
  ["backend module exists and is exported", index.includes('require("./chatgptCompanion")') && backend.includes("exports.chatGPTCompanionApi")],
  ["MCP module exists and is exported", index.includes('require("./chatgptMcp")') && mcp.includes("exports.tinyTitansMcp")],
  ["OAuth authorization server is exported", mcp.includes("exports.tinyTitansOAuth") && mcp.includes("oauth-authorization-server")],
  ["protected resource metadata is published", mcp.includes("oauth-protected-resource") && mcp.includes("authorization_servers")],
  ["OAuth uses authorization code plus PKCE S256", mcp.includes('"authorization_code"') && mcp.includes('"S256"') && mcp.includes("code_verifier")],
  ["OAuth supports refresh tokens", mcp.includes('"refresh_token"') && mcp.includes("chatgptOAuthRefreshTokens")],
  ["OAuth binds tokens to MCP resource", mcp.includes("MCP_RESOURCE") && mcp.includes("data.resource !== MCP_RESOURCE")],
  ["ChatGPT stable client and callback are allowlisted", mcp.includes("https://chatgpt.com/oauth/client.json") && mcp.includes("https://chatgpt.com/connector_platform_oauth_redirect")],
  ["MCP tools declare scoped OAuth security", mcp.includes("securitySchemes") && mcp.includes('"records.write"') && mcp.includes('"animals.read"')],
  ["profile tool is declared for account identity", mcp.includes('"get_profile"') && mcp.includes('"openai/profile"')],
  ["connection credentials are hashed", backend.includes('createHash("sha256")') && backend.includes("secretHash") && !backend.includes("rawToken:")],
  ["connection can be revoked", backend.includes("revokeChatGPTCompanionConnection") && backend.includes("revokeOAuthTokens")],
  ["read tool family exists", readTools.every((tool) => backend.includes(`"${tool}"`) && mcp.includes(`"${tool}"`))],
  ["write tool family exists", writeTools.every((tool) => backend.includes(`"${tool}"`) && mcp.includes(`"${tool}"`))],
  ["generic arbitrary database write tool is absent", !backend.includes('"write_firestore') && !backend.includes('"set_document') && !backend.includes('"delete_record"') && !mcp.includes('"write_firestore')],
  ["write operations require scoped permission", backend.includes('"write_records"') && backend.includes("toolPermission(auth, tool)") && mcp.includes('"records.write"')],
  ["shared-family writes fail closed", backend.includes("requireFamilyWriteOwner") && backend.includes("Shared family members remain read-only")],
  ["idempotent record IDs are supported", backend.includes("idempotencyKey") && backend.includes("idForAction")],
  ["weight duplicate-date guard exists", backend.includes("WEIGHT_DUPLICATE_DATE")],
  ["undo only targets Companion-created reversible actions", backend.includes("reversible === true") && backend.includes("undo_last_action")],
  ["audit trail exists", backend.includes("actionsCollection") && backend.includes("auditAction")],
  ["Titan Pro contains ChatGPT Companion", tierSlice("titan_pro").includes('"chatgpt_companion"')],
  ["eligible business/rescue tiers contain ChatGPT Companion", eligible.every((tier) => tierSlice(tier).includes('"chatgpt_companion"') || (tier === "rescue" && config.includes('"chatgpt_companion"')))],
  ["Free does not contain ChatGPT Companion", !tierSlice("free").includes('"chatgpt_companion"')],
  ["Titan Seller does not contain ChatGPT Companion", !tierSlice("titan_seller").includes('"chatgpt_companion"')],
  ["entitlement has a named destination", catalog.includes('chatgpt_companion: "ChatGPT Companion"') && catalog.includes('/account/integrations/chatgpt')],
  ["paid route is gated by entitlement", route.includes('entitlement="chatgpt_companion"') && route.includes("<ChatGPTCompanion/>")],
  ["OAuth approval route is gated by entitlement", route.includes("/account/integrations/chatgpt/authorize") && route.includes("<ChatGPTCompanionAuthorize/>")],
  ["Settings exposes the integration", settings.includes("Tiny Titans Companion") && settings.includes("/account/integrations/chatgpt")],
  ["normal UI no longer exposes a one-time secret token", !page.includes("One-time connection token") && !page.includes("Rotate connection token")],
  ["frontend explains MCP endpoint and OAuth flow", page.includes("Copy MCP address") && page.includes("OAuth 2.1") && page.includes("PKCE")],
  ["authorization screen explains requested permissions", authorizePage.includes("WHAT CHATGPT IS REQUESTING") && authorizePage.includes("Approve and return to ChatGPT")],
  ["frontend never stores auth tokens in localStorage", !page.includes("localStorage") && !authorizePage.includes("localStorage") && !service.includes("localStorage")],
  ["disconnect UI exists", page.includes("Disconnect ChatGPT") && page.includes("revokeChatGPTCompanionConnection")],
  ["activity audit UI exists", page.includes("Recent ChatGPT Companion actions") && service.includes("getChatGPTCompanionActivity")],
];

const failures = checks.filter(([, ok]) => !ok).map(([label]) => label);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

if (failures.length) {
  console.error(`\nChatGPT Companion validation failed: ${failures.length} contract(s).\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("\nChatGPT Companion contract: PASS");
