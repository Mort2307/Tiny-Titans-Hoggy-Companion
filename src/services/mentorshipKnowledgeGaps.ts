import type { MentorshipGoal } from "./mentorshipIntelligence";
import type { LearningEvidence } from "./mentorshipLearningEvidence";
import type { MentorshipTrackerEvidence } from "./mentorshipTrackerEvidence";

export type KnowledgeGapPriority = "high" | "medium" | "low";
export type KnowledgeGapAction = "learn" | "record" | "review" | "mentor";

export type KnowledgeGap = {
  id: string;
  title: string;
  reason: string;
  priority: KnowledgeGapPriority;
  action: KnowledgeGapAction;
  actionLabel: string;
  score: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function detectKnowledgeGaps(goal: MentorshipGoal, tracker: MentorshipTrackerEvidence, learning: LearningEvidence): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];
  const add = (gap: KnowledgeGap) => gaps.push({ ...gap, score: clamp(gap.score) });

  if (goal === "genetics" || goal === "breeding" || goal === "first-clutch") {
    if (learning.relevantMastery < 0.7) add({ id: "genetics-mastery", title: "Strengthen genetics understanding", reason: "Your goal depends on understanding inheritance and genetic certainty, but relevant learning mastery is still developing.", priority: learning.relevantMastery < 0.45 ? "high" : "medium", action: "learn", actionLabel: "Open genetics learning", score: 1 - learning.relevantMastery });
    if (tracker.snakesWithGenetics < 2) add({ id: "genetics-records", title: "Build stronger genetics records", reason: "TTHC has limited recorded genetics evidence for the animals involved in this pathway.", priority: "high", action: "record", actionLabel: "Review genetics records", score: 0.9 });
  }

  if (goal === "husbandry" || goal === "hatchlings" || goal === "breeding" || goal === "first-clutch") {
    if (tracker.weightRecordCount < 5) add({ id: "weight-evidence", title: "Strengthen weight tracking", reason: "A small weight history makes growth and condition trends harder to assess confidently.", priority: tracker.weightRecordCount === 0 ? "high" : "medium", action: "record", actionLabel: "Open weight tracker", score: tracker.weightRecordCount === 0 ? 1 : 0.7 });
    if (tracker.feedingRecordCount < 5) add({ id: "feeding-evidence", title: "Build feeding history", reason: "More consistent feeding records give TTHC better context for husbandry and growth discussions.", priority: tracker.feedingRecordCount === 0 ? "high" : "medium", action: "record", actionLabel: "Open feeding tracker", score: tracker.feedingRecordCount === 0 ? 1 : 0.65 });
  }

  if (goal === "hatchlings") {
    if (tracker.shedRecordCount < 2) add({ id: "shed-observation", title: "Strengthen shed observation", reason: "Hatchling progression benefits from consistent observation and shed records.", priority: "medium", action: "record", actionLabel: "Open shed tracker", score: tracker.shedRecordCount === 0 ? 0.9 : 0.55 });
  }

  if (goal === "mentor") {
    if (learning.reasoningSignals < 3) add({ id: "reasoning", title: "Demonstrate reasoning, not just recall", reason: "Mentoring requires explaining why a decision is appropriate, not simply knowing an answer.", priority: "high", action: "learn", actionLabel: "Try reasoning challenges", score: 0.8 });
    if (tracker.weightRecordCount + tracker.feedingRecordCount + tracker.shedRecordCount < 10) add({ id: "practical-evidence", title: "Build practical evidence", reason: "A mentor profile should be supported by real keeper experience and consistent records.", priority: "medium", action: "record", actionLabel: "Build tracker history", score: 0.65 });
  }

  if (!gaps.length) add({ id: "mentor-review", title: "Validate your next step with a mentor", reason: "Your available evidence does not show a major automated gap. A human mentor can add context that tracker data cannot.", priority: "low", action: "mentor", actionLabel: "Find a suitable mentor", score: 0.25 });
  return gaps.sort((a, b) => b.score - a.score);
}
