import type { LearningDifficulty, LearningProgress, LearningTopic, TopicProgress, QuizQuestion } from "../types/Learning";

const STORAGE_PREFIX = "tinytitans.learning.v2";

const defaultProgress = (): LearningProgress => ({
  xp: 0, totalQuestions: 0, totalCorrect: 0, topics: {}, unlockedBadges: [], perfectTests: 0,
  completedLessons: 0, currentStreak: 0, longestStreak: 0, lastTestAt: null,
});

export function getLearningProgress(uid?: string | null): LearningProgress {
  if (!uid || typeof window === "undefined") return defaultProgress();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}.${uid}`) ?? "null") as Partial<LearningProgress> | null;
    if (!parsed) return defaultProgress();
    const topics = Object.fromEntries(Object.entries(parsed.topics ?? {}).map(([id, topic]) => [id, {
      attempts: Math.max(0, topic?.attempts ?? 0), correct: Math.max(0, topic?.correct ?? 0), mastery: Math.max(0, Math.min(100, topic?.mastery ?? 0)),
      lastScore: topic?.lastScore ?? null, bestScore: Math.max(0, Math.min(1, topic?.bestScore ?? topic?.lastScore ?? 0)), completed: Boolean(topic?.completed), lastAttemptAt: topic?.lastAttemptAt ?? null,
    }]));
    return { ...defaultProgress(), ...parsed, topics, unlockedBadges: parsed.unlockedBadges ?? [] };
  } catch { return defaultProgress(); }
}

function saveProgress(uid: string | null | undefined, progress: LearningProgress): void {
  if (!uid || typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}.${uid}`, JSON.stringify(progress));
}

function topicProgress(progress: LearningProgress, topicId: string): TopicProgress {
  return progress.topics[topicId] ?? { attempts: 0, correct: 0, mastery: 0, lastScore: null, bestScore: 0, completed: false, lastAttemptAt: null };
}

export function getDifficulty(progress: LearningProgress, topic: LearningTopic): LearningDifficulty {
  const mastery = topicProgress(progress, topic.id).mastery;
  if (mastery >= 90) return 5; if (mastery >= 75) return 4; if (mastery >= 55) return 3; if (mastery >= 30) return 2; return 1;
}

function shuffle<T>(items: T[]): T[] { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }

export function selectQuestions(topic: LearningTopic, progress: LearningProgress, count = 5): QuizQuestion[] {
  const target = Math.min(Math.max(1, count), topic.questions.length);
  const difficulty = getDifficulty(progress, topic);
  const selected: QuizQuestion[] = [];
  // Prefer the learner's current level. If there are not enough questions, fill from adjacent harder/easier levels.
  const levels = [difficulty, ...[1, 2, 3, 4, 5].filter((level) => level !== difficulty).sort((a, b) => Math.abs(a - difficulty) - Math.abs(b - difficulty))];
  for (const level of levels) {
    if (selected.length >= target) break;
    const candidates = shuffle(topic.questions.filter((question) => question.difficulty === level && !selected.some((item) => item.id === question.id)));
    selected.push(...candidates.slice(0, target - selected.length));
  }
  return shuffle(selected).slice(0, target);
}

function updateStreak(progress: LearningProgress, now: Date): void {
  if (!progress.lastTestAt) progress.currentStreak = 1;
  else {
    const previous = new Date(progress.lastTestAt);
    const day = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const days = Math.round((day(now) - day(previous)) / 86_400_000);
    if (days === 1) progress.currentStreak += 1;
    else if (days > 1) progress.currentStreak = 1;
  }
  progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
  progress.lastTestAt = now.toISOString();
}

export function recordTest(uid: string | null | undefined, topic: LearningTopic, score: number, questionCount: number): LearningProgress {
  const progress = getLearningProgress(uid);
  const previous = topicProgress(progress, topic.id);
  const safeCount = Math.max(0, Math.floor(questionCount));
  const safeScore = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0));
  const correct = Math.max(0, Math.min(safeCount, Math.round(safeScore * safeCount)));
  const now = new Date();
  const attempts = previous.attempts + safeCount;
  const totalCorrect = previous.correct + correct;
  const mastery = attempts ? Math.round((totalCorrect / attempts) * 100) : 0;
  const completed = previous.completed || safeScore >= 0.7;

  progress.topics[topic.id] = {
    attempts, correct: totalCorrect, mastery, lastScore: safeScore,
    bestScore: Math.max(previous.bestScore, safeScore), completed, lastAttemptAt: now.toISOString(),
  };
  progress.totalQuestions += safeCount;
  progress.totalCorrect += correct;
  progress.xp += safeCount + correct * 5 + (safeScore === 1 ? 15 : safeScore >= 0.8 ? 5 : 0);
  if (safeScore === 1) progress.perfectTests += 1;
  if (!previous.completed && completed) progress.completedLessons += 1;
  updateStreak(progress, now);
  progress.unlockedBadges = unlockBadges(progress);
  saveProgress(uid, progress);
  return progress;
}

