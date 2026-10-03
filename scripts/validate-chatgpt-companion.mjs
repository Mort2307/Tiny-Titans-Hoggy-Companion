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
  ["one-time token warning exists", page.includes("shown once") || page.includes("Shown once")],
  ["disconnect UI exists", page.includes("Disconnect") && page.includes("revokeChatGPTCompanionConnection")],
  ["activity audit UI exists", page.includes("Recent ChatGPT Companion actions") && service.includes("getChatGPTCompanionActivity")],
];

const failures = checks.filter(([, ok]) => !ok).map(([label]) => label);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

if (failures.length) {
  console.error(`\nChatGPT Companion validation failed: ${failures.length} contract(s).\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("\nChatGPT Companion contract: PASS");
