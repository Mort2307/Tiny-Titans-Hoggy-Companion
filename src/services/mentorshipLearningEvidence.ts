import type { LearningProgress } from "../types/Learning";
import type { MentorshipGoal } from "./mentorshipIntelligence";

export type LearningEvidence = {
  completedLessons: number;
  masteredTopics: number;
  averageMastery: number;
  relevantMastery: number;
  xp: number;
  streak: number;
  reasoningSignals: number;
  relevantTopics: string[];
};

const goalKeywords: Record<MentorshipGoal, string[]> = {
  husbandry: ["husbandry", "enclosure", "feeding", "shed", "health"],
  genetics: ["genetics", "morph", "inheritance"],
  breeding: ["breeding", "genetics", "reproduction", "conditioning"],
  "first-clutch": ["breeding", "genetics", "reproduction", "clutch", "hatchling"],
  hatchlings: ["hatchling", "feeding", "shed", "husbandry"],
  mentor: ["husbandry", "genetics", "breeding", "learning", "reasoning"],
};

export function deriveLearningEvidence(progress: LearningProgress | null, goal: MentorshipGoal): LearningEvidence {
  if (!progress) return { completedLessons: 0, masteredTopics: 0, averageMastery: 0, relevantMastery: 0, xp: 0, streak: 0, reasoningSignals: 0, relevantTopics: [] };
  const topics = Object.entries(progress.topics);
  const mastered = topics.filter(([, topic]) => topic.mastery >= 0.8);
  const keywords = goalKeywords[goal];
  const relevant = topics.filter(([id]) => keywords.some((keyword) => id.toLowerCase().includes(keyword)));
  const average = topics.length ? topics.reduce((sum, [, topic]) => sum + topic.mastery, 0) / topics.length : 0;
  const relevantAverage = relevant.length ? relevant.reduce((sum, [, topic]) => sum + topic.mastery, 0) / relevant.length : 0;
  const reasoningSignals = topics.reduce((count, [, topic]) => count + Math.min(topic.mastery, 1), 0);
  return {
    completedLessons: progress.completedLessons,
    masteredTopics: mastered.length,
    averageMastery: average,
    relevantMastery: relevantAverage,
    xp: progress.xp,
    streak: progress.currentStreak,
    reasoningSignals: Math.round(reasoningSignals * 10) / 10,
    relevantTopics: relevant.map(([id]) => id),
  };
}
