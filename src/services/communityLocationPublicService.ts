import { doc, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebase/config";
import { resolveCommunityLocation } from "./communityLocationResolver";
import { getPrivacyPreferences } from "./privacyService";
import { getCommunityLocationMembers } from "./communityLocationService";

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

function aggregateCreatorFallback(
  members: Awaited<ReturnType<typeof getCommunityLocationMembers>>,
): PublicCommunityLocation[] {
  const grouped = new Map<string, PublicCommunityLocation>();
  for (const member of members) {
    const existing = grouped.get(member.areaId);
    if (existing) {
      existing.memberCount += 1;
      continue;
    }
    grouped.set(member.areaId, {
      areaId: member.areaId,
      city: member.city,
      country: member.country,
      latitude: Number(member.latitude.toFixed(2)),
      longitude: Number(member.longitude.toFixed(2)),
      memberCount: 1,
    });
  }
  return Array.from(grouped.values());
}

export async function getPublicCommunityLocations(): Promise<PublicCommunityLocation[]> {
  try {
    const response = await getCommunityLocationAreas(undefined);
    const areas = Array.isArray(response.data.areas) ? response.data.areas : [];
    return areas.filter(isValidPublicLocation).map((location) => ({
      ...location,
      latitude: Number(location.latitude.toFixed(2)),
      longitude: Number(location.longitude.toFixed(2)),
      memberCount: Math.floor(location.memberCount),
    }));
  } catch (error) {
    // Creator-only fallback keeps the homepage usable during a Functions/index migration.
    // Only aggregated city-level coordinates are returned to the caller.
    try {
      const members = await getCommunityLocationMembers();
      return aggregateCreatorFallback(members);
    } catch (fallbackError) {
      console.warn("Tiny Titans: public community location feed failed", { error, fallbackError });
      throw error;
    }
  }
}

export async function getOwnCommunityLocation(uid: string): Promise<OwnCommunityLocation | null> {
  if (!uid) return null;
  try {
    const [privacy, userSnapshot] = await Promise.all([
      getPrivacyPreferences(uid),
      getDoc(doc(db, "users", uid)),
    ]);
    if (!privacy.communityLocation || !userSnapshot.exists()) return null;
    const location = userSnapshot.data().approximateLocation as Record<string, unknown> | undefined;
    if (!location) return null;
    const city = String(location.city ?? "").trim();
    const country = String(location.country ?? "").trim();
    if (!city || !country) return null;

    const storedLatitude = Number(location.latitude);
    const storedLongitude = Number(location.longitude);
    if (isValidCoordinate(storedLatitude, -90, 90) && isValidCoordinate(storedLongitude, -180, 180) && !(storedLatitude === 0 && storedLongitude === 0)) {
      return {
        areaId: String(location.areaId ?? `legacy-${city.toLocaleLowerCase("en-GB")}-${country.toLocaleLowerCase("en-GB")}`),
        city,
        country,
        countryCode: typeof location.countryCode === "string" ? location.countryCode : undefined,
        latitude: Number(storedLatitude.toFixed(2)),
        longitude: Number(storedLongitude.toFixed(2)),
        memberCount: 1,
        optedIn: true,
      };
    }

    try {
      const resolved = await resolveCommunityLocation(city, country);
      return { ...resolved, memberCount: 1, optedIn: true };
    } catch {
      return null;
    }
  } catch (error) {
    console.warn("Tiny Titans: own community location could not be read", error);
    return null;
  }
}
