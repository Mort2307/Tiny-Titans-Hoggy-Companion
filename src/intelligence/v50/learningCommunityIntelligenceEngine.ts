export interface LearningSignal {
  topicId: string;
  correct: boolean;
  responseTimeMs?: number;
}

export interface CommunityContribution {
  contributorId: string;
  contributionType: "morph" | "observation" | "feedback" | "bug" | "research" | "husbandry";
  accepted: boolean;
  evidenceLevel?: "established" | "supported" | "reported" | "uncertain" | "disputed";
}

export function buildAdaptiveLearningProfile(signals: readonly LearningSignal[]) {
  const byTopic = new Map<string, { total: number; correct: number }>();
  for (const signal of signals) {
    const existing = byTopic.get(signal.topicId) ?? { total: 0, correct: 0 };
    existing.total += 1;
    if (signal.correct) existing.correct += 1;
    byTopic.set(signal.topicId, existing);
  }
  const mastery = [...byTopic.entries()].map(([topicId, value]) => ({
    topicId,
    attempts: value.total,
    accuracy: Number((value.correct / value.total).toFixed(3)),
  }));
  const overall = signals.length ? Number((signals.filter((signal) => signal.correct).length / signals.length).toFixed(3)) : 0;
  return {
    overallAccuracy: overall,
    topicMastery: mastery,
    confidence: signals.length >= 20 ? "High" : signals.length >= 8 ? "Moderate" : signals.length ? "Low" : "More data needed",
  } as const;
}

export function chooseNextLearningTopics(signals: readonly LearningSignal[], availableTopics: readonly string[]): readonly string[] {
  const profile = buildAdaptiveLearningProfile(signals);
  const mastered = new Map(profile.topicMastery.map((topic) => [topic.topicId, topic.accuracy]));
  return [...availableTopics]
    .sort((a, b) => (mastered.get(a) ?? 0) - (mastered.get(b) ?? 0))
    .slice(0, 5);
}

export function calculateKeeperReputation(contributions: readonly CommunityContribution[]): number {
  if (!contributions.length) return 0;
  let score = 0;
  for (const contribution of contributions) {
    if (contribution.accepted) score += 10;
    if (contribution.evidenceLevel === "established") score += 4;
    else if (contribution.evidenceLevel === "supported") score += 2;
    else if (contribution.evidenceLevel === "reported") score += 1;
    if (!contribution.accepted) score = Math.max(0, score - 1);
  }
  return Math.min(100, score);
}

export function buildCommunityCensus(contributions: readonly CommunityContribution[]) {
  const accepted = contributions.filter((item) => item.accepted);
  const byType = new Map<string, number>();
  for (const contribution of accepted) byType.set(contribution.contributionType, (byType.get(contribution.contributionType) ?? 0) + 1);
  return {
    totalAccepted: accepted.length,
    contributionTypes: Object.fromEntries(byType),
    privacyBoundary: "Aggregate counts only; private keeper identity and raw animal records are not part of this census result.",
  };
}
