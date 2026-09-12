import type { TesterCheck } from "./testerBotService";
import { PAID_TIER_CATALOG, PAID_TIER_ORDER, tierIncludesEntitlement, type PaidEntitlement } from "../config/paidTiers";

const CORE: PaidEntitlement[] = ["core_tracking", "core_genetics", "core_learning", "core_community"];

export function createPaidTierRegressionChecks(): TesterCheck[] {
  return [
    {
      checkId: "paid-tier-catalog-complete",
      name: "Paid tier catalogue is complete",
      category: "paid-tiers",
      severity: "critical",
      run: async () => {
        const paid = PAID_TIER_ORDER.filter((tier) => tier !== "free");
        const invalid = paid.filter((tier) => {
          const item = PAID_TIER_CATALOG[tier];
          return !item || item.priceGbpMonthly <= 0 || !item.description.trim() || item.entitlements.length === 0;
        });
        return invalid.length
          ? { status: "fail", message: `Incomplete paid-tier definitions: ${invalid.join(", ")}.` }
          : { status: "pass", message: `All ${paid.length} paid tiers have pricing, descriptions and entitlement definitions.` };
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
  ];
}
