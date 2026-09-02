import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { PrivacyPreferences } from "../types/privacy";
import { syncCommunityLocationMembership } from "./communityLocationSyncService";

export const PRIVACY_CONSENT_VERSION = "2026-09-02-community-location-v4";

const DEFAULT_PRIVACY: PrivacyPreferences = {
  consentVersion: "",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  productUpdates: false,
};

type LegacyPreferences = {
  approximateLocation?: unknown;
  analytics?: unknown;
  productUpdates?: unknown;
};

export async function getPrivacyPreferences(uid: string): Promise<PrivacyPreferences> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  const privacyRef = doc(db, "users", uid, "settings", "privacy");
  const snapshot = await getDoc(privacyRef);
  if (snapshot.exists()) {
    const data = snapshot.data() as Partial<PrivacyPreferences>;
    return { ...DEFAULT_PRIVACY, ...data, consentVersion: typeof data.consentVersion === "string" ? data.consentVersion : "" };
  }

  // Backward-compatible read-through for accounts created before the canonical privacy document existed.
  const userSnapshot = await getDoc(doc(db, "users", uid));
  if (!userSnapshot.exists()) return DEFAULT_PRIVACY;
  const legacy = userSnapshot.data().dataCollectionPreferences as LegacyPreferences | undefined;
  if (!legacy) return DEFAULT_PRIVACY;
  return {
    ...DEFAULT_PRIVACY,
    communityLocation: legacy.approximateLocation === true,
    anonymousAnalytics: legacy.analytics === true,
    productUpdates: legacy.productUpdates === true,
  };
}

export async function savePrivacyPreferences(
  uid: string,
  next: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">,
): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  await setDoc(doc(db, "users", uid, "settings", "privacy"), {
    ...next,
    consentVersion: PRIVACY_CONSENT_VERSION,
    consentUpdatedAt: serverTimestamp(),
  }, { merge: true });
  if (typeof next.communityLocation === "boolean") {
    await syncCommunityLocationMembership();
  }
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
