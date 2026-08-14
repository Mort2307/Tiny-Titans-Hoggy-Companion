import type { QuizQuestion } from "../types/Learning";

export const specialChallengeQuestions: Record<string, QuizQuestion[]> = {
  "what-is-a-het": [
    {
      id: "het-genetics-builder-1",
      prompt: "A visual recessive snake is paired with a snake that is 100% het for the same recessive trait. What is the most useful conclusion about the offspring for that trait?",
      options: [
        "Every offspring will be visual",
        "About half are expected to be visual and the other half carriers, assuming a simple recessive model",
        "None can carry the allele",
        "The offspring will all be Super forms",
      ],
      correctIndex: 1,
      explanation: "For a simple recessive model, visual × 100% het gives an expected 50% visual and 50% heterozygous offspring for that gene. These are probabilities across offspring, not a guarantee about a small clutch.",
      difficulty: 3,
      bank: 3,
      challengeType: "genetics-builder",
      challengeData: { labels: ["Visual recessive", "100% het"] },
      terminology: [{ term: "expected ratio", simple: "the pattern we predict across many offspring", definition: "A probability-based expectation from a known inheritance model; an individual clutch can differ from the exact percentage." }],
    },
  ],
};
