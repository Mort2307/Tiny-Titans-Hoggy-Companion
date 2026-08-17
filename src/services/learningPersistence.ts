import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { LearningProgress, TopicProgress, TrackerAchievementCounts } from "../types/Learning";

const VERSION = 4;
const progressRef = (userId: string) => doc(db, "users", userId, "learningProgress", "state");
const safeNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

function mergeTopic(a: TopicProgress | undefined, b: TopicProgress | undefined): TopicProgress {
  if (!a && !b) return { attempts: 0, correct: 0, mastery: 0, lastScore: null, bestScore: 0, completed: false, lastAttemptAt: null, currentBank: 1, masteredBanks: [], seenQuestionIds: [], missedQuestionIds: [], recentQuestionIds: [] };
  if (!a) return b!;
  if (!b) return a;
  const latest = (a.lastAttemptAt ?? "") >= (b.lastAttemptAt ?? "") ? a : b;
  return { ...a, attempts: Math.max(a.attempts, b.attempts), correct: Math.max(a.correct, b.correct), mastery: Math.max(a.mastery, b.mastery), bestScore: Math.max(a.bestScore, b.bestScore), completed: a.completed || b.completed, lastScore: latest.lastScore, lastAttemptAt: latest.lastAttemptAt, currentBank: Math.max(a.currentBank, b.currentBank) as TopicProgress["currentBank"], masteredBanks: [...new Set([...a.masteredBanks, ...b.masteredBanks])].sort((x, y) => x - y) as TopicProgress["masteredBanks"], seenQuestionIds: [...new Set([...a.seenQuestionIds, ...b.seenQuestionIds])], missedQuestionIds: [...new Set([...a.missedQuestionIds, ...b.missedQuestionIds])], recentQuestionIds: [...new Set([...a.recentQuestionIds, ...b.recentQuestionIds])].slice(-8) };
}

function mergeTrackerCounts(a: TrackerAchievementCounts, b: TrackerAchievementCounts): TrackerAchievementCounts {
  return { snakes: Math.max(safeNumber(a.snakes), safeNumber(b.snakes)), weightLogs: Math.max(safeNumber(a.weightLogs), safeNumber(b.weightLogs)), feedingLogs: Math.max(safeNumber(a.feedingLogs), safeNumber(b.feedingLogs)), shedLogs: Math.max(safeNumber(a.shedLogs), safeNumber(b.shedLogs)) };
}

export function mergeLearningProgress(local: LearningProgress, cloud: LearningProgress | null): LearningProgress {
  if (!cloud) return { ...local };
  const topics: Record<string, TopicProgress> = {};
  for (const id of new Set([...Object.keys(local.topics), ...Object.keys(cloud.topics)])) topics[id] = mergeTopic(local.topics[id], cloud.topics[id]);
  const latest = (local.lastTestAt ?? "") >= (cloud.lastTestAt ?? "") ? local : cloud;
  return { ...local, xp: Math.max(local.xp, cloud.xp), totalQuestions: Math.max(local.totalQuestions, cloud.totalQuestions), totalCorrect: Math.max(local.totalCorrect, cloud.totalCorrect), topics, unlockedBadges: [...new Set([...local.unlockedBadges, ...cloud.unlockedBadges])], perfectBanks: Math.max(local.perfectBanks, cloud.perfectBanks), perfectTests: Math.max(local.perfectTests, cloud.perfectTests), completedLessons: Math.max(local.completedLessons, cloud.completedLessons), currentStreak: Math.max(local.currentStreak, cloud.currentStreak), longestStreak: Math.max(local.longestStreak, cloud.longestStreak), lastTestAt: latest.lastTestAt, learnerProfile: latest.learnerProfile, confirmedBugReportIds: [...new Set([...local.confirmedBugReportIds, ...cloud.confirmedBugReportIds])], trackerCounts: mergeTrackerCounts(local.trackerCounts, cloud.trackerCounts) };
}

export async function getCloudLearningProgress(userId: string): Promise<LearningProgress | null> { const snapshot = await getDoc(progressRef(userId)); if (!snapshot.exists()) return null; return (snapshot.data().progress as LearningProgress | undefined) ?? null; }
export async function saveCloudLearningProgress(userId: string, progress: LearningProgress): Promise<void> { await setDoc(progressRef(userId), { userId, version: VERSION, progress, updatedAt: serverTimestamp() }, { merge: true }); }
export async function syncLearningProgress(userId: string, local: LearningProgress): Promise<LearningProgress> { const cloud = await getCloudLearningProgress(userId); const merged = mergeLearningProgress(local, cloud); await saveCloudLearningProgress(userId, merged); return merged; }