export function knowledgeScore(progress: LearningProgress): number { return progress.totalQuestions ? Math.round((progress.totalCorrect / progress.totalQuestions) * 100) : 0; }

export function knowledgeLevel(progress: LearningProgress): string {
  const score = knowledgeScore(progress);
  if (score >= 95) return "Legendary Titan"; if (score >= 85) return "Titan"; if (score >= 75) return "Hognose Expert"; if (score >= 60) return "Hognose Specialist";
  if (score >= 45) return "Experienced Keeper"; if (score >= 30) return "Keeper"; if (score >= 15) return "Youngling"; return "Hatchling";
}

export type Badge = { id: string; name: string; icon: string; description: string; requirement: (progress: LearningProgress) => boolean; target?: number; progress?: (progress: LearningProgress) => number };

export const badges: Badge[] = [
  { id: "first-test", name: "First Challenge", icon: "🧠", description: "Complete your first mini test.", requirement: (p) => p.totalQuestions > 0, target: 1, progress: (p) => Math.min(1, p.totalQuestions > 0 ? 1 : 0) },
  { id: "first-lesson", name: "First Lesson", icon: "📖", description: "Complete your first lesson with 70% or higher.", requirement: (p) => p.completedLessons >= 1, target: 1, progress: (p) => Math.min(1, p.completedLessons) },
  { id: "perfect", name: "Perfect Score", icon: "💯", description: "Get your first 100% test score.", requirement: (p) => p.perfectTests >= 1, target: 1, progress: (p) => Math.min(1, p.perfectTests) },
  { id: "curious", name: "Curious Titan", icon: "🔎", description: "Complete 5 lessons.", requirement: (p) => p.completedLessons >= 5, target: 5, progress: (p) => Math.min(5, p.completedLessons) },
  { id: "knowledge-seeker", name: "Knowledge Seeker", icon: "📚", description: "Complete 25 lessons.", requirement: (p) => p.completedLessons >= 25, target: 25, progress: (p) => Math.min(25, p.completedLessons) },
  { id: "genetics", name: "Genetics Apprentice", icon: "🧬", description: "Reach 75% mastery on a genetics topic.", requirement: (p) => Object.entries(p.topics).some(([id, value]) => /genetic|poly|het|morph/i.test(id) && value.mastery >= 75), target: 75, progress: (p) => Math.max(0, ...Object.entries(p.topics).filter(([id]) => /genetic|poly|het|morph/i.test(id)).map(([, value]) => value.mastery)) },
  { id: "brainy", name: "Brainy Titan", icon: "🏆", description: "Earn 10 perfect test scores.", requirement: (p) => p.perfectTests >= 10, target: 10, progress: (p) => Math.min(10, p.perfectTests) },
  { id: "titan", name: "Titan", icon: "🐍", description: "Reach 75% overall knowledge.", requirement: (p) => knowledgeScore(p) >= 75, target: 75, progress: knowledgeScore },
  { id: "streak-3", name: "Three-Day Titan", icon: "🔥", description: "Learn on three consecutive days.", requirement: (p) => p.longestStreak >= 3, target: 3, progress: (p) => Math.min(3, p.longestStreak) },
  { id: "streak-7", name: "Week of Wisdom", icon: "🌟", description: "Learn on seven consecutive days.", requirement: (p) => p.longestStreak >= 7, target: 7, progress: (p) => Math.min(7, p.longestStreak) },
];

export function unlockBadges(progress: LearningProgress): string[] {
  const existing = new Set(progress.unlockedBadges);
  for (const badge of badges) if (badge.requirement(progress)) existing.add(badge.id);
  return [...existing];
}

export function getBadgeState(progress: LearningProgress, badgeId: string): boolean { return progress.unlockedBadges.includes(badgeId); }
