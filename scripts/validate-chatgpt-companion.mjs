import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const backend = read("functions/chatgptCompanion.js");
const index = read("functions/index.js");
const config = read("src/config/paidTiers.ts");
const catalog = read("src/config/paidEntitlementCatalog.ts");
const route = read("src/routes/AuthenticatedRoutes.tsx");
const settings = read("src/pages/Settings.tsx");
const page = read("src/pages/ChatGPTCompanion.tsx");
const service = read("src/services/chatgptCompanionService.ts");
const envExample = read(".env.example");
const firebaseConfig = read("firebase.json");
const viteConfig = read("vite.config.ts");

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
  "create_reminders",
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
  "get_keeper_snapshot",
  "list_reminders",
];

const eligible = ["titan_pro", "business_starter", "business_plus", "business_advanced", "rescue"];

const checks = [
  ["backend module exists and is exported", index.includes('require("./chatgptCompanion")') && backend.includes("exports.chatGPTCompanionApi")],
  ["connection credentials are hashed", backend.includes('createHash("sha256")') && backend.includes("secretHash") && !backend.includes("rawToken:")],
  ["connection can be revoked", backend.includes("revokeChatGPTCompanionConnection") && backend.includes("revokedAt")],
  ["connection expiry is enforced", backend.includes("CONNECTION_TTL_DAYS") && backend.includes("activeFuture(data.expiresAt)")],
  ["read tool family exists", readTools.every((tool) => backend.includes(`"${tool}"`))],
  ["write tool family exists", writeTools.every((tool) => backend.includes(`"${tool}"`))],
  ["generic arbitrary database write tool is absent", !backend.includes('"write_firestore') && !backend.includes('"set_document') && !backend.includes('"delete_record"')],
  ["write operations require scoped permission", backend.includes('"write_records"') && backend.includes("toolPermission(auth, tool)")],
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
  ["Settings exposes the integration", settings.includes("Tiny Titans Companion") && settings.includes("/account/integrations/chatgpt")],
  ["frontend never stores token in localStorage", !page.includes("localStorage") && !service.includes("localStorage")],
  ["frontend removes manual pairing-code UX", !page.includes("Generate link code") && !page.includes("Copy link code") && !page.includes("One-time link code") && !service.includes("createChatGPTCompanionConnection")],
  ["disconnect UI exists", page.includes("Disconnect") && page.includes("revokeChatGPTCompanionConnection")],
  ["activity audit UI exists", page.includes("Recent ChatGPT Companion actions") && service.includes("getChatGPTCompanionActivity")],
  ["MCP endpoint is exported", backend.includes("exports.tinyTitansMcp") && backend.includes('path === "/mcp"')],
  ["MCP supports modern discovery and legacy initialize", backend.includes('"server/discover"') && backend.includes('"initialize"') && backend.includes('"2026-07-28"')],
  ["modern tools/list emits required cache hints", backend.includes('message.method === "tools/list"') && backend.includes("ttlMs: 300000") && backend.includes('cacheScope: "public"')],
  ["MCP advertises scoped OAuth per tool", backend.includes("securitySchemes") && backend.includes('"animals.read"') && backend.includes('"records.write"')],
  ["authenticated profile tool is declared", backend.includes('"openai/profile": true') && backend.includes('name: "get_profile"')],
  ["OAuth protected-resource metadata exists", backend.includes("oauth-protected-resource") && backend.includes("authorization_servers")],
  ["OAuth server metadata advertises PKCE S256", backend.includes("code_challenge_methods_supported") && backend.includes('"S256"')],
  ["OAuth issuer identification is enabled", backend.includes("authorization_response_iss_parameter_supported: true") && backend.includes('target.searchParams.set("iss"')],
  ["OAuth access and refresh tokens are hashed in Firestore", backend.includes('"chatgptOauthAccessTokens"') && backend.includes('"chatgptOauthRefreshTokens"') && backend.includes("tokenHash(accessToken)")],
  ["OAuth authorization verifies Firebase identity server-side", backend.includes('require("firebase-admin/auth")') && backend.includes("verifyIdToken(firebaseIdToken, true)")],
  ["OAuth authorization binds directly to verified Firebase UID", backend.includes("createOAuthAuthorizationCodeForUid") && backend.includes("decodedToken.uid") && backend.includes('authorizationMode: "firebase_oauth"')],
  ["authorization page supports existing Tiny Titans account login", backend.includes("onAuthStateChanged") && backend.includes("signInWithPopup") && backend.includes("signInWithEmailAndPassword")],
  ["authorization page does not request a pairing code", !backend.includes('name="link_code"') && !backend.includes('oauthField(request, "link_code");')],
  ["legacy link codes are not bearer auth", backend.includes("OAUTH_ACCESS_PREFIX") && !backend.includes("token.startsWith(LINK_CODE_PREFIX) return authenticate")],
  ["OAuth generations invalidate rotated connections", backend.includes("oauthGeneration") && backend.includes("GENERATION_MISMATCH")],
  ["keeper hosting routes MCP and OAuth before SPA fallback", firebaseConfig.includes('"source": "/mcp"') && firebaseConfig.includes('"functionId": "tinyTitansMcp"') && firebaseConfig.indexOf('"source": "/mcp"') < firebaseConfig.lastIndexOf('"destination": "/index.html"')],
  ["PWA navigation fallback excludes MCP and OAuth routes", viteConfig.includes("navigateFallbackDenylist") && viteConfig.includes("/mcp") && viteConfig.includes("/oauth") && viteConfig.includes("oauth-(?:protected-resource|authorization-server)")],
  ["frontend exposes one-tap ChatGPT linking", page.includes("Link with ChatGPT") && page.includes("Install Tiny Titans if prompted") && page.includes("Sign in and press Allow") && envExample.includes("VITE_CHATGPT_PLUGIN_URL")],
  ["frontend has no manual secret handoff", !page.includes("ttlink_") && !page.includes("Generate link code") && !page.includes("Copy link code") && !page.includes("MCP server") && !page.includes("Developer mode") && !service.includes("createChatGPTCompanionConnection")],
  ["multi-animal snapshot is exposed", backend.includes('name: "get_keeper_snapshot"') && backend.includes("selectRequestedAnimals")],
  ["reminder scopes are explicit", backend.includes('"reminders.read"') && backend.includes('"reminders.write"') && backend.includes('"read_reminders"') && backend.includes('"write_reminders"')],
  ["reminder write tool supports batch animal names", backend.includes('name: "create_reminders"') && backend.includes("animalNames") && backend.includes("recordPaths")],
  ["one-time reminders are completed rather than recurring forever", backend.includes('scheduleType: recurring ? "recurring" : "once"') && read("functions/reminders.js").includes('status: "completed"')],
  ["ChatGPT feeding writes reanchor recurring feeding reminders", backend.includes("reanchorRecurringFeedingReminders(auth, snake, date)")],
  ["OAuth consent captures browser timezone for natural reminder requests", backend.includes('oauthField(request, "timezone")') && backend.includes("resolvedOptions().timeZone")],
  ["native reminder service preserves one-time reminder semantics", read("src/services/reminderService.ts").includes('reminder.scheduleType !== "once"') && read("src/services/reminderService.ts").includes('scheduleType: "once"')],
];

const failures = checks.filter(([, ok]) => !ok).map(([label]) => label);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

if (failures.length) {
  console.error(`\nChatGPT Companion validation failed: ${failures.length} contract(s).\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("\nChatGPT Companion contract: PASS");
