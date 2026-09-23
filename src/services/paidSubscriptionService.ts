import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import { getPaidAccess as getStoredPaidAccess, type PaidAccess } from "./paidTierService";
import type { PaidTierId } from "../config/paidTiers";

const functions = getFunctions(app, "europe-west2");
const startCheckoutCall = httpsCallable<{ tier: PaidTierId }, { url: string }>(functions, "createPaidSubscriptionCheckout");
const billingPortalCall = httpsCallable<Record<string, never>, { url: string }>(functions, "createPaidBillingPortalSession");

export type { PaidAccess };
export async function getPaidAccess(uid: string): Promise<PaidAccess> { return getStoredPaidAccess(uid); }
export async function startPaidSubscriptionCheckout(tier: PaidTierId): Promise<{ url: string }> { if (tier === "free") throw new Error("The Free plan does not require a subscription checkout."); return (await startCheckoutCall({ tier })).data; }
export async function openBillingPortal(): Promise<{ url: string }> { return (await billingPortalCall({})).data; }

export type LivePaidTierPrice = {
  configured: boolean;
  priceId?: string;
  unitAmount?: number | null;
  currency?: string;
  interval?: string;
  intervalCount?: number;
  lookupKey?: string;
};

export type PaidTierPricingResponse = {
  mode: "test" | "live";
  prices: Record<PaidTierId, LivePaidTierPrice>;
};

const pricingCall = httpsCallable<{ mode?: "test" | "live" }, { success: boolean; mode: "test" | "live"; prices: Record<PaidTierId, LivePaidTierPrice> }>(functions, "getPaidTierPricing");

export async function getPaidTierPricing(): Promise<Record<PaidTierId, LivePaidTierPrice>> {
  const response = await pricingCall({ mode: "live" });
  return response.data.prices;
}

export async function getPaidTierPricingEnvironment(): Promise<PaidTierPricingResponse> {
  const response = await pricingCall({ mode: "test" });
  return { mode: response.data.mode, prices: response.data.prices };
}
