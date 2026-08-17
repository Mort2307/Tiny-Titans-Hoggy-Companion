import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getUserSnakes } from "./snakeService";
import { syncTrackerAchievementCounts } from "./learningEngine";
import type { TrackerAchievementCounts } from "../types/Learning";

function childCollection(uid: string, snakeId: string, name: "weights" | "feedings" | "sheds") {
  return collection(db, "users", uid, "snakes", snakeId, name);
}

/** Rebuild tracker achievement counts from the canonical Firestore tracker records. */
export async function syncTrackerAchievementCountsFromFirestore(uid: string): Promise<TrackerAchievementCounts> {
  if (!uid) return { snakes: 0, weightLogs: 0, feedingLogs: 0, shedLogs: 0 };
  const snakes = await getUserSnakes(uid);
  const counts: TrackerAchievementCounts = { snakes: snakes.length, weightLogs: 0, feedingLogs: 0, shedLogs: 0 };
  await Promise.all(snakes.map(async (snake) => {
    if (!snake.id) return;
    const [weights, feedings, sheds] = await Promise.all([
      getDocs(childCollection(uid, snake.id, "weights")),
      getDocs(childCollection(uid, snake.id, "feedings")),
      getDocs(childCollection(uid, snake.id, "sheds")),
    ]);
    counts.weightLogs += weights.size;
    counts.feedingLogs += feedings.size;
    counts.shedLogs += sheds.size;
  }));
  syncTrackerAchievementCounts(uid, counts);
  return counts;
}
