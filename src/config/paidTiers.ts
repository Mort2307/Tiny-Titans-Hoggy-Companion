export const PAID_TIER_ORDER = ["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced"] as const;

export type PaidTierId = (typeof PAID_TIER_ORDER)[number];
export type PaidTierSource = "subscription" | "tester" | "trial" | "free";
export type PaidTierTesterMode = "silent" | "visible";

export type PaidEntitlement =
  | "core_tracking"
  | "core_genetics"
  | "core_learning"
  | "core_community"
  | "smart_reminders"
  | "advanced_timeline"
  | "advanced_analytics"
  | "titan_intelligence"
  | "breeding_suite"
  | "morph_intelligence"
  | "data_export"
  | "marketplace_seller"
  | "seller_profile"
  | "business_reporting"
  | "multi_user"
  | "team_permissions"
  | "automation"
  | "api_access"
  | "priority_support"
  | "custom_branding";

export type PaidTierDefinition = {
  id: PaidTierId;
  name: string;
  priceGbpMonthly: number;
  priceLabel: string;
  eyebrow: string;
  description: string;
  audience: string;
  entitlements: PaidEntitlement[];
  highlights: string[];
  note?: string;
};

const COMMON: PaidEntitlement[] = ["core_tracking", "core_genetics", "core_learning", "core_community"];

export const PAID_TIER_CATALOG: Record<PaidTierId, PaidTierDefinition> = {
  free: { id: "free", name: "Free", priceGbpMonthly: 0, priceLabel: "£0 / month", eyebrow: "EVERYDAY KEEPER", description: "A genuinely useful Tiny Titans experience, not a deliberately crippled demo.", audience: "Keepers exploring the core app", entitlements: COMMON, highlights: ["Core reptile records", "Core genetics and learning", "Community access", "No card required"] },
  titan_pro: { id: "titan_pro", name: "Titan Pro", priceGbpMonthly: 6.99, priceLabel: "£6.99 / month", eyebrow: "POWER KEEPER", description: "A deeper personal toolkit for keepers who want more intelligence from the records they already create.", audience: "Serious keepers and multi-reptile households", entitlements: [...COMMON, "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "data_export"], highlights: ["Advanced analytics", "Smarter timelines and insights", "Data export", "Keeps the core app fully useful"] },
  titan_seller: { id: "titan_seller", name: "Titan Seller", priceGbpMonthly: 3.99, priceLabel: "£3.99 / month", eyebrow: "SELLER TOOLKIT", description: "A low-cost commercial layer for keepers who occasionally sell reptiles, pairings or equipment.", audience: "Keepers and small-scale sellers", entitlements: [...COMMON, "seller_profile", "marketplace_seller", "data_export"], highlights: ["Seller profile", "Marketplace tooling", "Seller-ready records", "Data export"] },
  business_starter: { id: "business_starter", name: "Business Starter", priceGbpMonthly: 19.99, priceLabel: "£19.99 / month", eyebrow: "SMALL BUSINESS", description: "The first proper business workspace for breeders and reptile businesses moving beyond personal records.", audience: "Small breeders and reptile businesses", entitlements: [...COMMON, "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user"], highlights: ["Business reporting", "Breeding and morph intelligence", "Multi-user workspace", "Seller tools"], note: "Seat limits and operational automation will be enforced through the entitlement layer as those business workflows go live." },
  business_plus: { id: "business_plus", name: "Business Plus", priceGbpMonthly: 34.99, priceLabel: "£34.99 / month", eyebrow: "GROWING BUSINESS", description: "A broader workspace for businesses that need shared operations, reporting and repeatable workflows.", audience: "Established breeders and growing reptile businesses", entitlements: [...COMMON, "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "priority_support"], highlights: ["Everything in Starter", "Team permissions", "Workflow automation", "Priority support"] },
  business_advanced: { id: "business_advanced", name: "Business Advanced", priceGbpMonthly: 59.99, priceLabel: "£59.99 / month", eyebrow: "FULL BUSINESS", description: "The highest-capability Tiny Titans workspace for businesses that want the whole operating layer rather than isolated tools.", audience: "Professional breeders, teams and advanced reptile businesses", entitlements: [...COMMON, "smart_reminders", "advanced_timeline", "advanced_analytics", "titan_intelligence", "breeding_suite", "morph_intelligence", "reptile_room", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "api_access", "priority_support", "custom_branding"], highlights: ["Everything in Plus", "API access", "Advanced business intelligence", "Custom business presentation"] },
};

export function isPaidTierId(value: unknown): value is PaidTierId { return typeof value === "string" && PAID_TIER_ORDER.includes(value as PaidTierId); }
export function getPaidTierDefinition(tier: PaidTierId): PaidTierDefinition { return PAID_TIER_CATALOG[tier] ?? PAID_TIER_CATALOG.free; }
export function comparePaidTiers(a: PaidTierId, b: PaidTierId): number { return PAID_TIER_ORDER.indexOf(a) - PAID_TIER_ORDER.indexOf(b); }
export function tierIncludesEntitlement(tier: PaidTierId, entitlement: PaidEntitlement): boolean { return PAID_TIER_CATALOG[tier].entitlements.includes(entitlement); }
