import type { LearningDifficulty, LearningProgress, LearningTopic, TopicProgress } from "../types/Learning";

const STORAGE_PREFIX = "tinytitans.learning.v2";

const defaultProgress = (): LearningProgress => ({
  xp: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  topics: {},
  unlockedBadges: [],
  perfectTests: 0,
  completedLessons: 0,
});

export function getLearningProgress(uid?: string | null): LearningProgress {
  if (!uid || typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}.${uid}`);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<LearningProgress>;
    return {
      ...defaultProgress(),
      ...parsed,
      topics: parsed.topics ?? {},
      unlockedBadges: parsed.unlockedBadges ?? [],
    };
  } catch {
    return defaultProgress();
  }
}

function saveProgress(uid: string | null | undefined, progress: LearningProgress): void {
  if (!uid || typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}.${uid}`, JSON.stringify(progress));
}

function topicProgress(progress: LearningProgress, topicId: string): TopicProgress {
  return progress.topics[topicId] ?? { attempts: 0, correct: 0, mastery: 0, lastScore: null, completed: false };
}

function masteryFor(topic: TopicProgress): number {
  if (topic.attempts <= 0) return 0;
  const accuracy = topic.correct / Math.max(1, topic.attempts);
  return Math.round(Math.min(100, accuracy * 100));
}

export function getDifficulty(progress: LearningProgress, topic: LearningTopic): LearningDifficulty {
  const current = topicProgress(progress, topic.id);
  if (current.mastery >= 90) return 5;
  if (current.mastery >= 75) return 4;
  if (current.mastery >= 55) return 3;
  if (current.mastery >= 30) return 2;
  return 1;
}

export function selectQuestions(topic: LearningTopic, progress: LearningProgress, count = 5) {
  const difficulty = getDifficulty(progress, topic);
  const eligible = topic.questions.filter((question) => question.difficulty <= difficulty);
  const source = eligible.length >= count ? eligible : topic.questions;
  return [...source].sort((a, b) => a.difficulty - b.difficulty).slice(-count).sort(() => Math.random() - 0.5);
}

export function recordTest(
  uid: string | null | undefined,
  topic: LearningTopic,
  score: number,
  questionCount: number,
): LearningProgress {
  const progress = getLearningProgress(uid);
  const previous = topicProgress(progress, topic.id);
  const correct = Math.max(0, Math.min(questionCount, Math.round(score * questionCount)));
  const next: TopicProgress = {
    attempts: previous.attempts + questionCount,
    correct: previous.correct + correct,
    mastery: masteryFor({ attempts: previous.attempts + questionCount, correct: previous.correct + correct, mastery: previous.mastery, lastScore: score, completed: previous.completed }),
    lastScore: score,
    completed: previous.completed || score >= 0.7,
  };
  progress.topics[topic.id] = next;
  progress.totalQuestions += questionCount;
  progress.totalCorrect += correct;
  progress.xp += 10 + correct * 5 + (score === 1 ? 10 : 0);
  if (score === 1) progress.perfectTests += 1;
  if (!previous.completed && next.completed) progress.completedLessons += 1;
  progress.unlockedBadges = unlockBadges(progress);
  saveProgress(uid, progress);
  return progress;
}

export function knowledgeScore(progress: LearningProgress): number {
  return progress.totalQuestions ? Math.round((progress.totalCorrect / progress.totalQuestions) * 100) : 0;
}

export function knowledgeLevel(progress: LearningProgress): string {
  const score = knowledgeScore(progress);
  if (score >= 95) return "Legendary Titan";
  if (score >= 85) return "Titan";
  if (score >= 75) return "Hognose Expert";
  if (score >= 60) return "Hognose Specialist";
  if (score >= 45) return "Experienced Keeper";
  if (score >= 30) return "Keeper";
  if (score >= 15) return "Youngling";
  return "Hatchling";
}

export type Badge = { id: string; name: string; icon: string; description: string; requirement: (progress: LearningProgress) => boolean };

export const badges: Badge[] = [
  { id: "first-test", name: "First Challenge", icon: "🧠", description: "Complete your first mini test.", requirement: (p) => p.totalQuestions > 0 },
  { id: "first-lesson", name: "First Lesson", icon: "📖", description: "Complete your first lesson.", requirement: (p) => p.completedLessons >= 1 },
  { id: "perfect", name: "Perfect Score", icon: "💯", description: "Get your first 100% test score.", requirement: (p) => p.perfectTests >= 1 },
  { id: "curious", name: "Curious Titan", icon: "🔎", description: "Complete 5 lessons.", requirement: (p) => p.completedLessons >= 5 },
  { id: "knowledge-seeker", name: "Knowledge Seeker", icon: "📚", description: "Complete 25 lessons.", requirement: (p) => p.completedLessons >= 25 },
  { id: "genetics", name: "Genetics Apprentice", icon: "🧬", description: "Master a genetics topic to 75% or higher.", requirement: (p) => Object.entries(p.topics).some(([id, value]) => id.includes("poly") || id.includes("het") ? value.mastery >= 75 : false) },
  { id: "brainy", name: "Brainy Titan", icon: "🏆", description: "Earn 10 perfect test scores.", requirement: (p) => p.perfectTests >= 10 },
  { id: "titan", name: "Titan", icon: "🐍", description: "Reach 75% overall knowledge.", requirement: (p) => knowledgeScore(p) >= 75 },
];

export function unlockBadges(progress: LearningProgress): string[] {
  const existing = new Set(progress.unlockedBadges);
  badges.forEach((badge) => { if (badge.requirement(progress)) existing.add(badge.id); });
  return [...existing];
}

export function getBadgeState(progress: LearningProgress, badgeId: string): boolean {
  return progress.unlockedBadges.includes(badgeId);
}
