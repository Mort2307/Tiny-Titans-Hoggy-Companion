import type { QuizQuestion } from "../types/Learning";

export const specialChallengeQuestions: Record<string, QuizQuestion[]> = {
  "why-snakes-shed": [
    {
      id: "shed-husbandry-1",
      prompt: "A hognose has cloudy eyes and is hiding more than usual. What is the most appropriate first interpretation?",
      options: ["It may be entering a normal pre-shed phase, so observe and minimise unnecessary disturbance", "It definitely has an eye infection", "It must be hungry and should be handled immediately", "Its eyes need to be cleaned manually"],
      correctIndex: 0,
      explanation: "Cloudy or bluish eyes can be a normal part of the pre-shed cycle. The best first step is calm observation rather than assuming disease or intervening unnecessarily.",
      difficulty: 3, bank: 3, challengeType: "husbandry-detective",
      challengeData: { scenario: "Your hognose is duller than normal, its eyes look cloudy, and it has spent more time hiding." },
    },
    {
      id: "shed-husbandry-2",
      prompt: "A snake repeatedly has retained skin on its tail tip. Which response shows the best keeper reasoning?",
      options: ["Record the pattern, review husbandry and the snake's overall condition, and avoid forcibly pulling the skin", "Pull the retained skin off with tweezers immediately", "Stop providing a water source so the snake dries out", "Assume the snake is always dehydrated and change everything at once"],
      correctIndex: 0,
      explanation: "Repeated retained skin is worth investigating, but one observation does not prove a single cause. Good husbandry reasoning looks for patterns and avoids traumatic intervention.",
      difficulty: 3, bank: 3, challengeType: "keeper-scenario",
      challengeData: { scenario: "The same small area has been retained after several sheds." },
    },
    {
      id: "shed-sequence-1",
      prompt: "Which sequence best represents a simplified normal shed cycle?",
      options: ["Normal appearance → dull/opaque phase → eyes clear again → shedding", "Shedding → cloudy eyes → new skin forms → normal appearance", "Cloudy eyes → permanent scale loss → shedding → growth stops", "Brumation → shedding → feeding → cloudy eyes"],
      correctIndex: 0,
      explanation: "A simplified sequence is normal appearance, then the dull/opaque phase, followed by the eyes clearing again shortly before the old skin is shed.",
      difficulty: 3, bank: 3, challengeType: "sequence",
      challengeData: { sequenceItems: ["Normal appearance", "Dull/opaque phase", "Eyes clear again", "Shed"], instruction: "Choose the option that puts the main stages in the best order." },
    },
    {
      id: "shed-normal-monitor-1",
      prompt: "A complete shed comes away in two pieces, but there is no retained skin and the snake otherwise appears well. How should this be classified?",
      options: ["Usually monitor and record it rather than assuming a problem from the number of pieces alone", "Emergency", "Definite dehydration", "Definite infection"],
      correctIndex: 0,
      explanation: "The number of pieces is not enough by itself to diagnose a problem. Look at retained areas, repeated patterns and the snake's overall condition.",
      difficulty: 3, bank: 3, challengeType: "normal-monitor-investigate",
      challengeData: { scenario: "The old skin came away in two pieces. The tail, eyes and body are clear, and the snake is behaving normally." },
    },
    {
      id: "shed-reasoning-1",
      prompt: "Why is 'bad shed = dehydration' too simplistic as a keeper conclusion?",
      options: ["Retained or incomplete skin can have multiple possible contributing causes, so the whole pattern needs assessing", "Humidity can never affect shedding", "A bad shed is always genetic", "Shedding problems cannot be investigated"],
      correctIndex: 0,
      explanation: "Humidity and hydration can matter, but a shed observation alone does not establish a single cause. Good reasoning considers husbandry, health, environment and repeated history together.",
      difficulty: 4, bank: 3, challengeType: "reasoning",
      terminology: [{ term: "retained shed", simple: "old skin that has not come away from an area", definition: "A portion of the old outer skin remaining attached after the main shedding event." }],
    },
  ],
  "what-is-het": [
    {
      id: "het-genetics-builder-1",
      prompt: "A visual recessive snake is paired with a snake that is 100% het for the same recessive trait. What is the most useful conclusion about the offspring for that trait?",
      options: ["Every offspring will be visual", "About half are expected to be visual and the other half carriers, assuming a simple recessive model", "None can carry the allele", "The offspring will all be Super forms"],
      correctIndex: 1,
      explanation: "For a simple recessive model, visual × 100% het gives an expected 50% visual and 50% heterozygous offspring for that gene. These are probabilities across offspring, not a guarantee about a small clutch.",
      difficulty: 3, bank: 3, challengeType: "genetics-builder",
      challengeData: { labels: ["Visual recessive", "100% het"] },
      terminology: [{ term: "expected ratio", simple: "the pattern we predict across many offspring", definition: "A probability-based expectation from a known inheritance model; an individual clutch can differ from the exact percentage." }],
    },
  ],
};
