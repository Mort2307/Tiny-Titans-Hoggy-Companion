import type { PaidTierId } from "../config/paidTiers";

export type TierUser = {
  uid: string; displayName: string; email: string; role: string; profileType: string;
  actualTier: PaidTierId; effectiveTier: PaidTierId;
  source: "free" | "subscription" | "tester" | "trial";
  subscriptionStatus: string; currentPeriodEnd: number | null; testerExpiry: number | null;
  trialExpiry: number | null; trialStartedAt: number | null;
};

export type TierSummary = {
  total: number; trials: number; paid: number; testers: number; free: number;
  titan_pro: number; titan_seller: number; business_starter: number;
  business_plus: number; business_advanced: number;
};

export type TierNotification = {
  id: string; title: string; body: string; tier: PaidTierId; tierName: string;
  activationKind: "trial" | "subscription"; targetUid: string; targetName: string;
  createdAt?: { _seconds?: number } | { toMillis?: () => number } | string;
  read?: boolean; status?: string;
};
