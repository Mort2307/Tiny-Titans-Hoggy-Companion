import type { LearningDifficulty, LearningProgress, LearningTopic, TopicProgress, QuizQuestion } from "../types/Learning";

const STORAGE_PREFIX = "tinytitans.learning.v2";

const defaultProgress = (): LearningProgress => ({
  xp: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  topics: {},
  unlockedBadges: [],
  perfectTests: 0,
  completedLessons: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastTestAt: null,
});

export function getLearningProgress(uid?: string | null): LearningProgress {
  if (!uid || typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}.${uid}`);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<LearningProgress>;
    const legacyTopics = parsed.topics ?? {};
    const topics = Object.fromEntries(
      Object.entries(legacyTopics).map(([id, topic]) => [
        id,
        {
          attempts: topic?.attempts ?? 0,
          correct: topic?.correct ?? 0,
          mastery: topic?.mastery ?? 0,
          lastScore: topic?.lastScore ?? null,
          bestScore: topic?.bestScore ?? topic?.lastScore ?? 0,
          completed: topic?.completed ?? false,
          lastAttemptAt: topic?.lastAttemptAt ?? null,
        },
      ]),
    );
    return {
      ...defaultProgress(),
      ...parsed,
      topics,
      unlockedBadges: parsed.unlockedBadges ?? [],
      currentStreak: parsed.currentStreak ?? 0,
      longestStreak: parsed.longestStreak ?? 0,
      lastTestAt: parsed.lastTestAt ?? null,
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
  return progress.topics[topicId] ?? {
    attempts: 0,
    correct: 0,
    mastery: 0,
    lastScore: null,
    bestScore: 0,
    completed: false,
    lastAttemptAt: null,
  };
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

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function selectQuestions(topic: LearningTopic, progress: LearningProgress, count = 5): QuizQuestion[] {
  const difficulty = getDifficulty(progress, topic);
  const targetCount = Math.min(Math.max(1, count), topic.questions.length);
  const selected: QuizQuestion[] = [];

  // Stay at the learner's current level first. Only move upward when the topic
  // does not have enough questions at that level, preventing accidental jumps.
  for (let level = difficulty; level <= 5 && selected.length < targetCount; level += 1) {
    const candidates = shuffle(topic.questions.filter((question) => question.difficulty === level));
    selected.push(...candidates.slice(0, targetCount - selected.length));
  }

  if (selected.length < targetCount) {
    const remaining = shuffle(topic.questions.filter((question) => !selected.some((item) => item.id === question.id)));
    selected.push(...remaining.slice(0, targetCount - selected.length));
  }

  return shuffle(selected).slice(0, targetCount);
}

function updateStreak(progress: LearningProgress, now: Date): void {
  if (!progress.lastTestAt) {
    progress.currentStreak = 1;
  } else {
    const previous = new Date(progress.lastTestAt);
    const previousDay = new Date(Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth(), previous.getUTCDate()));
    const currentDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const days = Math.round((currentDay.getTime() - previousDay.getTime()) / 86_400_000);
    if (days === 1) progress.currentStreak += 1;
    else if (days > 1) progress.currentStreak = 1;
  }
  progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
  progress.lastTestAt = now.toISOString();
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
  const completed = previous.completed || score >= 0.7;
  const now = new Date();
  const next: TopicProgress = {
    attempts: previous.attempts + questionCount,
    correct: previous.correct + correct,
    mastery: masteryFor({
      attempts: previous.attempts + questionCount,
      correct: previous.correct + correct,
      mastery: previous.mastery,
      lastScore: score,
      bestScore: Math.max(previous.bestScore, score),
      completed,
      lastAttemptAt: now.toISOString(),
    }),
    lastScore: score,
    bestScore: Math.max(previous.bestScore, score),
    completed,
    lastAttemptAt: now.toISOString(),
  };

  progress.topics[topic.id] = next;
  progress.totalQuestions += questionCount;
  progress.totalCorrect += correct;
  progress.xp += 10 + correct * 5 + (score === 1 ? 10 : 0);
  if (score === 1) progress.perfectTests += 1;
  if (!previous.completed && next.completed) progress.completedLessons += 1;
  updateStreak(progress, now);
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

export type Badge = {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: (progress: LearningProgress) => boolean;
  target?: number;
  progress?: (progress: LearningProgress) => number;
};

export const badges: Badge[] = [
  { id: "first-test", name: "First Challenge", icon: "🧠", description: "Complete your first mini test.", requirement: (p) => p.totalQuestions > 0, target: 1, progress: (p) => Math.min(1, p.totalQuestions > 0 ? 1 : 0) },
  { id: "first-lesson", name: "First Lesson", icon: "📖", description: "Master your first lesson with a score of 70% or higher.", requirement: (p) => p.completedLessons >= 1, target: 1, progress: (p) => Math.min(1, p.completedLessons) },
  { id: "perfect", name: "Perfect Score", icon: "💯", description: "Get your first 100% test score.", requirement: (p) => p.perfectTests >= 1, target: 1, progress: (p) => Math.min(1, p.perfectTests) },
  { id: "curious", name: "Curious Titan", icon: "🔎", description: "Master 5 lessons.", requirement: (p) => p.completedLessons >= 5, target: 5, progress: (p) => Math.min(5, p.completedLessons) },
  { id: "knowledge-seeker", name: "Knowledge Seeker", icon: "📚", description: "Master 25 lessons.", requirement: (p) => p.completedLessons >= 25, target: 25, progress: (p) => Math.min(25, p.completedLessons) },
  { id: "genetics", name: "Genetics Apprentice", icon: "🧬", description: "Master a genetics topic to 75% or higher.", requirement: (p) => Object.entries(p.topics).some(([id, value]) => (id.includes("poly") || id.includes("het")) && value.mastery >= 75), target: 75, progress: (p) => Math.max(0, ...Object.entries(p.topics).filter(([id]) => id.includes("poly") || id.includes("het")).map(([, value]) => value.mastery)) },
  { id: "brainy", name: "Brainy Titan", icon: "🏆", description: "Earn 10 perfect test scores.", requirement: (p) => p.perfectTests >= 10, target: 10, progress: (p) => Math.min(10, p.perfectTests) },
  { id: "titan", name: "Titan", icon: "🐍", description: "Reach 75% overall knowledge.", requirement: (p) => knowledgeScore(p) >= 75, target: 75, progress: knowledgeScore },
  { id: "streak-3", name: "Three-Day Titan", icon: "🔥", description: "Complete learning challenges on three consecutive days.", requirement: (p) => p.longestStreak >= 3, target: 3, progress: (p) => Math.min(3, p.longestStreak) },
  { id: "streak-7", name: "Week of Wisdom", icon: "🌟", description: "Complete learning challenges on seven consecutive days.", requirement: (p) => p.longestStreak >= 7, target: 7, progress: (p) => Math.min(7, p.longestStreak) },
];

export function unlockBadges(progress: LearningProgress): string[] {
  const existing = new Set(progress.unlockedBadges);
  badges.forEach((badge) => { if (badge.requirement(progress)) existing.add(badge.id); });
  return [...existing];
}

export function getBadgeState(progress: LearningProgress, badgeId: string): boolean {
  return progress.unlockedBadges.includes(badgeId);
}
