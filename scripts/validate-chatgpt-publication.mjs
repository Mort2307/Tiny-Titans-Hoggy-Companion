import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const backend = read("functions/chatgptCompanion.js");
const firebaseConfig = read("firebase.json");
const viteConfig = read("vite.config.ts");
const appRouter = read("src/routes/AppRouter.tsx");
const integrationPage = read("src/pages/ChatGPTIntegrationPublic.tsx");
const supportPage = read("src/pages/Support.tsx");
const privacyPage = read("src/pages/PrivacyPolicy.tsx");
const termsPage = read("src/pages/TermsOfService.tsx");
const companionPage = read("src/pages/ChatGPTCompanion.tsx");
const deployScript = read("scripts/deploy-functions-batched.mjs");

const CANONICAL_PLUGIN_ID = "plugins_6ac379fc8e1c8191b952bfbe6c5c0f15";
const LEGACY_PLUGIN_ID = "plugins_6ac2654b51e48191af9a0c921d2b8d6e";

const checks = [
  ["public ChatGPT landing route exists", appRouter.includes('location.pathname === "/chatgpt"') && integrationPage.includes("Tiny Titans for ChatGPT")],
  ["public support route exists", appRouter.includes('location.pathname === "/support"') && supportPage.includes("tinytitans.exotics@gmail.com")],
  ["public privacy route exists", appRouter.includes('location.pathname === "/privacy"') && privacyPage.includes("ChatGPT integration")],
  ["public terms route exists", appRouter.includes('location.pathname === "/terms"') && termsPage.includes("Terms of Service")],
  ["resource metadata points to public review pages", backend.includes('resource_documentation: `${PUBLIC_ORIGIN}/chatgpt`') && backend.includes('resource_policy_uri: `${PUBLIC_ORIGIN}/privacy`') && backend.includes('resource_tos_uri: `${PUBLIC_ORIGIN}/terms`')],
  ["OpenAI domain verification endpoint exists", backend.includes('/.well-known/openai-apps-challenge') && backend.includes("OPENAI_APPS_CHALLENGE")],
  ["Firebase routes OpenAI domain challenge before SPA fallback", firebaseConfig.includes('"source": "/.well-known/openai-apps-challenge"') && firebaseConfig.indexOf('"source": "/.well-known/openai-apps-challenge"') < firebaseConfig.lastIndexOf('"destination": "/index.html"')],
  ["PWA does not intercept OpenAI domain challenge", viteConfig.includes("openai-apps-challenge") && viteConfig.includes("navigateFallbackDenylist")],
  ["OAuth discovery advertises PKCE and issuer identification", backend.includes('code_challenge_methods_supported: ["S256"]') && backend.includes("authorization_response_iss_parameter_supported: true")],
  ["stable ChatGPT OAuth client and callback are allowed", backend.includes('clientId === "https://chatgpt.com/oauth/client.json"') && backend.includes('redirectUri === "https://chatgpt.com/connector_platform_oauth_redirect"')],
  ["callback-id ChatGPT OAuth compatibility remains", backend.includes('/^https:\\/\\/chatgpt\\.com\\/oauth\\/([^/]+)\\/client\\.json$/') && backend.includes('https://chatgpt.com/connector/oauth/')],
  ["OAuth approval page is mobile-safe", backend.includes("signInWithRedirect") && backend.includes("getRedirectResult") && backend.includes("Approve connection")],
  ["tool-level auth challenge can trigger account linking", backend.includes('"mcp/www_authenticate"') && backend.includes("resource_metadata=")],
  ["authenticated profile tool is declared", backend.includes('"openai/profile": true') && backend.includes('name: "get_profile"')],
  ["tool annotations include review-required hints", backend.includes("readOnlyHint: readOnly") && backend.includes("destructiveHint: destructive") && backend.includes("openWorldHint: false")],
  ["canonical plugin is the only frontend plugin target", companionPage.includes(CANONICAL_PLUGIN_ID) && integrationPage.includes(CANONICAL_PLUGIN_ID) && !companionPage.includes(LEGACY_PLUGIN_ID) && !integrationPage.includes(LEGACY_PLUGIN_ID)],
  ["frontend cannot be redirected by a stale env plugin URL", !companionPage.includes("VITE_CHATGPT_PLUGIN_URL")],
  ["normal user setup contains no pairing-code or MCP-address instructions", !companionPage.includes("ttlink_") && !companionPage.includes("Copy link code") && !companionPage.includes("MCP server") && !companionPage.includes("Developer mode")],
  ["deployment ignores private/test exports", deployScript.includes('name.startsWith("_")')],
];

const failures = checks.filter(([, ok]) => !ok).map(([label]) => label);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

if (failures.length) {
  console.error(`\nChatGPT publication validation failed: ${failures.length} contract(s).\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("\nChatGPT publication contract: PASS");
