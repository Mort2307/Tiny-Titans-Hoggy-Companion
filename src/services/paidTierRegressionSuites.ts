import type { TesterCheck } from "./testerBotService";
import { PAID_TIER_CATALOG, PAID_TIER_ORDER, tierIncludesEntitlement, type PaidEntitlement } from "../config/paidTiers";
import { getPaidTierPricingEnvironment } from "./paidSubscriptionService";

const CORE: PaidEntitlement[] = ["core_tracking", "core_genetics", "core_learning", "core_community"];
const PAID_TIERS = PAID_TIER_ORDER.filter((tier) => tier !== "free");
const STRIPE_LOOKUP_KEYS: Record<string, string> = {
  titan_pro: "tinytitans_titan_pro_monthly",
  titan_seller: "tinytitans_titan_seller_monthly",
  business_starter: "tinytitans_business_starter_monthly",
  business_plus: "tinytitans_business_plus_monthly",
  business_advanced: "tinytitans_business_advanced_monthly",
};

export function createPaidTierRegressionChecks(): TesterCheck[] {
  return [
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
