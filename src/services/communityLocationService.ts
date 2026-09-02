import { collection, getCountFromServer, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "./privacyService";
import { resolveCommunityLocation, type ResolvedCommunityLocation } from "./communityLocationResolver";

export type CommunityLocationMember = {
  uid: string;
  displayName: string;
  role: string;
  city: string;
  country: string;
  areaId: string;
  latitude: number;
  longitude: number;
  snakeCount?: number;
};

type AnyRecord = Record<string, unknown>;

function hasValidCoordinates(location: AnyRecord | undefined): location is AnyRecord & { latitude: number; longitude: number } {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    && !(latitude === 0 && longitude === 0);
}

async function getTrackedSnakeCount(uid: string): Promise<number | undefined> {
  const snakes = collection(db, "users", uid, "snakes");
  try {
    const snapshot = await getCountFromServer(snakes);
    return snapshot.data().count;
  } catch (countError) {
    try {
      const snapshot = await getDocs(snakes);
      return snapshot.size;
    } catch (readError) {
      console.warn("Tiny Titans: unable to read community snake count", { uid, countError, readError });
      return undefined;
    }
  }
}

async function buildCanonicalLocation(location: AnyRecord, city: string, country: string): Promise<ResolvedCommunityLocation | null> {
  if (hasValidCoordinates(location)) {
    return {
      city,
      country,
      areaId: typeof location.areaId === "string" && location.areaId.trim()
        ? location.areaId.trim()
        : `legacy-${city.toLocaleLowerCase("en-GB")}-${country.toLocaleLowerCase("en-GB")}`,
      latitude: Number(location.latitude.toFixed(2)),
      longitude: Number(location.longitude.toFixed(2)),
      precision: "city",
      source: "open-meteo-geocoding",
      countryCode: typeof location.countryCode === "string" ? location.countryCode : undefined,
    };
  }

  try {
    return await resolveCommunityLocation(city, country);
  } catch {
    return null;
  }
}

/** Creator-only community location intelligence using the canonical privacy document and city-level coordinates. */
export async function getCommunityLocationMembers(): Promise<CommunityLocationMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  const candidates = await Promise.all(snapshot.docs.map(async (item) => {
    const data = item.data() as AnyRecord;
    const preferences = await getPrivacyPreferences(item.id).catch(() => null);
    if (!preferences?.communityLocation) return null;

    const location = data.approximateLocation as AnyRecord | undefined;
    if (location?.visibleToCreator !== true) return null;

    const city = String(location?.city ?? "").trim();
    const country = String(location?.country ?? "").trim();
    if (!city || !country) return null;

    const canonical = await buildCanonicalLocation(location, city, country);
    if (!canonical) return null;

    return {
      uid: item.id,
      displayName: String(data.displayName ?? "").trim() || "Anonymous Titan",
      role: String(data.role ?? "user").trim() || "user",
      city: canonical.city,
      country: canonical.country,
      areaId: canonical.areaId,
      latitude: canonical.latitude,
      longitude: canonical.longitude,
    } satisfies CommunityLocationMember;
  }));

  const eligible = candidates.filter((member): member is CommunityLocationMember => member !== null);
  return Promise.all(eligible.map(async (member) => {
    const snakeCount = await getTrackedSnakeCount(member.uid);
    return snakeCount === undefined ? member : { ...member, snakeCount };
  }));
}
