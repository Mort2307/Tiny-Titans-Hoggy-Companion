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
const functionsIndex = read("functions/index.js");
const customSupport = read("functions/customSupport.js");
const becomeTitan = read("src/pages/BecomeATitan.tsx");
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
const requiredStripeLookupKeys = [
  "tinytitans_titan_pro_monthly",
  "tinytitans_titan_seller_monthly",
  "tinytitans_business_starter_monthly",
  "tinytitans_business_plus_monthly",
  "tinytitans_business_advanced_monthly",
  "tinytitans_rescue_monthly",
];
const requiredStripePriceIds = [
  "price_1UGOyLI4DKNMJVXDHyHPiP9L",
  "price_1UGMnlI4DKNMJVXDu6Jk8j7G",
  "price_1UGOyPI4DKNMJVXD61h9P4WX",
  "price_1UGOyRI4DKNMJVXDWQC1EIY0",
  "price_1UGOyTI4DKNMJVXD5QXuppJe",
  "price_1UG0zPI4DKNMJVXDEjjgN1T9",
];
const commercialTiers = ["titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"];
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
function tierHasEntitlement(tierId, entitlement) {
  const match = config.match(new RegExp(tierId + ":\\s*\\{[^\\n]*?entitlements:\\s*\\[([^\\n]*)\\]"));
  return Boolean(match?.[1]?.includes("\"" + entitlement + "\""));
}
const checks = [
  ["tier catalogue exists", config.includes("PAID_TIER_CATALOG")],
  ["all six commercial tiers registered", commercialTiers.every((id) => config.includes(id))],
  ["all paid tiers include Titan Intelligence", commercialTiers.every((id) => tierHasEntitlement(id, "titan_intelligence"))],
  ["free tier does not include Titan Intelligence entitlement", !tierHasEntitlement("free", "titan_intelligence")],
  ["configured Stripe price IDs are present", requiredStripePriceIds.every((id) => config.includes(id) && subscriptions.includes(id))],
  ["configured Stripe lookup keys are present", requiredStripeLookupKeys.every((key) => subscriptions.includes(key))],
  ["maintained paid subscription module is exported from Firebase entrypoint", functionsIndex.includes('Object.assign(exports,require("./paidSubscriptions")); ') || functionsIndex.includes('Object.assign(exports,require("./paidSubscriptions"));')],
  ["maintained custom support module is exported from Firebase entrypoint", functionsIndex.includes('Object.assign(exports,require("./customSupport")); ') || functionsIndex.includes('Object.assign(exports,require("./customSupport"));')],
  ["optional Titan Fund donation callable exists", customSupport.includes("exports.createTitanCheckoutV2") && customSupport.includes("tierKey === \"custom\"")],
  ["Become a Titan invokes the optional donation flow", becomeTitan.includes("createTitanCheckoutV2") && becomeTitan.includes("customMode")],
  ["subscription checkout callable exists", subscriptions.includes("createPaidSubscriptionCheckout")],
  ["subscription webhook updates entitlements", subscriptions.includes("paidEntitlements") && subscriptions.includes("writeSubscriptionState")],
  ["pricing lookup accepts configured price IDs", subscriptions.includes("resolveRecurringPriceForPricing") && subscriptions.includes("stripe.prices.retrieve(configuredPriceId)")],
  ["customer purchase CTA exists", plans.includes('"Buy now"') && plans.includes("startPaidSubscriptionCheckout")],
  ["creator purchase fallback is removed", !plans.includes("Open Creator paid-tier control")],
  ["customer locked-feature links preserve target tier", plans.includes("searchParams.get(\"tier\")") && gate.includes("/plans?tier=")],
  ["checkout returns to billing", subscriptions.includes("/account/billing?subscription=success")],
  ["billing detects subscription activation", billing.includes("subscriptionActive") && billing.includes("refreshProfile()")],
  ["billing activation is not blocked by tester source", /actualTier\s*!==\s*["\']free["\']/.test(billing) && /subscriptionStatus\s*===\s*["\']active["\']/.test(billing)],
  ["export entitlement exists", config.includes('"data_export"')],
  ["export paid surface exists", workspace.includes("/paid/export") && workspace.includes("<DataExportFeature />")],
  ["all commercial surfaces represented", ["/paid/analytics","/paid/seller","/paid/marketplace","/paid/business","/paid/team","/paid/automation","/paid/support","/paid/api","/paid/branding"].every((route) => workspace.includes(route))],
  ["every workspace has My Account navigation", commercialTiers.every((id) => workspaceProducts.includes(`id:\"${id}\"`) && workspaceProducts.includes(`label:\"My Account\",path:\"/account\"`))],
  ["actionable paywall", gate.includes("Compare plans") && gate.includes("/plans?tier=")],
  ["free intelligence page remains available", titanPage.includes("export default function TitanIntelligence() { return <TitanIntelligenceContent />; }") && titanPage.includes("<TitanIntelligenceGrowthPanel/>")],
  ["paid Titan Intelligence entitlement exists", config.includes('"titan_intelligence"') && commercialTiers.every((id) => tierHasEntitlement(id, "titan_intelligence"))],
  ["Ask Titan callable is exported", titanFunctions.includes("exports.askTitan") && titanFunctions.includes("resolveTitanAccess") && titanAccess.includes("PAID_TIERS") && titanAccess.includes("titan_pro")],
  ["Gemini tool calling is wired", titanModel.includes("toolConfig") && titanModel.includes("functionCallingConfig") && titanTools.includes("functionDeclarations")],
  ["Gemini current model is configured", titanModel.includes('"gemini-3.8-flash"')],
  ["model is instructed not to claim creator authorship", titanPrompt.includes("CREATOR_AUTHORSHIP_BOUNDARY") && /must never imply or present an AI conclusion as a personal claim/i.test(titanPrompt)],
  ["provenance is returned", titanFunctions.includes("buildTitanProvenance") && titanProvenance.includes("creatorAuthorshipClaim")],
  ["user data provenance is explicit", titanProvenance.includes("USER_DATA") && titanProvenance.includes("information made available to Titan Intelligence")],
  ["deterministic analysis is separate from retrieval", titanData.includes('require("./titanIntelligenceAnalysis")') && titanData.includes("buildAnimalIntelligenceSnapshot") && titanAnalysis.includes("function buildAnimalIntelligenceSnapshot")],
  ["personal data is not substituted into non-personal workspaces", /not substituted into Rescue context/i.test(titanTools)],
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
