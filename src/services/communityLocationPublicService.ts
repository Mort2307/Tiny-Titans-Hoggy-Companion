import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebase/config";
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

type AreaResponse = { success: boolean; areas?: PublicCommunityLocation[] };

const functions = getFunctions(app, "europe-west2");
const getCommunityLocationAreas = httpsCallable<undefined, AreaResponse>(functions, "getCommunityLocationAreas");

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isValidPublicLocation(location: PublicCommunityLocation): boolean {
  return Boolean(location.areaId && location.city && location.country)
    && isValidCoordinate(location.latitude, -90, 90)
    && isValidCoordinate(location.longitude, -180, 180)
    && !(location.latitude === 0 && location.longitude === 0)
    && Number.isInteger(location.memberCount) && location.memberCount > 0;
}

export async function getPublicCommunityLocations(): Promise<PublicCommunityLocation[]> {
  const response = await getCommunityLocationAreas(undefined);
  const areas = Array.isArray(response.data.areas) ? response.data.areas : [];
  return areas.filter(isValidPublicLocation).map((location) => ({
    ...location,
    latitude: Number(location.latitude.toFixed(2)),
    longitude: Number(location.longitude.toFixed(2)),
    memberCount: Math.floor(location.memberCount),
  }));
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
  const city = String(location.city ?? "").trim();
  const country = String(location.country ?? "").trim();
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!city || !country || !isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180) || (latitude === 0 && longitude === 0)) return null;
  return {
    areaId: String(location.areaId ?? `legacy-${city.toLocaleLowerCase("en-GB")}-${country.toLocaleLowerCase("en-GB")}`),
    city,
    country,
    countryCode: typeof location.countryCode === "string" ? location.countryCode : undefined,
    latitude: Number(latitude.toFixed(2)),
    longitude: Number(longitude.toFixed(2)),
    memberCount: 1,
    optedIn: true,
  };
}
