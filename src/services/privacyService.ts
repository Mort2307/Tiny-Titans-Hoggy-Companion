import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { PrivacyPreferences } from "../types/privacy";
import { syncCommunityLocationMembership } from "./communityLocationSyncService";

export const PRIVACY_CONSENT_VERSION = "2026-09-09-intelligence-permissions-v5";
const DEFAULT_PRIVACY: PrivacyPreferences = { consentVersion: "", communityLocation: false, anonymousAnalytics: false, communityHusbandryData: false, personalIntelligence: false, communityContribution: false, communityIntelligence: false, communityMessaging: false, communityMessagingDeclineReason: null, communityMessagingDeclineReasonDetail: null, productUpdates: false };
type LegacyPreferences = { approximateLocation?: unknown; analytics?: unknown; communityHusbandryData?: unknown; productUpdates?: unknown; consentVersion?: unknown };
function bool(value: unknown) { return value === true; }
export async function getPrivacyPreferences(uid: string): Promise<PrivacyPreferences> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  const privacyRef = doc(db, "users", uid, "settings", "privacy"); const snapshot = await getDoc(privacyRef); const userSnapshot = await getDoc(doc(db, "users", uid)); const legacy = (userSnapshot.data()?.dataCollectionPreferences ?? {}) as LegacyPreferences;
  if (snapshot.exists()) {
    const data = snapshot.data() as Partial<PrivacyPreferences> & { approximateLocation?: unknown }; const legacyHusbandry = bool(data.communityHusbandryData) || bool(legacy.communityHusbandryData);
    return { ...DEFAULT_PRIVACY, ...data, communityLocation: Object.prototype.hasOwnProperty.call(data, "communityLocation") ? bool(data.communityLocation) : bool(legacy.approximateLocation), anonymousAnalytics: Object.prototype.hasOwnProperty.call(data, "anonymousAnalytics") ? bool(data.anonymousAnalytics) : bool(legacy.analytics), communityHusbandryData: legacyHusbandry, personalIntelligence: Object.prototype.hasOwnProperty.call(data, "personalIntelligence") ? bool(data.personalIntelligence) : legacyHusbandry, communityContribution: Object.prototype.hasOwnProperty.call(data, "communityContribution") ? bool(data.communityContribution) : legacyHusbandry, communityIntelligence: Object.prototype.hasOwnProperty.call(data, "communityIntelligence") ? bool(data.communityIntelligence) : legacyHusbandry, communityMessaging: bool(data.communityMessaging), consentVersion: typeof data.consentVersion === "string" ? data.consentVersion : "" };
  }
  if (!userSnapshot.exists()) return DEFAULT_PRIVACY; const legacyHusbandry = bool(legacy.communityHusbandryData);
  return { ...DEFAULT_PRIVACY, communityLocation: bool(legacy.approximateLocation), anonymousAnalytics: bool(legacy.analytics), communityHusbandryData: legacyHusbandry, personalIntelligence: legacyHusbandry, communityContribution: legacyHusbandry, communityIntelligence: legacyHusbandry, productUpdates: bool(legacy.productUpdates), consentVersion: typeof legacy.consentVersion === "string" ? legacy.consentVersion : "" };
}
export type PrivacyPreferenceUpdate = Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">;
export async function savePrivacyPreferences(uid: string, next: PrivacyPreferenceUpdate): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  const personalIntelligence = typeof next.personalIntelligence === "boolean" ? next.personalIntelligence : next.communityHusbandryData === true;
  const communityContribution = typeof next.communityContribution === "boolean" ? next.communityContribution : next.communityHusbandryData === true;
  const communityIntelligence = typeof next.communityIntelligence === "boolean" ? next.communityIntelligence : next.communityHusbandryData === true;
  const communityMessaging = next.communityMessaging === true;
  const sanitized: PrivacyPreferenceUpdate = {
    ...next,
    personalIntelligence,
    communityContribution,
    communityIntelligence,
    communityMessaging,
    communityMessagingDeclineReason: communityMessaging ? null : (next.communityMessagingDeclineReason ?? null),
    communityMessagingDeclineReasonDetail: communityMessaging ? null : (next.communityMessagingDeclineReasonDetail ?? null),
    communityHusbandryData: communityContribution,
  };
  await setDoc(doc(db, "users", uid, "settings", "privacy"), { ...sanitized, consentVersion: PRIVACY_CONSENT_VERSION, consentUpdatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, "users", uid), { dataCollectionPreferences: { approximateLocation: sanitized.communityLocation, analytics: sanitized.anonymousAnalytics, communityHusbandryData: sanitized.communityContribution, personalIntelligence: sanitized.personalIntelligence, communityContribution: sanitized.communityContribution, communityIntelligence: sanitized.communityIntelligence, communityMessaging: sanitized.communityMessaging, productUpdates: sanitized.productUpdates, consentVersion: PRIVACY_CONSENT_VERSION, consentUpdatedAt: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true });
  if (typeof sanitized.communityLocation === "boolean") await syncCommunityLocationMembership();
}
export async function clearCommunityLocation(uid: string): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  await Promise.all([setDoc(doc(db, "users", uid, "settings", "privacy"), { communityLocation: false, city: null, country: null, consentVersion: PRIVACY_CONSENT_VERSION, consentUpdatedAt: serverTimestamp() }, { merge: true }), updateDoc(doc(db, "users", uid), { approximateLocation: null, updatedAt: serverTimestamp() })]);
  await syncCommunityLocationMembership();
}
