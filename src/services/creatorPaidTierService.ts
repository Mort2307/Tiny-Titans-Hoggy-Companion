import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";
import type { PaidTierId } from "../config/paidTiers";
import type { TierNotification, TierSummary, TierUser } from "../types/creatorPaidTier";

const functions = getFunctions(app, "europe-west2");
const getUsersCallable = httpsCallable<void, { success: boolean; users: TierUser[]; summary: TierSummary; generatedAt: number }>(functions, "getCreatorPaidTierUsers");
const getNotificationsCallable = httpsCallable<void, { success: boolean; notifications: TierNotification[]; unreadCount: number }>(functions, "getCreatorPaidTierNotifications");
const markReadCallable = httpsCallable<{ eventId: string }, { success: boolean }>(functions, "markCreatorPaidTierNotificationRead");
const grantTrialCallable = httpsCallable<{ targetUid: string; tier: PaidTierId; durationDays: number }, { success: boolean; targetUid: string; tier: PaidTierId; durationDays: number; expiresAt: number }>(functions, "grantPaidTrial");
const revokeTrialCallable = httpsCallable<{ targetUid: string }, { success: boolean; targetUid: string; tier: PaidTierId; revoked: boolean }>(functions, "revokePaidTrial");

export function dateValue(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && value !== null) {
    const object = value as { toMillis?: unknown; _seconds?: unknown };
    if (typeof object.toMillis === "function") return Number((object.toMillis as () => number)());
    if (typeof object._seconds === "number") return object._seconds * 1000;
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatTierDate(value: unknown) {
  const millis = dateValue(value);
  return millis ? new Date(millis).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export async function loadPaidTierUsers() { return (await getUsersCallable()).data; }
export async function loadPaidTierNotifications() { return (await getNotificationsCallable()).data; }
export async function markPaidTierNotificationRead(eventId: string) { return (await markReadCallable({ eventId })).data; }
export async function grantPaidTierTrial(targetUid: string, tier: PaidTierId, durationDays: number) { return (await grantTrialCallable({ targetUid, tier, durationDays })).data; }
export async function revokePaidTierTrial(targetUid: string) { return (await revokeTrialCallable({ targetUid })).data; }
