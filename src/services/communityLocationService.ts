import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

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

/** Creator-only, consent-filtered community location intelligence. */
export async function getCommunityLocationMembers(): Promise<CommunityLocationMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.flatMap((item) => {
    const data = item.data() as Record<string, unknown>;
    const location = data.approximateLocation as Record<string, unknown> | undefined;
    const preferences = data.dataCollectionPreferences as Record<string, unknown> | undefined;
    if (preferences?.approximateLocation !== true || location?.visibleToCreator !== true) return [];

    const city = String(location?.city ?? "").trim();
    const country = String(location?.country ?? "").trim();
    if (!city || !country) return [];

    const latitude = typeof location?.latitude === "number" && Number.isFinite(location.latitude) ? location.latitude : undefined;
    const longitude = typeof location?.longitude === "number" && Number.isFinite(location.longitude) ? location.longitude : undefined;
    // Do not render legacy city-only records at 0,0. They will re-enter the
    // map when the user accepts the current coarse-location consent version.
    if (latitude === undefined || longitude === undefined || (latitude === 0 && longitude === 0)) return [];

    const areaId = typeof location?.areaId === "string" && location.areaId.trim()
      ? location.areaId.trim()
      : `legacy-${city.toLocaleLowerCase("en-GB")}-${country.toLocaleLowerCase("en-GB")}`;
    const rawSnakeCount = data.snakeCount;
    const snakeCount = typeof rawSnakeCount === "number" && Number.isFinite(rawSnakeCount) ? rawSnakeCount : undefined;

    return [{
      uid: item.id,
      displayName: String(data.displayName ?? "").trim() || "Anonymous Titan",
      role: String(data.role ?? "user").trim() || "user",
      city,
      country,
      areaId,
      latitude,
      longitude,
      ...(snakeCount === undefined ? {} : { snakeCount }),
    }];
  });
}
