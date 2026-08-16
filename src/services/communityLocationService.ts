import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export type CommunityLocationMember = {
  uid: string;
  displayName: string;
  role: string;
  city: string;
  country: string;
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
    const rawSnakeCount = data.snakeCount;
    const snakeCount = typeof rawSnakeCount === "number" && Number.isFinite(rawSnakeCount) ? rawSnakeCount : undefined;
    return [{
      uid: item.id,
      displayName: String(data.displayName ?? "").trim() || "Anonymous Titan",
      role: String(data.role ?? "user").trim() || "user",
      city,
      country,
      ...(snakeCount === undefined ? {} : { snakeCount }),
    }];
  });
}
