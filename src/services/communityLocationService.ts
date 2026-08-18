import { collection, getCountFromServer, getDocs } from "firebase/firestore";
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

async function getTrackedSnakeCount(uid: string): Promise<number | undefined> {
  const snakes = collection(db, "users", uid, "snakes");
  try {
    const snapshot = await getCountFromServer(snakes);
    return snapshot.data().count;
  } catch (countError) {
    // Some Firestore deployments/SDK combinations can reject aggregation reads
    // even when normal collection reads are permitted. Fall back to the same
    // canonical collection used by the snake service and count the documents.
    try {
      const snapshot = await getDocs(snakes);
      return snapshot.size;
    } catch (readError) {
      console.warn("Tiny Titans: unable to read community snake count", {
        uid,
        countError,
        readError,
      });
      return undefined;
    }
  }
}

/** Creator-only, consent-filtered community location intelligence. */
export async function getCommunityLocationMembers(): Promise<CommunityLocationMember[]> {
  const snapshot = await getDocs(collection(db, "users"));
  const candidates = snapshot.docs.flatMap((item) => {
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

    return [{
      uid: item.id,
      displayName: String(data.displayName ?? "").trim() || "Anonymous Titan",
      role: String(data.role ?? "user").trim() || "user",
      city,
      country,
      areaId,
      latitude,
      longitude,
    }];
  });

  return Promise.all(candidates.map(async (member) => {
    const snakeCount = await getTrackedSnakeCount(member.uid);
    return snakeCount === undefined ? member : { ...member, snakeCount };
  }));
}
