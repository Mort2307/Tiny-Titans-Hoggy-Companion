import type { LearningProgress } from "../types/Learning";
import type { MentorshipWorkspace } from "./mentorshipWorkspace";
import { deriveLearningEvidence } from "./mentorshipLearningEvidence";
import { detectKnowledgeGaps, type KnowledgeGap } from "./mentorshipKnowledgeGaps";
import type { MentorshipGoal } from "./mentorshipIntelligence";
import type { MentorshipTrackerEvidence } from "./mentorshipTrackerEvidence";

export type MentorBrief = {
  goal: string;
  summary: string;
  evidence: string[];
  learning: string[];
  gaps: KnowledgeGap[];
  suggestedDiscussion: string[];
  generatedAt: string;
};

export function buildMentorBrief(goal: MentorshipGoal, tracker: MentorshipTrackerEvidence, learning: LearningProgress | null, workspace: MentorshipWorkspace): MentorBrief {
  const learningEvidence = deriveLearningEvidence(learning, goal);
  const gaps = detectKnowledgeGaps(goal, tracker, learningEvidence);
  const evidence: string[] = [
    `${tracker.snakeCount} snake${tracker.snakeCount === 1 ? "" : "s"} recorded`,
    workspace.permissions.view_weight ? `${tracker.weightRecordCount} weight records` : "Weight records not shared",
    workspace.permissions.view_feeding ? `${tracker.feedingRecordCount} feeding records` : "Feeding records not shared",
    workspace.permissions.view_sheds ? `${tracker.shedRecordCount} shed records` : "Shed records not shared",
    workspace.permissions.view_genetics ? `${tracker.snakesWithGenetics} snake${tracker.snakesWithGenetics === 1 ? "" : "s"} with genetics recorded` : "Genetics records not shared",
    workspace.permissions.view_enclosure ? `${tracker.snakesWithEnclosures} enclosure record${tracker.snakesWithEnclosures === 1 ? "" : "s"}` : "Enclosure information not shared",
  ];
  const learningLines = learning ? [`${learning.completedLessons} lessons completed`, `${Math.round(learningEvidence.averageMastery * 100)}% average topic mastery`, `${Math.round(learningEvidence.relevantMastery * 100)}% goal-relevant mastery`] : ["Learning progress has not been shared."];
  const suggestedDiscussion = gaps.slice(0, 3).map((gap) => gap.title);
  const primary = gaps[0];
  return {
    goal,
    summary: primary ? `The strongest current discussion point is ${primary.title.toLowerCase()}. TTHC recommends using this brief to guide a human conversation rather than treating the automated assessment as a verdict.` : "No major automated gap was identified. Human mentor context remains valuable.",
    evidence,
    learning: learningLines,
    gaps,
    suggestedDiscussion,
    generatedAt: new Date().toISOString(),
  };
}
