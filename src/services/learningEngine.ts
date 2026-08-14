import type { ChallengeType, LearningBank, LearningDifficulty, LearningProgress, LearningTopic, TopicProgress, QuizQuestion, LearnerProfile, LanguageLevel } from "../types/Learning";

const STORAGE_PREFIX = "tinytitans.learning.v4";
const MAX_RECENT = 8;
const defaultProfile = (): LearnerProfile => ({ languageLevel: "keeper", showScientificTerms: true, profileSet: true });
const defaultTopic = (): TopicProgress => ({ attempts: 0, correct: 0, mastery: 0, lastScore: null, bestScore: 0, completed: false, lastAttemptAt: null, currentBank: 1, masteredBanks: [], seenQuestionIds: [], missedQuestionIds: [], recentQuestionIds: [] });
const defaultProgress = (): LearningProgress => ({ xp: 0, totalQuestions: 0, totalCorrect: 0, topics: {}, unlockedBadges: [], perfectTests: 0, completedLessons: 0, currentStreak: 0, longestStreak: 0, lastTestAt: null, learnerProfile: defaultProfile() });

export function getLearningProgress(uid?: string | null): LearningProgress {
  if (!uid || typeof window === "undefined") return defaultProgress();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}.${uid}`) ?? "null") as Partial<LearningProgress> | null;
    if (!parsed) return defaultProgress();
    const topics = Object.fromEntries(Object.entries(parsed.topics ?? {}).map(([id, topic]) => [id, { ...defaultTopic(), ...topic, mastery: Math.max(0, Math.min(100, topic?.mastery ?? 0)), currentBank: Math.max(1, Math.min(5, topic?.currentBank ?? 1)) as LearningBank, masteredBanks: (topic?.masteredBanks ?? []).filter((bank): bank is LearningBank => bank >= 1 && bank <= 5), seenQuestionIds: topic?.seenQuestionIds ?? [], missedQuestionIds: topic?.missedQuestionIds ?? [], recentQuestionIds: (topic?.recentQuestionIds ?? []).slice(-MAX_RECENT) }]));
    return { ...defaultProgress(), ...parsed, topics, learnerProfile: { ...defaultProfile(), ...(parsed.learnerProfile ?? {}) }, unlockedBadges: parsed.unlockedBadges ?? [] };
  } catch { return defaultProgress(); }
}
function saveProgress(uid: string | null | undefined, progress: LearningProgress): void { if (uid && typeof window !== "undefined") window.localStorage.setItem(`${STORAGE_PREFIX}.${uid}`, JSON.stringify(progress)); }

// Knowledge level is earned from demonstrated results; it is never selected by the learner.
export function setLearnerProfile(uid: string | null | undefined, profile: Partial<LearnerProfile>): LearningProgress { const progress = getLearningProgress(uid); progress.learnerProfile = { ...progress.learnerProfile, ...profile, profileSet: true }; saveProgress(uid, progress); return progress; }
export function getLanguageLevel(progress: LearningProgress): LanguageLevel { return progress.learnerProfile.languageLevel || "keeper"; }
function topicProgress(progress: LearningProgress, topicId: string): TopicProgress { return progress.topics[topicId] ?? defaultTopic(); }
function bankForQuestion(question: QuizQuestion): LearningBank { return question.bank ?? question.difficulty; }
export function getCurrentBank(progress: LearningProgress, topic: LearningTopic): LearningBank { return topicProgress(progress, topic.id).currentBank; }
export function getDifficulty(progress: LearningProgress, topic: LearningTopic): LearningDifficulty { return getCurrentBank(progress, topic); }
export function isBankMastered(progress: LearningProgress, topic: LearningTopic, bank: LearningBank): boolean { return topicProgress(progress, topic.id).masteredBanks.includes(bank); }
function shuffle<T>(items: T[]): T[] { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }

/**
 * Selects a small challenge batch from the learner's current bank.
 * Missed concepts are reinforced first, then unseen questions, then older questions.
 * A bank can only be mastered once every question in that bank has been demonstrated
 * correctly; scoring 100% on a partial batch therefore never skips unseen content.
 */
export function selectQuestions(topic: LearningTopic, progress: LearningProgress, count = 5): QuizQuestion[] {
  const current = topicProgress(progress, topic.id);
  const pool = topic.questions.filter((question) => bankForQuestion(question) === current.currentBank);
  if (!pool.length) return [];

  const take = (items: QuizQuestion[]) => shuffle(items).slice(0, Math.min(count, items.length));
  const missed = pool.filter((q) => current.missedQuestionIds.includes(q.id));
  if (missed.length) return take(missed);

  const unseen = pool.filter((q) => !current.seenQuestionIds.includes(q.id));
  if (unseen.length) return take(unseen);

  const fresh = pool.filter((q) => !current.recentQuestionIds.includes(q.id));
  if (fresh.length) return take(fresh);

  // Every question in a small bank can eventually enter the recent window.
  // Never strand the learner with an empty challenge: recycle the oldest eligible bank questions.
  return take(pool);
}

export function presentQuestion(question: QuizQuestion, profile: LearnerProfile) {
  return {
    prompt: question.promptByLanguage?.[profile.languageLevel] ?? question.prompt,
    explanation: question.explanationByLanguage?.[profile.languageLevel] ?? question.explanation,
    terminology: profile.showScientificTerms ? (question.terminology ?? []) : [],
    challengeType: question.challengeType ?? "knowledge" as ChallengeType,
    challengeData: question.challengeData,
  };
}

export const challengeTypeLabels: Record<ChallengeType, { label: string; icon: string }> = {
  knowledge: { label: "Knowledge Check", icon: "🧠" },
  "genetics-builder": { label: "Genetics Builder", icon: "🧬" },
  "feeding-scenario": { label: "Feeding Scenario", icon: "🍽️" },
  "husbandry-detective": { label: "Husbandry Detective", icon: "🌡️" },
  "normal-monitor-investigate": { label: "Normal / Monitor / Investigate", icon: "🐍" },
  "shed-scenario": { label: "Shed Challenge", icon: "💧" },
  sequence: { label: "Put It In Order", icon: "↕️" },
  "keeper-scenario": { label: "Keeper Scenario", icon: "🎯" },
  reasoning: { label: "Reasoning Challenge", icon: "🔬" },
};

function updateStreak(progress: LearningProgress, now: Date): void { if (!progress.lastTestAt) progress.currentStreak = 1; else { const previous = new Date(progress.lastTestAt); const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); const days = Math.round((day(now) - day(previous)) / 86400000); if (days === 1) progress.currentStreak += 1; else if (days > 1) progress.currentStreak = 1; } progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak); progress.lastTestAt = now.toISOString(); }

export function recordTest(uid: string | null | undefined, topic: LearningTopic, score: number, questionCount: number, questionIds: string[] = [], missedQuestionIds: string[] = []): LearningProgress {
  const progress = getLearningProgress(uid); const previous = topicProgress(progress, topic.id); const safeCount = Math.max(0, Math.floor(questionCount)); const safeScore = Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0)); const correct = Math.max(0, Math.min(safeCount, Math.round(safeScore * safeCount))); const now = new Date(); const bank = previous.currentBank; const bankQuestions = topic.questions.filter((q) => bankForQuestion(q) === bank); const bankSeen = new Set([...previous.seenQuestionIds, ...questionIds].filter((id) => bankQuestions.some((q) => q.id === id))); const bankMastered = safeScore === 1 && bankSeen.size >= bankQuestions.length; const masteredBanks = new Set(previous.masteredBanks); if (bankMastered) masteredBanks.add(bank); const nextBank = bankMastered && bank < 5 && topic.questions.some((q) => bankForQuestion(q) === bank + 1) ? (bank + 1) as LearningBank : bank; const availableBanks = [...new Set(topic.questions.map(bankForQuestion))]; const completed = availableBanks.length > 0 && availableBanks.every((b) => masteredBanks.has(b));
  progress.topics[topic.id] = { ...previous, attempts: previous.attempts + safeCount, correct: previous.correct + correct, mastery: availableBanks.length ? Math.round((masteredBanks.size / availableBanks.length) * 100) : 0, lastScore: safeScore, bestScore: Math.max(previous.bestScore, safeScore), completed, lastAttemptAt: now.toISOString(), currentBank: nextBank, masteredBanks: [...masteredBanks].sort((a, b) => a - b), seenQuestionIds: [...new Set([...previous.seenQuestionIds, ...questionIds])], missedQuestionIds: safeScore < 1 ? [...new Set([...previous.missedQuestionIds, ...missedQuestionIds])] : previous.missedQuestionIds.filter((id) => !questionIds.includes(id)), recentQuestionIds: [...new Set([...previous.recentQuestionIds, ...questionIds])].slice(-MAX_RECENT) };
  progress.totalQuestions += safeCount; progress.totalCorrect += correct; progress.xp += safeCount + correct * 5 + (safeScore === 1 ? 15 : safeScore >= 0.8 ? 5 : 0) + (bankMastered ? 25 : 0) + (completed && !previous.completed ? 100 : 0); if (safeScore === 1) progress.perfectTests += 1; if (!previous.completed && completed) progress.completedLessons += 1; updateStreak(progress, now); progress.unlockedBadges = unlockBadges(progress); saveProgress(uid, progress); return progress;
}

export function knowledgeScore(progress: LearningProgress): number { return progress.totalQuestions ? Math.round((progress.totalCorrect / progress.totalQuestions) * 100) : 0; }
export function knowledgeLevel(progress: LearningProgress): string { const score = knowledgeScore(progress); if (score >= 95) return "Legendary Titan"; if (score >= 85) return "Titan"; if (score >= 75) return "Hognose Expert"; if (score >= 60) return "Hognose Specialist"; if (score >= 45) return "Experienced Keeper"; if (score >= 30) return "Keeper"; if (score >= 15) return "Youngling"; return "Hatchling"; }
export type Badge = { id: string; name: string; icon: string; description: string; requirement: (progress: LearningProgress) => boolean; target?: number; progress?: (progress: LearningProgress) => number };
export const badges: Badge[] = [
  { id: "first-test", name: "First Challenge", icon: "🧠", description: "Complete your first mini test.", requirement: (p) => p.totalQuestions > 0, target: 1, progress: (p) => p.totalQuestions > 0 ? 1 : 0 },
  { id: "first-lesson", name: "First Lesson", icon: "📖", description: "Master your first complete topic.", requirement: (p) => p.completedLessons >= 1, target: 1, progress: (p) => Math.min(1, p.completedLessons) },
  { id: "perfect", name: "Perfect Score", icon: "💯", description: "Get your first 100% bank score.", requirement: (p) => p.perfectTests >= 1, target: 1, progress: (p) => Math.min(1, p.perfectTests) },
  { id: "curious", name: "Curious Titan", icon: "🔎", description: "Master 5 topics.", requirement: (p) => p.completedLessons >= 5, target: 5, progress: (p) => Math.min(5, p.completedLessons) },
  { id: "knowledge-seeker", name: "Knowledge Seeker", icon: "📚", description: "Master 25 topics.", requirement: (p) => p.completedLessons >= 25, target: 25, progress: (p) => Math.min(25, p.completedLessons) },
  { id: "genetics", name: "Genetics Apprentice", icon: "🧬", description: "Master a genetics topic.", requirement: (p) => Object.entries(p.topics).some(([id, value]) => /genetic|poly|het|morph/i.test(id) && value.completed), target: 1, progress: (p) => Object.entries(p.topics).some(([id, value]) => /genetic|poly|het|morph/i.test(id) && value.completed) ? 1 : 0 },
  { id: "brainy", name: "Brainy Titan", icon: "🏆", description: "Earn 10 perfect bank scores.", requirement: (p) => p.perfectTests >= 10, target: 10, progress: (p) => Math.min(10, p.perfectTests) },
  { id: "titan", name: "Titan", icon: "🐍", description: "Reach 75% overall knowledge.", requirement: (p) => knowledgeScore(p) >= 75, target: 75, progress: knowledgeScore },
  { id: "streak-3", name: "Three-Day Titan", icon: "🔥", description: "Learn on three consecutive days.", requirement: (p) => p.longestStreak >= 3, target: 3, progress: (p) => Math.min(3, p.longestStreak) },
  { id: "streak-7", name: "Week of Wisdom", icon: "🌟", description: "Learn on seven consecutive days.", requirement: (p) => p.longestStreak >= 7, target: 7, progress: (p) => Math.min(7, p.longestStreak) },
];
export function unlockBadges(progress: LearningProgress): string[] { const existing = new Set(progress.unlockedBadges); for (const badge of badges) if (badge.requirement(progress)) existing.add(badge.id); return [...existing]; }
export function getBadgeState(progress: LearningProgress, badgeId: string): boolean { return progress.unlockedBadges.includes(badgeId); }
