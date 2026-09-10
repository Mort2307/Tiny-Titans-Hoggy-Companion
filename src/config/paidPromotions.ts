export type PaidPromotionKind = "trial" | "credit";

export type PaidPromotionDefinition = {
  id: string;
  name: string;
  tier: "titan_pro" | "titan_seller" | "business_starter" | "business_plus" | "business_advanced";
  kind: PaidPromotionKind;
  durationDays: number;
  enabled: boolean;
  audience: "new_users" | "all_free_users" | "creator_only";
  description: string;
};

export const PAID_PROMOTIONS: Record<string, PaidPromotionDefinition> = {
  launch_pro_30: {
    id: "launch_pro_30",
    name: "Titan Pro · 30 Day Launch Trial",
    tier: "titan_pro",
    kind: "trial",
    durationDays: 30,
    enabled: false,
    audience: "new_users",
    description: "A one-time 30-day Titan Pro experience with no card required.",
  },
};

export function getPaidPromotion(id: string): PaidPromotionDefinition | null {
  return PAID_PROMOTIONS[id] ?? null;
}
