import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const config = read("src/config/paidTiers.ts");
const workspace = read("src/pages/PaidFeatureWorkspace.tsx");
const workspaceProducts = read("src/config/workspaceProducts.ts");
const gate = read("src/components/PaidTierGate.tsx");
const checks = [
  ["tier catalogue exists", config.includes("PAID_TIER_CATALOG")],
  ["all six tiers registered", ["free","titan_pro","titan_seller","business_starter","business_plus","business_advanced"].every((id) => config.includes(id))],
  ["export entitlement exists", config.includes('"data_export"')],
  ["export paid surface exists", workspace.includes('"/paid/export"') && workspace.includes("<DataExportFeature />")],
  ["all commercial surfaces represented", ["/paid/analytics","/paid/seller","/paid/marketplace","/paid/business","/paid/team","/paid/automation","/paid/support","/paid/api","/paid/branding"].every((route) => workspace.includes(route))],
  ["every workspace has My Account navigation", ["titan_pro","titan_seller","business_starter","business_plus","business_advanced","rescue"].every((id) => workspaceProducts.includes(`id:"${id}"`) && workspaceProducts.includes(`label:"My Account",path:"/account"`))],
  ["actionable paywall", gate.includes("Compare plans") && gate.includes('to="/plans"')],
  ["retired room not in paid catalogue", !config.includes('"reptile_room"')],
  ["retired room not in paid feature centre", !workspace.includes("Open Reptile Room") && !workspace.includes('to="/reptile-room"')],
  ["promotion catalogue exists", fs.existsSync(path.join(root, "src", "config", "paidPromotions.ts"))],
  ["promotion claim service exists", fs.existsSync(path.join(root, "src", "services", "paidPromotionService.ts"))],
  ["promotion backend exported", fs.existsSync(path.join(root, "functions", "paidPromotions.js"))],
  ["promotion disabled by default", read("src/config/paidPromotions.ts").includes("enabled: false")],
  ["plans promotion hook exists", read("src/pages/PaidPlans.tsx").includes("Start free trial")],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ test: "paid-tier-contract", status: failures.length ? "fail" : "pass", checked: checks.length, failures }, null, 2));
if (failures.length) process.exit(1);
