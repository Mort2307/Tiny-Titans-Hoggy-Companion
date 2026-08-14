import type { LearningTopic } from "../types/Learning";
import { additionalLearningQuestions } from "./learningQuestionBanks";
import { specialChallengeQuestions } from "./specialChallengeQuestions";
import { husbandryChallengeQuestions } from "./husbandryChallengeQuestions";
import { feedingChallengeQuestions } from "./feedingChallengeQuestions";

const baseTopics: LearningTopic[] = [
  {
    id: "feeding-foundations",
    title: "Feeding Foundations",
    icon: "🍽️",
    category: "Feeding",
    summary: "Build a sensible foundation for feeding records, individual context and evidence-based feeding decisions.",
    sections: {
      what: "Feeding is more than offering food. Good feeding management records what was offered, the snake's response and relevant changes over time.",
      why: "Individual snakes can differ in feeding patterns. Recording events and considering the wider picture helps keepers make measured decisions instead of reacting to isolated events.",
      who: "Every keeper benefits from a clear feeding history, whether they are caring for a first snake or maintaining an established collection.",
      when: "Feeding decisions should be considered alongside age, growth, body condition, shedding, season and other relevant observations.",
      how: "Offer an appropriate meal, minimise unnecessary disturbance around feeding and record the outcome. Use trends rather than a single event to guide decisions.",
      examples: "A single missed meal in an otherwise well snake is an observation to record. Repeated refusal combined with weight loss or other concerning changes is a different situation and may warrant investigation."
    },
    questions: feedingChallengeQuestions["feeding-foundations"],
    masteryBanks: 4
  }
];

const topics: LearningTopic[] = baseTopics.map((topic) => ({
  ...topic,
  questions: [
    ...(topic.questions ?? []),
    ...(additionalLearningQuestions[topic.id] ?? []),
    ...(specialChallengeQuestions[topic.id] ?? []),
    ...(husbandryChallengeQuestions[topic.id] ?? []),
    ...(feedingChallengeQuestions[topic.id] ?? []),
  ],
}));

export const learningTopics = topics;
