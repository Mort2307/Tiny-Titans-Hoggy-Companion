import type { LearningProgress } from "../../types/Learning";
import type { LearningSignal } from "./learningCommunityIntelligenceEngine";

/**
 * Converts the persisted challenge aggregates into conservative learning signals.
 * Aggregates are repeated only up to their recorded totals; no answer history is invented.
 */
export function learningSignalsFromProgress(progress: LearningProgress): LearningSignal[] {
  const signals: LearningSignal[] = [];
  for (const [topicId, topic] of Object.entries(progress.topics)) {
    const attempts = Math.max(0, Math.floor(topic.attempts || 0));
    const correct = Math.max(0, Math.min(attempts, Math.floor(topic.correct || 0)));
    for (let index = 0; index < attempts; index += 1) signals.push({ topicId, correct: index < correct });
  }
  return signals;
}

export interface SpeciesMasterySnapshot {
  topicId: string;
  attempts: number;
  masteryPercent: number;
  demonstrated: boolean;
  lastAttemptAt: string | null;
}

export function buildSpeciesMasterySnapshot(progress: LearningProgress): SpeciesMasterySnapshot[] {
  return Object.entries(progress.topics).map(([topicId, topic]) => ({
    topicId,
    attempts: topic.attempts,
    masteryPercent: Math.max(0, Math.min(100, topic.mastery ?? 0)),
    demonstrated: Boolean(topic.completed || (topic.mastery ?? 0) >= 80),
    lastAttemptAt: topic.lastAttemptAt ?? null,
  })).sort((a, b) => b.masteryPercent - a.masteryPercent || b.attempts - a.attempts);
}
