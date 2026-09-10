import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebase/config";
import { getPaidTierDefinition, isPaidTierId, type PaidEntitlement, type PaidTierId, type PaidTierSource, type PaidTierTesterMode } from "../config/paidTiers";

export type PaidTesterOverride = { enabled: boolean; tier: PaidTierId; mode: PaidTierTesterMode; grantedByUid?: string; grantedAt?: unknown; expiresAt?: unknown | null };
export type PaidAccess = { actualTier: PaidTierId; effectiveTier: PaidTierId; source: PaidTierSource; subscriptionStatus: string; currentPeriodEnd?: unknown; testerOverride?: PaidTesterOverride | null };

const functions = getFunctions(app, "europe-west2");
function hasExpired(value: unknown): boolean { if (!value) return false; if (typeof value === "object" && value !== null && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") return Number((value as { toMillis: () => number }).toMillis()) < Date.now(); const millis = new Date(String(value)).getTime(); return Number.isFinite(millis) && millis < Date.now(); }

export async function getPaidAccess(uid: string): Promise<PaidAccess> {
  const snapshot = await getDoc(doc(db, "users", uid)); const data = snapshot.exists() ? snapshot.data() : {};
  const actualTier = isPaidTierId(data.subscriptionTier) ? data.subscriptionTier : "free";
  const rawOverride = data.paidTesterOverride as Partial<PaidTesterOverride> | undefined;
  const overrideTier = isPaidTierId(rawOverride?.tier) ? rawOverride.tier : null;
  const overrideEnabled = rawOverride?.enabled === true && Boolean(overrideTier) && !hasExpired(rawOverride?.expiresAt);
  const effectiveTier = overrideEnabled && overrideTier ? overrideTier : actualTier;
  const source: PaidTierSource = overrideEnabled ? "tester" : actualTier === "free" ? "free" : "subscription";
  return { actualTier, effectiveTier, source, subscriptionStatus: String(data.subscriptionStatus || (actualTier === "free" ? "free" : "active")), currentPeriodEnd: data.subscriptionCurrentPeriodEnd, testerOverride: overrideEnabled ? { ...(rawOverride as PaidTesterOverride), tier: overrideTier!, enabled: true } : null };
}

export async function hasPaidEntitlement(uid: string, entitlement: PaidEntitlement): Promise<boolean> { const access = await getPaidAccess(uid); return getPaidTierDefinition(access.effectiveTier).entitlements.includes(entitlement); }

export async function setPaidTesterOverride(targetUid: string, enabled: boolean, tier: PaidTierId = "free", mode: PaidTierTesterMode = "visible", expiresAt?: string | null) {
  if (!isPaidTierId(tier)) throw new Error("Invalid paid tester tier.");
  const call = httpsCallable<{ targetUid: string; enabled: boolean; tier: PaidTierId; mode: PaidTierTesterMode; expiresAt?: string | null }, { success: boolean; targetUid: string; effectiveTier: PaidTierId; enabled: boolean }>(functions, "setPaidTesterOverride");
  return (await call({ targetUid, enabled, tier, mode, expiresAt: expiresAt ?? null })).data;
}
