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
