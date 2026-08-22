import { collection, getCountFromServer, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getPrivacyPreferences } from "./privacyService";

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

/** Creator-only community location intelligence using the canonical privacy document. */
export async function getCommunityLocationMembers(): Promise<CommunityLocationMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  const candidates = await Promise.all(snapshot.docs.map(async (item) => {
    const data = item.data() as Record<string, unknown>;
    const preferences = await getPrivacyPreferences(item.id).catch(() => null);
    if (!preferences?.communityLocation) return null;

    const location = data.approximateLocation as Record<string, unknown> | undefined;
    if (location?.visibleToCreator !== true) return null;

    const city = String(location?.city ?? "").trim();
    const country = String(location?.country ?? "").trim();
    if (!city || !country) return null;

    const latitude = typeof location?.latitude === "number" && Number.isFinite(location.latitude) ? location.latitude : undefined;
    const longitude = typeof location?.longitude === "number" && Number.isFinite(location.longitude) ? location.longitude : undefined;
    if (latitude === undefined || longitude === undefined || (latitude === 0 && longitude === 0)) return null;

    const areaId = typeof location?.areaId === "string" && location.areaId.trim()
      ? location.areaId.trim()
      : `legacy-${city.toLocaleLowerCase("en-GB")}-${country.toLocaleLowerCase("en-GB")}`;

    return {
      uid: item.id,
      displayName: String(data.displayName ?? "").trim() || "Anonymous Titan",
      role: String(data.role ?? "user").trim() || "user",
      city,
      country,
      areaId,
      latitude,
      longitude,
    } satisfies CommunityLocationMember;
  }));

  const eligible = candidates.filter((member): member is CommunityLocationMember => member !== null);
  return Promise.all(eligible.map(async (member) => {
    const snakeCount = await getTrackedSnakeCount(member.uid);
    return snakeCount === undefined ? member : { ...member, snakeCount };
  }));
}
