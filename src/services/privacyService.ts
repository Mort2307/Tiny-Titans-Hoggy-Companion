import { collection, doc, getDocs, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { PRIVACY_CONSENT_VERSION, type CommunityLocationAggregate, type PrivacyPreferences } from "../types/privacy";

const DEFAULT_PRIVACY: PrivacyPreferences = {
  consentVersion: PRIVACY_CONSENT_VERSION,
  communityLocation: false,
  anonymousAnalytics: false,
  productUpdates: false,
};

export async function getPrivacyPreferences(uid: string): Promise<PrivacyPreferences> {
  const snapshot = await getDoc(doc(db, "users", uid, "privacy", "preferences"));
  if (!snapshot.exists()) return DEFAULT_PRIVACY;
  const data = snapshot.data() as Partial<PrivacyPreferences>;
  return {
    ...DEFAULT_PRIVACY,
    ...data,
    consentVersion: typeof data.consentVersion === "string" ? data.consentVersion : PRIVACY_CONSENT_VERSION,
    city: typeof data.city === "string" ? data.city.trim() : undefined,
    country: typeof data.country === "string" ? data.country.trim() : undefined,
  };
}

export async function savePrivacyPreferences(uid: string, preferences: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">): Promise<void> {
  const payload: PrivacyPreferences = {
    ...preferences,
    consentVersion: PRIVACY_CONSENT_VERSION,
    consentUpdatedAt: serverTimestamp(),
    city: preferences.communityLocation ? preferences.city?.trim() || undefined : undefined,
    country: preferences.communityLocation ? preferences.country?.trim() || undefined : undefined,
  };
  await setDoc(doc(db, "users", uid, "privacy", "preferences"), payload, { merge: true });
}

export async function clearCommunityLocation(uid: string): Promise<void> {
  await setDoc(doc(db, "users", uid, "privacy", "preferences"), {
    communityLocation: false,
    city: null,
    country: null,
    consentVersion: PRIVACY_CONSENT_VERSION,
    consentUpdatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Creator-only aggregation. This intentionally returns counts only and never
 * exposes a user's UID, address or precise coordinates.
 */
export async function getCommunityLocationAggregates(): Promise<CommunityLocationAggregate[]> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const counts = new Map<string, CommunityLocationAggregate>();
  for (const userDoc of usersSnapshot.docs) {
    const preferencesSnapshot = await getDoc(doc(db, "users", userDoc.id, "privacy", "preferences"));
    if (!preferencesSnapshot.exists()) continue;
    const data = preferencesSnapshot.data() as Partial<PrivacyPreferences>;
    if (data.communityLocation !== true || typeof data.city !== "string" || typeof data.country !== "string") continue;
    const city = data.city.trim(); const country = data.country.trim();
    if (!city || !country) continue;
    const key = `${country.toLocaleLowerCase()}|${city.toLocaleLowerCase()}`;
    const existing = counts.get(key);
    if (existing) existing.users += 1;
    else counts.set(key, { country, city, users: 1 });
  }
  return [...counts.values()].sort((a, b) => b.users - a.users || a.country.localeCompare(b.country) || a.city.localeCompare(b.city));
}
