import { learningTopics } from "./learningTopics";
import { advancedChallengeQuestions } from "./advancedChallengeQuestions";

/**
 * Canonical Titans Challenge topic list.
 * Existing lesson content remains untouched; final reasoning banks are layered
 * on here so every existing challenge topic can reach its full mastery path.
 */
export const challengeTopics = learningTopics.map((topic) => ({
  ...topic,
  questions: [
    ...topic.questions,
    ...(advancedChallengeQuestions[topic.id] ?? []),
  ],
}));

export function getChallengeTopic(id: string) {
  return challengeTopics.find((topic) => topic.id === id);
}
