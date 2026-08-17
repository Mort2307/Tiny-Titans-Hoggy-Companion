import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { LearningProgress } from "../types/Learning";

const COLLECTION = "learningProgress";
const VERSION = 4;

type JsonRecord = Record<string, any>;

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mergeRecord<T extends JsonRecord>(local: T, cloud: T): T {
  const result: T = { ...local };
  for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    const a = local[key];
    const b = cloud[key];
    if (typeof a === "number" && typeof b === "number") result[key] = Math.max(a, b);
    else if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) result[key] = mergeRecord(a, b);
    else if (b !== undefined && b !== null) result[key] = b;
  }
  return result;
}

export function mergeLearningProgress(local: LearningProgress, cloud: LearningProgress | null): LearningProgress {
  if (!cloud) return { ...local };
  const merged = mergeRecord(local as unknown as JsonRecord, cloud as unknown as JsonRecord) as unknown as LearningProgress;
  merged.xp = Math.max(number(local.xp), number(cloud.xp));
  merged.totalQuestions = Math.max(number(local.totalQuestions), number(cloud.totalQuestions));
  merged.totalCorrect = Math.max(number(local.totalCorrect), number(cloud.totalCorrect));
  merged.perfectBanks = Math.max(number(local.perfectBanks), number(cloud.perfectBanks));
  merged.perfectTests = Math.max(number(local.perfectTests), number(cloud.perfectTests));
  merged.completedLessons = Math.max(number(local.completedLessons), number(cloud.completedLessons));
  merged.currentStreak = Math.max(number(local.currentStreak), number(cloud.currentStreak));
  merged.longestStreak = Math.max(number(local.longestStreak), number(cloud.longestStreak));
  merged.confirmedBugReportIds = [...new Set([...local.confirmedBugReportIds, ...cloud.confirmedBugReportIds])];
  merged.unlockedBadges = [...new Set([...local.unlockedBadges, ...cloud.unlockedBadges])];
  merged.trackerCounts = {
    snakes: Math.max(number(local.trackerCounts?.snakes), number(cloud.trackerCounts?.snakes)),
    weightLogs: Math.max(number(local.trackerCounts?.weightLogs), number(cloud.trackerCounts?.weightLogs)),
    feedingLogs: Math.max(number(local.trackerCounts?.feedingLogs), number(cloud.trackerCounts?.feedingLogs)),
    shedLogs: Math.max(number(local.trackerCounts?.shedLogs), number(cloud.trackerCounts?.shedLogs)),
  };
  return merged;
}

export async function getCloudLearningProgress(userId: string): Promise<LearningProgress | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, userId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return (data.progress as LearningProgress) ?? null;
}

export async function saveCloudLearningProgress(userId: string, progress: LearningProgress): Promise<void> {
  await setDoc(doc(db, COLLECTION, userId), {
    userId,
    version: VERSION,
    progress,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function syncLearningProgress(userId: string, local: LearningProgress): Promise<LearningProgress> {
  const cloud = await getCloudLearningProgress(userId);
  const merged = mergeLearningProgress(local, cloud);
  await saveCloudLearningProgress(userId, merged);
  return merged;
}
