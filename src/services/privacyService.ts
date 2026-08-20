import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { PrivacyPreferences } from "../types/privacy";

const DEFAULT_PRIVACY: PrivacyPreferences = {
  consentVersion: "1.1",
  communityLocation: false,
  anonymousAnalytics: false,
  communityHusbandryData: false,
  productUpdates: false,
};

export async function getPrivacyPreferences(uid: string): Promise<PrivacyPreferences> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  const snapshot = await getDoc(doc(db, "users", uid, "settings", "privacy"));
  if (!snapshot.exists()) return DEFAULT_PRIVACY;
  return { ...DEFAULT_PRIVACY, ...(snapshot.data() as Partial<PrivacyPreferences>) };
}

export async function savePrivacyPreferences(
  uid: string,
  next: Omit<PrivacyPreferences, "consentVersion" | "consentUpdatedAt">,
): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  await setDoc(doc(db, "users", uid, "settings", "privacy"), {
    ...next,
    consentVersion: DEFAULT_PRIVACY.consentVersion,
    consentUpdatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function clearCommunityLocation(uid: string): Promise<void> {
  if (!uid) throw new Error("Privacy preferences require an authenticated user.");
  await updateDoc(doc(db, "users", uid, "settings", "privacy"), {
    communityLocation: false,
    city: null,
    country: null,
    consentUpdatedAt: serverTimestamp(),
  });
}
