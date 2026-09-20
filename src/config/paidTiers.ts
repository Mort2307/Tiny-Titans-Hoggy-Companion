import type { TinyTitansIconName } from "../components/TinyTitansIcon";

export const PAID_TIER_ORDER = ["free", "titan_pro", "titan_seller", "business_starter", "business_plus", "business_advanced", "rescue"] as const;

export type PaidTierId = (typeof PAID_TIER_ORDER)[number];
export type PaidTierSource = "subscription" | "tester" | "trial" | "free";
export type PaidTierTesterMode = "silent" | "visible";

export type PaidEntitlement =
  | "core_tracking"
  | "core_genetics"
  | "core_learning"
  | "core_community"
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
  | "custom_branding"
  | "rescue_workspace"
  | "rescue_qr_passports"
  | "species_incubator"
  | "rescue_team"
  | "rescue_medical_records"
  | "rescue_reporting"
  | "rescue_adoption";

export type PaidTierDefinition = {
  id: PaidTierId;
  name: string;
  shortLabel: string;
  crest: string;
  icon: TinyTitansIconName;
  prestige: "base" | "elite" | "commercial" | "business" | "executive";
  accent: string;
  priceGbpMonthly: number;
  priceLabel: string;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  priceGbpAnnual?: number;
  eyebrow: string;
  description: string;
  audience: string;
  entitlements: PaidEntitlement[];
  highlights: string[];
  note?: string;
};

const COMMON: PaidEntitlement[] = ["core_tracking", "core_genetics", "core_learning", "core_community"];
const RESCUE: PaidEntitlement[] = ["rescue_workspace", "rescue_qr_passports", "species_incubator", "rescue_team", "rescue_medical_records", "rescue_reporting", "rescue_adoption", "multi_user", "custom_branding", "data_export"];
const PAID_INTELLIGENCE: PaidEntitlement = "titan_intelligence";

