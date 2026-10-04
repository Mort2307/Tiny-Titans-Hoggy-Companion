import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const config = read("src/config/paidTiers.ts");
const plans = read("src/pages/PaidPlans.tsx");
const billing = read("src/pages/AccountBilling.tsx");
const subscriptions = read("functions/paidSubscriptions.js");
const paidBusiness = read("functions/paidBusiness.js");
const paidMarketplace = read("functions/paidMarketplace.js");
const paidPublicApi = read("functions/paidPublicApi.js");
const paidSupport = read("functions/paidSupport.js");
const workspace = read("src/pages/PaidFeatureWorkspace.tsx");
const workspaceProducts = read("src/config/workspaceProducts.ts");
const gate = read("src/components/PaidTierGate.tsx");
const titanPage = read("src/pages/TitanIntelligence.tsx");
const titanFunctions = read("functions/titanIntelligence.js");
const titanPrompt = read("functions/titanIntelligencePrompt.js");
const titanModel = read("functions/titanIntelligenceModel.js");
const titanTools = read("functions/titanIntelligenceTools.js");
const titanAccess = read("functions/titanIntelligenceAccess.js");
const titanProvenance = read("functions/titanIntelligenceProvenance.js");
const titanData = read("functions/titanIntelligenceData.js");
const titanAnalysis = read("functions/titanIntelligenceAnalysis.js");
const titanAsk = read("src/components/TitanIntelligence/AskTitan.tsx");
const titanContracts = read("src/intelligence/askTitan/titanChatContracts.ts");
const titanHook = read("src/intelligence/askTitan/useTitanChat.ts");
const titanService = read("src/intelligence/askTitan/titanChatService.ts");
const requiredStripePriceIds = [
  "price_1UGOyLI4DKNMJVXDHyHPiP9L",
  "price_1UGMnlI4DKNMJVXDu6Jk8j7G",
  "price_1UGOyPI4DKNMJVXD61h9P4WX",
  "price_1UGOyRI4DKNMJVXDWQC1EIY0",
  "price_1UGOyTI4DKNMJVXD5QXuppJe",
  "price_1UG0zPI4DKNMJVXDEjjgN1T9",
];
const commercialTiers = ["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"];
const rescueSharedEntitlements = ["advanced_timeline", "advanced_analytics", "titan_intelligence", "morph_intelligence", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "api_access", "priority_support", "custom_branding"];
const rescueEntitlementBlock = config.slice(config.indexOf("const RESCUE:"), config.indexOf("const PAID_INTELLIGENCE:"));
const rescueNavigationTargets = ["/paid/timeline", "/paid/analytics", "/morph-library/evidence", "/paid/marketplace", "/paid/seller", "/paid/business", "/paid/team", "/paid/automation", "/paid/api", "/paid/support", "/paid/export", "/rescue/adoption"];
const rescueWorkspaceStart = workspaceProducts.indexOf("rescue: {");
const rescueWorkspaceEnd = workspaceProducts.indexOf("\n};", rescueWorkspaceStart);
const rescueWorkspaceBlock = rescueWorkspaceStart >= 0 && rescueWorkspaceEnd > rescueWorkspaceStart ? workspaceProducts.slice(rescueWorkspaceStart, rescueWorkspaceEnd) : "";
const titanModules = [
  "functions/titanIntelligenceAccess.js",
  "functions/titanIntelligenceData.js",
  "functions/titanIntelligenceAnalysis.js",
  "functions/titanIntelligenceTools.js",
  "functions/titanIntelligencePrompt.js",
  "functions/titanIntelligenceModel.js",
  "functions/titanIntelligenceUsage.js",
  "functions/titanIntelligenceProvenance.js",
  "functions/titanIntelligence.js",
  "src/intelligence/askTitan/titanChatContracts.ts",
  "src/intelligence/askTitan/titanChatService.ts",
  "src/intelligence/askTitan/titanChatStarters.ts",
  "src/intelligence/askTitan/useTitanChat.ts",
  "src/components/TitanIntelligence/AskTitan.tsx",
  "src/components/TitanIntelligence/TitanChatComposer.tsx",
  "src/components/TitanIntelligence/TitanChatMessage.tsx",
  "src/components/TitanIntelligence/TitanAnswerProvenance.tsx",
  "src/components/TitanIntelligence/TitanDataUseNotice.tsx",
  "src/components/TitanIntelligence/TitanUsageIndicator.tsx",
];
function tierSlice(tierId) {
  const start = config.indexOf(`${tierId}:`);
  const next = commercialTiers.map((candidate) => config.indexOf(`${candidate}:`)).filter((position) => position > start).sort((a, b) => a - b)[0] ?? config.length;
  return start >= 0 ? config.slice(start, next) : "";
}
const checks = [
  ["tier catalogue exists", config.includes("PAID_TIER_CATALOG")],
  ["all six commercial tiers registered", commercialTiers.every((id) => config.includes(id))],
  ["all paid tiers include Titan Intelligence", commercialTiers.every((id) => {
    const slice = tierSlice(id);
    return slice.includes("PAID_INTELLIGENCE") || slice.includes("\"titan_intelligence\"") || (id === "rescue" && rescueEntitlementBlock.includes("\"titan_intelligence\""));
  })],
  ["free tier does not include Titan Intelligence entitlement", !tierSlice("free").includes("titan_intelligence")],
  ["configured Stripe price IDs are present", requiredStripePriceIds.every((id) => config.includes(id) && subscriptions.includes(id))],
  ["subscription checkout callable exists", subscriptions.includes("createPaidSubscriptionCheckout")],
  ["subscription webhook updates entitlements", subscriptions.includes("paidEntitlements") && subscriptions.includes("writeSubscriptionState")],
  ["pricing lookup accepts configured price IDs", subscriptions.includes("resolveRecurringPriceForPricing") && subscriptions.includes("stripe.prices.retrieve(configuredPriceId)")],
  ["customer purchase CTA exists", plans.includes('"Buy now"') && plans.includes("startPaidSubscriptionCheckout")],
  ["creator purchase fallback is removed", !plans.includes("Open Creator paid-tier control")],
  ["customer locked-feature links preserve target tier", plans.includes("requestedTier") && gate.includes("/plans?tier=${tier.id}")],
  ["checkout returns to billing", subscriptions.includes("/account/billing?subscription=success")],
  ["canonical keeper hosting origin is accepted by Stripe checkout", subscriptions.includes("https://tinytitanskeeper.web.app") && subscriptions.includes("https://tinytitanskeeper.firebaseapp.com")],
  ["checkout origin fallback uses canonical keeper host", subscriptions.includes('return ORIGINS.has(value) ? value : "https://tinytitanskeeper.web.app"')],
  ["billing detects subscription activation", billing.includes("subscriptionActive") && billing.includes("refreshProfile()")],
  ["billing activation is not blocked by tester source", billing.includes("access.actualTier !== \"free\"") && billing.includes("access.subscriptionStatus === \"active\"")],
  ["export entitlement exists", config.includes('"data_export"')],
  ["Rescue includes all shared paid capabilities", rescueSharedEntitlements.every((entitlement) => tierSlice("rescue").includes(`"${entitlement}"`) || rescueEntitlementBlock.includes(`"${entitlement}"`))],
  ["Rescue workspace exposes shared paid destinations", rescueWorkspaceBlock && rescueNavigationTargets.every((path) => rescueWorkspaceBlock.includes(`path:"${path}"`))],
  ["Rescue backend paid-business tier map matches shared entitlements", rescueSharedEntitlements.every((entitlement) => paidBusiness.includes(`rescue: new Set(`) && paidBusiness.includes(`"${entitlement}"`)) && paidBusiness.includes('"rescue"')],
  ["Rescue backend marketplace access is enabled", paidMarketplace.includes('"rescue"') && /PAID_TIERS/.test(paidMarketplace)],
  ["Rescue backend API access is enabled", paidPublicApi.includes("rescue: new Set(") && paidPublicApi.includes('"api_access"')],
  ["Rescue backend priority support is enabled", paidSupport.includes('"rescue"') && /PAID_TIERS/.test(paidSupport)],
  ["Pro paid-feature icon contract", /analytics: "analytics"/.test(read("src/config/navigationIcons.ts")) && /export: "export"/.test(read("src/config/navigationIcons.ts")) && /case "analytics"/.test(read("src/components/TinyTitansIcon.tsx")) && /case "export"/.test(read("src/components/TinyTitansIcon.tsx"))],
  ["export paid surface exists", workspace.includes("/paid/export") && workspace.includes("<DataExportFeature />")],
  ["all commercial surfaces represented", ["/paid/analytics","/paid/seller","/paid/marketplace","/paid/business","/paid/team","/paid/automation","/paid/support","/paid/api","/paid/branding"].every((route) => workspace.includes(route))],
  ["every workspace has My Account navigation", commercialTiers.every((id) => workspaceProducts.includes(`id:\"${id}\"`) && workspaceProducts.includes(`label:\"My Account\",path:\"/account\"`))],
  ["actionable paywall", gate.includes("Compare") && gate.includes("/plans?tier=")],
  ["free intelligence page remains available", titanPage.includes("export default function TitanIntelligence()") && titanPage.includes("TitanIntelligenceGrowthPanel")],
  ["parked Ask Titan remains outside the main Powerhouse page", !titanPage.includes("AskTitan") && !titanPage.includes("TitanAdvancedChatPreview")],
  ["Ask Titan callable implementation remains available for later activation", titanFunctions.includes("exports.askTitan") && titanFunctions.includes("consumeTitanUsage") && titanFunctions.includes("buildTitanProvenance")],
  ["Gemini tool calling is wired", titanModel.includes("toolConfig") && titanModel.includes("functionCallingConfig") && titanTools.includes("functionDeclarations")],
  ["Gemini current model is configured", titanModel.includes('"gemini-3.8-flash"')],
  ["model is instructed not to claim creator authorship", titanPrompt.toLowerCase().includes("must never imply") && titanPrompt.toLowerCase().includes("personal claim made by the tiny titans creator")],
  ["provenance is returned", titanFunctions.includes("buildTitanProvenance") && titanProvenance.includes("creatorAuthorshipClaim")],
  ["user data provenance is explicit", titanProvenance.includes("USER_DATA") && titanProvenance.includes("information made available to Titan Intelligence")],
  ["deterministic analysis is separate from retrieval", titanData.includes("getAnimalIntelligenceSnapshot") && titanAnalysis.includes("buildAnimalIntelligenceSnapshot")],
  ["personal data is not substituted into non-personal workspaces", titanTools.includes("Personal animal records are not substituted into Rescue context")],
  ["modular Ask Titan state exists", titanAsk.includes("useTitanChat") && titanHook.includes("export function useTitanChat")],
  ["modular Titan contracts exist", titanContracts.includes("TitanAskResponse") && titanService.includes("askTitanCall")],
  ["all Titan modules remain separate files", titanModules.every(exists)],
  ["promotion catalogue exists", exists("src/config/paidPromotions.ts")],
  ["promotion claim service exists", exists("src/services/paidPromotionService.ts")],
  ["promotion backend exported", exists("functions/paidPromotions.js")],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ test: "paid-and-titan-intelligence-contract", status: failures.length ? "fail" : "pass", checked: checks.length, failures }, null, 2));
if (failures.length) process.exit(1);
