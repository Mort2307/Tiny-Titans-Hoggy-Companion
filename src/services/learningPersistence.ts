import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { LearningProgress } from "../types/Learning";

const COLLECTION = "learningProgress";
const VERSION = 4;

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mergeRecord<T extends Record<string, any>>(local: T, cloud: T): T {
  const result: T = { ...local };
  for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    const a = local[key];
    const b = cloud[key];
    if (typeof a === "number" && typeof b === "number") result[key] = Math.max(a, b) as T[Extract<keyof T, string>];
    else if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) result[key] = mergeRecord(a, b) as T[Extract<keyof T, string>];
    else if (b !== undefined && b !== null) result[key] = b;
  }
  return result;
}

export function mergeLearningProgress(local: LearningProgress, cloud: LearningProgress | null): LearningProgress {
  if (!cloud) return local;
  const merged = mergeRecord(local as any, cloud as any) as LearningProgress;
  merged.version = VERSION;
  merged.userId = local.userId || cloud.userId;
  merged.xp = Math.max(number(local.xp), number(cloud.xp));
  merged.totalQuestions = Math.max(number(local.totalQuestions), number(cloud.totalQuestions));
  merged.correctAnswers = Math.max(number(local.correctAnswers), number(cloud.correctAnswers));
  merged.streak = Math.max(number(local.streak), number(cloud.streak));
  merged.longestStreak = Math.max(number(local.longestStreak), number(cloud.longestStreak));
  merged.confirmedBugReports = Math.max(number(local.confirmedBugReports), number(cloud.confirmedBugReports));
  merged.trackerAchievements = Math.max(number(local.trackerAchievements), number(cloud.trackerAchievements));
  return merged;
}

export async function getCloudLearningProgress(userId: string): Promise<LearningProgress | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, userId));
  return snapshot.exists() ? (snapshot.data().progress as LearningProgress) ?? null : null;
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