export const PAID_TIER_CATALOG: Record<PaidTierId, PaidTierDefinition> = {
  free: { id: "free", name: "Free", icon: "reptile", shortLabel: "Free Keeper", crest: "◇", prestige: "base", accent: "#92a0ad", priceGbpMonthly: 0, priceLabel: "£0 / month", eyebrow: "EVERYDAY KEEPER", description: "A genuinely useful Tiny Titans experience, not a deliberately crippled demo.", audience: "Keepers exploring the core app", entitlements: COMMON, highlights: ["Core reptile records", "Core genetics and learning", "Community access", "No card required"] },
  titan_pro: { id: "titan_pro", name: "Titan Pro", icon: "titanIntelligence", shortLabel: "Pro Keeper", crest: "✦", prestige: "elite", accent: "#62d6c7", stripePriceIdMonthly: "price_1UGOyLI4DKNMJVXDHyHPiP9L", priceGbpMonthly: 6.99, priceLabel: "£6.99 / month", eyebrow: "POWER KEEPER", description: "A deeper personal toolkit for keepers who want more intelligence from the records they already create.", audience: "Serious keepers and multi-reptile households", entitlements: [...COMMON, "advanced_timeline", "advanced_analytics", PAID_INTELLIGENCE, "data_export"], highlights: ["Advanced analytics", "Smarter timelines and insights", "Ask Titan intelligence chat", "Data export", "Keeps the core app fully useful"] },
  titan_seller: { id: "titan_seller", name: "Titan Seller", icon: "sellerProfile", shortLabel: "Seller", crest: "◆", prestige: "commercial", accent: "#e5b35b", priceGbpMonthly: 3.99, priceLabel: "£3.99 / month", stripePriceIdMonthly: "price_1UGMnlI4DKNMJVXDu6Jk8j7G", eyebrow: "SELLER TOOLKIT", description: "A low-cost commercial layer for keepers who occasionally sell reptiles, pairings or equipment.", audience: "Keepers and small-scale sellers", entitlements: [...COMMON, PAID_INTELLIGENCE, "seller_profile", "marketplace_seller", "data_export"], highlights: ["Seller profile", "Marketplace tooling", "Ask Titan intelligence chat", "Seller-ready records", "Data export"] },
  business_starter: { id: "business_starter", name: "Business Starter", icon: "reporting", shortLabel: "Business Starter", crest: "⬢", prestige: "business", accent: "#6fb0ff", stripePriceIdMonthly: "price_1UGOyPI4DKNMJVXD61h9P4WX", priceGbpMonthly: 19.99, priceLabel: "£19.99 / month", eyebrow: "SMALL BUSINESS", description: "The first proper business workspace for breeders and reptile businesses moving beyond personal records.", audience: "Small breeders and reptile businesses", entitlements: [...COMMON, PAID_INTELLIGENCE, "advanced_timeline", "advanced_analytics", "breeding_suite", "morph_intelligence", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "custom_branding"], highlights: ["Business reporting", "Breeding and morph intelligence", "Ask Titan intelligence chat", "Multi-user workspace", "Seller tools", "Customer-facing branded page"], note: "Operational seat limits and business automation are enforced through the entitlement layer as those workflows go live." },
  business_plus: { id: "business_plus", name: "Business Plus", icon: "automation", shortLabel: "Business Plus", crest: "⬡", prestige: "business", accent: "#b98cff", stripePriceIdMonthly: "price_1UGOyRI4DKNMJVXDWQC1EIY0", priceGbpMonthly: 34.99, priceLabel: "£34.99 / month", eyebrow: "GROWING BUSINESS", description: "A broader workspace for businesses that need shared operations, reporting and repeatable workflows.", audience: "Established breeders and growing reptile businesses", entitlements: [...COMMON, PAID_INTELLIGENCE, "advanced_timeline", "advanced_analytics", "breeding_suite", "morph_intelligence", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "priority_support", "custom_branding"], highlights: ["Everything in Starter", "Ask Titan intelligence chat", "Team permissions", "Workflow automation", "Priority support", "Customer-facing branded page"] },
  business_advanced: { id: "business_advanced", name: "Business Advanced", icon: "api", shortLabel: "Business Advanced", crest: "♛", prestige: "executive", accent: "#f0c968", stripePriceIdMonthly: "price_1UGOyTI4DKNMJVXD5QXuppJe", priceGbpMonthly: 59.99, priceLabel: "£59.99 / month", eyebrow: "FULL BUSINESS", description: "The highest-capability Tiny Titans workspace for businesses that want the whole operating layer rather than isolated tools.", audience: "Professional breeders, teams and advanced reptile businesses", entitlements: [...COMMON, PAID_INTELLIGENCE, "advanced_timeline", "advanced_analytics", "breeding_suite", "morph_intelligence", "data_export", "marketplace_seller", "seller_profile", "business_reporting", "multi_user", "team_permissions", "automation", "api_access", "priority_support", "custom_branding"], highlights: ["Everything in Plus", "Ask Titan intelligence chat", "API access", "Advanced business intelligence", "Custom business presentation"] },
  rescue: { id: "rescue", name: "TinyTitans Rescue", icon: "veterinary", shortLabel: "Rescue", crest: "♜", prestige: "business", accent: "#7ad7a0", priceGbpMonthly: 59, priceLabel: "£59 / month", stripePriceIdMonthly: "price_1UG0zPI4DKNMJVXDEjjgN1T9", stripePriceIdAnnual: "price_1UG0l6I4DKNMJVXD88l4ZcLi", priceGbpAnnual: 590, eyebrow: "RESCUE OPERATIONS", description: "A dedicated rescue-centre workspace built around animal passports, team operations, veterinary records, QR identity, adoption workflows and safe species discovery.", audience: "Rescue centres and animal rescue organisations", entitlements: [...COMMON, PAID_INTELLIGENCE, ...RESCUE], highlights: ["Dedicated rescue workspace", "Unlimited staff", "Ask Titan intelligence chat", "QR animal passports", "Medical and care history", "Rescue reporting and adoption workflows", "Species discovery pipeline"], note: "Standard Rescue is £59/month or £590/year per organisation with unlimited staff. Creator-granted pilots remain free for 30 days and do not require Stripe billing." },
};

export function isPaidTierId(value: unknown): value is PaidTierId { return typeof value === "string" && PAID_TIER_ORDER.includes(value as PaidTierId); }
export function getPaidTierDefinition(tier: PaidTierId): PaidTierDefinition { return PAID_TIER_CATALOG[tier] ?? PAID_TIER_CATALOG.free; }
export function comparePaidTiers(a: PaidTierId, b: PaidTierId): number { return PAID_TIER_ORDER.indexOf(a) - PAID_TIER_ORDER.indexOf(b); }
export function tierIncludesEntitlement(tier: PaidTierId, entitlement: PaidEntitlement): boolean { return PAID_TIER_CATALOG[tier].entitlements.includes(entitlement); }
