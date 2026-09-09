import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { CommunityMessagingDeclineReason, PrivacyPreferences } from "../types/privacy";
import { syncCommunityLocationMembership } from "./communityLocationSyncService";

export const PRIVACY_CONSENT_VERSION = "2026-09-09-community-messaging-v5";

const DEFAULT_PRIVACY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  communityMessaging: false,
  communityMessagingDeclineReason: null,
  communityMessagingDeclineReasonDetail: null,
  productUpdates: false,
};

type LegacyPreferences = {
  approximateLocation?: unknown;
  analytics?: unknown;
  productUpdates?: unknown;
  communityMessaging?: unknown;
};

function cleanDeclineReason(value: unknown): CommunityMessagingDeclineReason | null {
  return value === "dont-want-messages" || value === "privacy-concern" || value === "dont-understand" || value === "dont-trust-messaging" || value === "other" ? value : null;
}

function cleanDeclineDetail(value: unknown): string | null {
  const detail = String(value ?? "").trim().slice(0, 500);
  return detail || null;
}

export async function getPrivacyPreferences(uid: string): Promise<PrivacyPreferences> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  const privacyRef = doc(db, "users", uid, "settings", "privacy");
  const snapshot = await getDoc(privacyRef);

  if (snapshot.exists()) {
    const data = snapshot.data() as Partial<PrivacyPreferences> & { approximateLocation?: unknown };
    const userSnapshot = await getDoc(doc(db, "users", uid));
    const legacy = (userSnapshot.data()?.dataCollectionPreferences ?? {}) as LegacyPreferences;
    const hasCanonicalCommunityLocation = Object.prototype.hasOwnProperty.call(data, "communityLocation");
    const hasCanonicalCommunityMessaging = Object.prototype.hasOwnProperty.call(data, "communityMessaging");
    return {
      ...DEFAULT_PRIVACY,
      ...data,
      communityLocation: hasCanonicalCommunityLocation
        ? data.communityLocation === true
        : legacy.approximateLocation === true,
      communityMessaging: hasCanonicalCommunityMessaging
        ? data.communityMessaging === true
        : legacy.communityMessaging === true,
      communityMessagingDeclineReason: cleanDeclineReason(data.communityMessagingDeclineReason),
      communityMessagingDeclineReasonDetail: cleanDeclineDetail(data.communityMessagingDeclineReasonDetail),
      consentVersion: typeof data.consentVersion === "string" ? data.consentVersion : "",
    };
  }

  const userSnapshot = await getDoc(doc(db, "users", uid));
  if (!userSnapshot.exists()) return DEFAULT_PRIVACY;
  const legacy = userSnapshot.data().dataCollectionPreferences as LegacyPreferences | undefined;
  if (!legacy) return DEFAULT_PRIVACY;
  return {
    ...DEFAULT_PRIVACY,
    communityLocation: legacy.approximateLocation === true,
    anonymousAnalytics: legacy.analytics === true,
    communityMessaging: legacy.communityMessaging === true,
    productUpdates: legacy.productUpdates === true,
  };
}

export async function savePrivacyPreferences(
  uid: string,
  next: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">,
): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  const communityMessaging = next.communityMessaging === true;
  const reason = communityMessaging ? null : cleanDeclineReason(next.communityMessagingDeclineReason);
  const detail = communityMessaging ? null : cleanDeclineDetail(next.communityMessagingDeclineReasonDetail);
  await setDoc(doc(db, "users", uid, "settings", "privacy"), {
    ...next,
    communityMessaging,
    communityMessagingDeclineReason: reason,
    communityMessagingDeclineReasonDetail: detail,
    consentVersion: PRIVACY_CONSENT_VERSION,
    consentUpdatedAt: serverTimestamp(),
  }, { merge: true });
  if (typeof next.communityLocation === "boolean") await syncCommunityLocationMembership();
}

export async function clearCommunityLocation(uid: string): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  await Promise.all([
    setDoc(doc(db, "users", uid, "settings", "privacy"), {
      communityLocation: false,
      city: null,
      country: null,
      consentVersion: PRIVACY_CONSENT_VERSION,
      consentUpdatedAt: serverTimestamp(),
    }, { merge: true }),
    updateDoc(doc(db, "users", uid), { approximateLocation: null, updatedAt: serverTimestamp() }),
  ]);
  await syncCommunityLocationMembership();
}
