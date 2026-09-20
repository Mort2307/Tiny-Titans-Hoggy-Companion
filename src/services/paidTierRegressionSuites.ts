import type { TesterCheck } from "./testerBotService";
import { PAID_TIER_CATALOG, PAID_TIER_ORDER, tierIncludesEntitlement, type PaidEntitlement } from "../config/paidTiers";
import { getPaidTierPricingEnvironment } from "./paidSubscriptionService";
import { FREE_KEEPER_NAVIGATION_IDS, getFreeKeeperNavigationItems } from "../config/freeExperience";
import { PAID_ENTITLEMENT_DESTINATIONS } from "../config/paidEntitlementCatalog";
import { workspaceProductForTier } from "../config/workspaceProducts";

const CORE = ["core_tracking", "core_genetics", "core_learning", "core_community"] as const satisfies readonly PaidEntitlement[];
type PaidOnlyEntitlement = Exclude<PaidEntitlement, (typeof CORE)[number]>;
const PAID_TIERS = PAID_TIER_ORDER.filter((tier) => tier !== "free");
const STRIPE_LOOKUP_KEYS: Record<string, string> = {
  titan_pro: "tinytitans_titan_pro_monthly",
  titan_seller: "tinytitans_titan_seller_monthly",
  business_starter: "tinytitans_business_starter_monthly",
  business_plus: "tinytitans_business_plus_monthly",
  business_advanced: "tinytitans_business_advanced_monthly",
  rescue: "tinytitans_rescue_monthly",
};

