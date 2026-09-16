import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const config = read("src/config/paidTiers.ts");
const plans = read("src/pages/PaidPlans.tsx");
const billing = read("src/pages/AccountBilling.tsx");
const subscriptions = read("functions/paidSubscriptions.js");
const workspace = read("src/pages/PaidFeatureWorkspace.tsx");
const workspaceProducts = read("src/config/workspaceProducts.ts");
const gate = read("src/components/PaidTierGate.tsx");
const requiredStripePriceIds = [
  "price_1UGOyLI4DKNMJVXDHyHPiP9L",
  "price_1UGMnlI4DKNMJVXDu6Jk8j7G",
  "price_1UGOyPI4DKNMJVXD61h9P4WX",
  "price_1UGOyRI4DKNMJVXDWQC1EIY0",
  "price_1UGOyTI4DKNMJVXD5QXuppJe",
  "price_1UG0zPI4DKNMJVXDEjjgN1T9",
];
const checks = [
  ["tier catalogue exists", config.includes("PAID_TIER_CATALOG")],
  ["all six commercial tiers registered", ["titan_pro","titan_seller","business_starter","business_plus","business_advanced","rescue"].every((id) => config.includes(id))],
  ["configured Stripe price IDs are present", requiredStripePriceIds.every((id) => config.includes(id) && subscriptions.includes(id))],
  ["subscription checkout callable exists", subscriptions.includes("createPaidSubscriptionCheckout")],
  ["subscription webhook updates entitlements", subscriptions.includes("paidEntitlements") && subscriptions.includes("writeSubscriptionState")],
  ["pricing lookup accepts configured price IDs", subscriptions.includes("resolveRecurringPriceForPricing") && subscriptions.includes("stripe.prices.retrieve(configuredPriceId)" )],
  ["customer purchase CTA exists", plans.includes('"Buy now"') && plans.includes("startPaidSubscriptionCheckout")],
  ["creator purchase fallback is removed", !plans.includes("Open Creator paid-tier control")],
  ["customer locked-feature links preserve target tier", plans.includes("searchParams.get(\"tier\")") && workspace.includes("/plans?tier=")],
  ["checkout returns to billing", subscriptions.includes("/account/billing?subscription=success")],
  ["billing detects subscription activation", billing.includes("subscriptionActive") && billing.includes("refreshProfile()")],
  ["billing activation is not blocked by tester source", billing.includes("next.actualTier !== \"free\"") && billing.includes("next.subscriptionStatus === \"active\"")],
  ["export entitlement exists", config.includes('"data_export"')],
  ["export paid surface exists", workspace.includes("/paid/export") && workspace.includes("<DataExportFeature />")],
  ["all commercial surfaces represented", ["/paid/analytics","/paid/seller","/paid/marketplace","/paid/business","/paid/team","/paid/automation","/paid/support","/paid/api","/paid/branding"].every((route) => workspace.includes(route))],
  ["every workspace has My Account navigation", ["titan_pro","titan_seller","business_starter","business_plus","business_advanced","rescue"].every((id) => workspaceProducts.includes(`id:\"${id}\"`) && workspaceProducts.includes(`label:\"My Account\",path:\"/account\"`))],
  ["actionable paywall", gate.includes("Compare plans") && gate.includes('to="/plans"')],
  ["promotion catalogue exists", fs.existsSync(path.join(root, "src", "config", "paidPromotions.ts"))],
  ["promotion claim service exists", fs.existsSync(path.join(root, "src", "services", "paidPromotionService.ts"))],
  ["promotion backend exported", fs.existsSync(path.join(root, "functions", "paidPromotions.js"))],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ test: "paid-tier-contract", status: failures.length ? "fail" : "pass", checked: checks.length, failures }, null, 2));
if (failures.length) process.exit(1);
