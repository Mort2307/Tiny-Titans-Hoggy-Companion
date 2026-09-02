import { collection, doc, getDoc, getDocs, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "./privacyService";

export type PublicCommunityLocation = {
  areaId: string;
  city: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  memberCount: number;
};

export type OwnCommunityLocation = PublicCommunityLocation & {
  optedIn: boolean;
};

function hasValidCoordinates(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mapPublicLocation(id: string, value: Record<string, unknown>): PublicCommunityLocation | null {
  const city = String(value.city ?? "").trim();
  const country = String(value.country ?? "").trim();
  const latitude = value.latitude;
  const longitude = value.longitude;
  const memberCount = Number(value.memberCount ?? 0);
  if (!city || !country || !hasValidCoordinates(latitude) || !hasValidCoordinates(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !(latitude !== 0 || longitude !== 0) || !Number.isFinite(memberCount) || memberCount <= 0) return null;
  return {
    areaId: String(value.areaId ?? id),
    city,
    country,
    countryCode: typeof value.countryCode === "string" ? value.countryCode : undefined,
    latitude,
    longitude,
    memberCount: Math.floor(memberCount),
  };
}

export async function getPublicCommunityLocations(): Promise<PublicCommunityLocation[]> {
  const snapshot = await getDocs(collection(db, "communityLocationAreas"));
  return snapshot.docs.map((item) => mapPublicLocation(item.id, item.data() as Record<string, unknown>)).filter((item): item is PublicCommunityLocation => item !== null);
}

export function subscribeToPublicCommunityLocations(onChange: (locations: PublicCommunityLocation[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(db, "communityLocationAreas"), (snapshot) => {
    const locations = snapshot.docs.map((item) => mapPublicLocation(item.id, item.data() as Record<string, unknown>)).filter((item): item is PublicCommunityLocation => item !== null);
    onChange(locations);
  }, (error) => onError?.(error));
}

export async function getOwnCommunityLocation(uid: string): Promise<OwnCommunityLocation | null> {
  if (!uid) return null;
  const [privacy, userSnapshot] = await Promise.all([
    getPrivacyPreferences(uid),
    getDoc(doc(db, "users", uid)),
  ]);
  if (!privacy.communityLocation || !userSnapshot.exists()) return null;
  const location = userSnapshot.data().approximateLocation as Record<string, unknown> | undefined;
  if (!location) return null;
  const mapped = mapPublicLocation(String(location.areaId ?? ""), location);
  if (!mapped) return null;
  return { ...mapped, optedIn: true };
}
