import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import { getPaidTierDefinition, isPaidTierId, type PaidEntitlement, type PaidTierId, type PaidTierSource, type PaidTierTesterMode } from "../config/paidTiers";

export type PaidTesterOverride = { enabled: boolean; tier: PaidTierId; mode: PaidTierTesterMode; grantedByUid?: string; grantedAt?: unknown; expiresAt?: unknown | null };
export type PaidTrial = { enabled: boolean; tier: PaidTierId; durationDays?: number; startedAt?: unknown; grantedAt?: unknown; grantedByUid?: string; expiresAt?: unknown | null };
export type PaidAccess = { actualTier: PaidTierId; effectiveTier: PaidTierId; source: PaidTierSource; subscriptionStatus: string; currentPeriodEnd?: unknown; testerOverride?: PaidTesterOverride | null; trial?: PaidTrial | null };

type ServerPaidAccess = { success: boolean; uid: string; actualTier: PaidTierId; effectiveTier: PaidTierId; source: PaidTierSource; subscriptionStatus: string; currentPeriodEnd?: unknown; testerOverride?: PaidTesterOverride | null; trial?: PaidTrial | null };

const functions = getFunctions(app, "europe-west2");
const getPaidTierAccessCall = httpsCallable<{ uid?: string }, ServerPaidAccess>(functions, "getPaidTierAccess");
const setTesterOverrideCall = httpsCallable<{ targetUid: string; enabled: boolean; tier: PaidTierId; mode: PaidTierTesterMode; expiresAt?: string | null }, { success: boolean; targetUid: string; effectiveTier: PaidTierId; enabled: boolean }>(functions, "setPaidTesterOverride");

export async function getPaidAccess(uid: string): Promise<PaidAccess> {
  if (!uid) throw new Error("A user ID is required to resolve paid access.");
  const response = await getPaidTierAccessCall({ uid });
  const data = response.data;
  return {
    actualTier: isPaidTierId(data.actualTier) ? data.actualTier : "free",
    effectiveTier: isPaidTierId(data.effectiveTier) ? data.effectiveTier : "free",
    source: data.source === "subscription" || data.source === "tester" || data.source === "trial" ? data.source : "free",
    subscriptionStatus: String(data.subscriptionStatus || "free"),
    currentPeriodEnd: data.currentPeriodEnd,
    testerOverride: data.testerOverride || null,
    trial: data.trial || null,
  };
}

export async function hasPaidEntitlement(uid: string, entitlement: PaidEntitlement): Promise<boolean> {
  const access = await getPaidAccess(uid);
  return getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement);
}

export async function setPaidTesterOverride(targetUid: string, enabled: boolean, tier: PaidTierId = "free", mode: PaidTierTesterMode = "visible", expiresAt?: string | null) {
  if (!isPaidTierId(tier)) throw new Error("Invalid paid tester tier.");
  return (await setTesterOverrideCall({ targetUid, enabled, tier, mode, expiresAt: expiresAt ?? null })).data;
}
