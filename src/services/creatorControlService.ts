import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type CreatorFeatureKey =
  | "communityGlobe"
  | "wallOfTitans"
  | "titanSupport"
  | "feedingTracker"
  | "shedTracker"
  | "weightTracker"
  | "geneticsCalculator"
  | "knowledgeBase"
  | "titansChallenge"
  | "morphSubmissions";

export type CreatorAppSettings = Record<CreatorFeatureKey, boolean> & {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt?: unknown;
  updatedBy?: string;
};

export const DEFAULT_CREATOR_APP_SETTINGS: CreatorAppSettings = {
  communityGlobe: true,
  wallOfTitans: true,
  titanSupport: true,
  feedingTracker: true,
  shedTracker: true,
  weightTracker: true,
  geneticsCalculator: true,
  knowledgeBase: true,
  titansChallenge: true,
  morphSubmissions: true,
  maintenanceMode: false,
  maintenanceMessage: "Tiny Titans is temporarily undergoing maintenance. Please check back shortly.",
};

const settingsRef = doc(db, "appConfig", "creatorSettings");

export async function getCreatorAppSettings(): Promise<CreatorAppSettings> {
  const snapshot = await getDoc(settingsRef);
  if (!snapshot.exists()) return DEFAULT_CREATOR_APP_SETTINGS;
  return { ...DEFAULT_CREATOR_APP_SETTINGS, ...(snapshot.data() as Partial<CreatorAppSettings>) };
}

export async function saveCreatorAppSettings(settings: CreatorAppSettings, uid: string): Promise<void> {
  const { updatedAt: _updatedAt, ...safeSettings } = settings;
  await setDoc(settingsRef, { ...safeSettings, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
}