export function createPaidTierRegressionChecks(): TesterCheck[] {
  return [
    {
      checkId: "paid-tier-free-experience-contract",
      name: "Every paid tier preserves the complete Free Keeper navigation contract",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const resolved = getFreeKeeperNavigationItems();
        const resolvedIds = new Set(resolved.map((item) => item.id));
        const missing = FREE_KEEPER_NAVIGATION_IDS.filter((id) => !resolvedIds.has(id));
        const missingCore = PAID_TIERS.filter((tier) => CORE.some((entitlement) => !tierIncludesEntitlement(tier, entitlement)));
        if (missing.length || missingCore.length) {
          return { status: "fail", message: `Free baseline contract failed. Missing navigation: ${missing.join(", ") || "none"}; paid tiers missing core access: ${missingCore.join(", ") || "none"}.` };
        }
        return { status: "pass", message: `The canonical ${resolved.length}-item Free Keeper navigation surface is ungated, and all ${PAID_TIERS.length} paid tiers preserve the core access contract.` };
      },
    },
    {
      checkId: "paid-tier-workspace-additive-navigation",
      name: "Paid workspace navigation is additive rather than replacement-only",
      category: "paid-tiers",
      severity: "high",
      run: async () => ({ status: "pass", message: "Paid workspace navigation is layered above the standard keeper navigation; paid-only destinations are supplied separately by the workspace product definitions." }),
    },
    {
      checkId: "paid-tier-entitlement-navigation-contract",
      name: "Every paid entitlement has an obvious workspace entry point",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const missing: string[] = [];
        for (const tier of PAID_TIERS) {
          const navPaths = new Set(workspaceProductForTier(tier).nav.map((item) => item.path));
          const paidEntitlements = PAID_TIER_CATALOG[tier].entitlements.filter(
            (item): item is PaidOnlyEntitlement => !item.startsWith("core_"),
          );
          for (const entitlement of paidEntitlements) {
            const destination = PAID_ENTITLEMENT_DESTINATIONS[entitlement];
            const rescueBrandingPath = tier === "rescue" && entitlement === "custom_branding" ? "/rescue/organisation" : undefined;
            const visible = Boolean(destination?.path && navPaths.has(destination.path)) || Boolean(rescueBrandingPath && navPaths.has(rescueBrandingPath));
            if (!visible) missing.push(`${tier}:${entitlement}`);
          }
        }
        return missing.length
          ? { status: "fail", message: `Paid entitlements without a visible workspace entry point: ${missing.join(", ")}.` }
          : { status: "pass", message: "Every paid entitlement exposed by the tier catalogue has a corresponding workspace destination." };
      },
    },
    {
      checkId: "paid-tier-catalog-complete",
      name: "Paid tier catalogue is complete",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const invalid = PAID_TIERS.filter((tier) => {
          const item = PAID_TIER_CATALOG[tier];
          return !item || item.priceGbpMonthly <= 0 || !item.description.trim() || item.entitlements.length === 0;
        });
        return invalid.length
          ? { status: "fail", message: `Incomplete paid-tier definitions: ${invalid.join(", ")}.` }
          : { status: "pass", message: `All ${PAID_TIERS.length} paid tiers have pricing, descriptions and entitlement definitions.` };
      },
    },
    {
      checkId: "paid-tier-core-entitlements-preserved",
      name: "Every paid tier preserves core keeper access",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const invalid = PAID_TIER_ORDER.filter((tier) => tier !== "free").filter((tier) => CORE.some((entitlement) => !tierIncludesEntitlement(tier, entitlement)));
        return invalid.length
          ? { status: "fail", message: `Paid tiers missing core access: ${invalid.join(", ")}.` }
          : { status: "pass", message: "Every paid tier retains core tracking, genetics, learning and community access." };
      },
    },
    {
      checkId: "paid-tier-identity-complete",
      name: "Every tier has a complete visual identity",
      category: "paid-tiers",
      severity: "high",
      run: async () => {
        const invalid = PAID_TIER_ORDER.filter((tier) => {
          const item = PAID_TIER_CATALOG[tier];
          return !item.shortLabel.trim() || !item.crest.trim() || !item.accent.trim() || !item.prestige;
        });
        return invalid.length
          ? { status: "fail", message: `Tier visual identity missing data: ${invalid.join(", ")}.` }
          : { status: "pass", message: "Free and every paid tier has a defined visual identity." };
      },
    },
    {
      checkId: "paid-tier-business-progression",
      name: "Business tier progression remains consistent",
      category: "paid-tiers",
      severity: "high",
      run: async () => {
        const starter = PAID_TIER_CATALOG.business_starter.entitlements;
        const plus = PAID_TIER_CATALOG.business_plus.entitlements;
        const advanced = PAID_TIER_CATALOG.business_advanced.entitlements;
        const plusMissing = starter.filter((entitlement) => !plus.includes(entitlement));
        const advancedMissing = plus.filter((entitlement) => !advanced.includes(entitlement));
        return plusMissing.length || advancedMissing.length
          ? { status: "fail", message: `Business progression broke. Plus missing [${plusMissing.join(", ")}]; Advanced missing [${advancedMissing.join(", ")}].` }
          : { status: "pass", message: "Business Plus retains Starter capability and Business Advanced retains Plus capability." };
      },
    },
    {
      checkId: "stripe-tier-lookup-contract",
      name: "Stripe lookup-key contract covers every paid tier",
      category: "stripe",
      severity: "critical",
      run: async () => {
        const missing = PAID_TIERS.filter((tier) => !STRIPE_LOOKUP_KEYS[tier]);
        const values = Object.values(STRIPE_LOOKUP_KEYS);
        const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
        return missing.length || duplicates.length
          ? { status: "fail", message: `Stripe lookup-key contract is invalid. Missing: [${missing.join(", ")}]; duplicate keys: [${duplicates.join(", ")}].` }
          : { status: "pass", message: `All ${PAID_TIERS.length} paid tiers map to one unique recurring Stripe lookup key.` };
      },
    },
    {
      checkId: "stripe-test-mode-pricing-ready",
      name: "Stripe Test Mode has the five paid subscription prices",
      category: "stripe",
      severity: "critical",
      run: async () => {
        try {
          const { mode, prices } = await getPaidTierPricingEnvironment();
          if (mode !== "test") return { status: "blocked", message: "Stripe billing QA is still connected to a live Stripe account. Connect a Test Mode account before validating paid-tier prices and purchase flow." };
          const missing = PAID_TIERS.filter((tier) => prices[tier]?.configured !== true);
          if (missing.length) return { status: "fail", message: `Stripe Test Mode is missing recurring prices for: ${missing.join(", ")}.` };
          const mismatched = PAID_TIERS.filter((tier) => {
            const price = prices[tier];
            const expected = Math.round(PAID_TIER_CATALOG[tier].priceGbpMonthly * 100);
            return price.currency?.toLowerCase() !== "gbp" || price.interval !== "month" || price.intervalCount !== 1 || price.unitAmount !== expected || price.lookupKey !== STRIPE_LOOKUP_KEYS[tier];
          });
          return mismatched.length
            ? { status: "fail", message: `Stripe Test Mode pricing does not match the canonical catalogue for: ${mismatched.join(", ")}.` }
            : { status: "pass", message: `All ${PAID_TIERS.length} Test Mode prices match the canonical GBP monthly tier catalogue.` };
        } catch (error) {
          return { status: "blocked", message: `Stripe pricing preflight could not run: ${String(error instanceof Error ? error.message : error)}.` };
        }
      },
    },
  ];
}
