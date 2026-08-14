import type { LearningTopic } from "../types/Learning";
import { additionalLearningQuestions } from "./learningQuestionBanks";
import { specialChallengeQuestions } from "./specialChallengeQuestions";
import { husbandryChallengeQuestions } from "./husbandryChallengeQuestions";
import { feedingChallengeQuestions } from "./feedingChallengeQuestions";
import { behaviorChallengeQuestions } from "./behaviorChallengeQuestions";

const baseTopics: LearningTopic[] = [
  {
    id: "why-snakes-shed", title: "Why Do Snakes Shed?", icon: "🐍", category: "Husbandry", summary: "Understand what shedding is, why it happens, when to expect it and what a healthy shed can look like.",
    sections: { what: "Shedding, or ecdysis, is the process where a snake removes its old outer skin and reveals a new layer underneath. The new skin has already formed before the old layer comes away.", why: "A snake's outer skin cannot simply stretch forever as the animal grows. Replacing it allows the snake to maintain a functional protective outer layer while its body gets larger.", who: "All snakes shed. Younger snakes usually shed more often because they are growing faster, while adults may shed less frequently. Individual patterns vary.", when: "A shed can happen whenever growth and skin replacement require it. Before shedding, a snake may become duller and its eyes can look cloudy or bluish. These signs are part of the normal pre-shed process.", how: "New skin forms beneath the old layer. Fluid helps separate the layers, then the snake uses movement and contact with surfaces to work the old skin loose and away from the body.", examples: "A complete shed can come away in one piece, but a shed in several pieces is not automatically an emergency. Look at the individual snake, enclosure conditions and whether retained skin remains around areas such as the eyes or tail tip." },
    questions: [
      { id: "shed-1", prompt: "Why does a snake shed?", options: ["Its old outer skin cannot grow with it", "It needs to clean its stomach", "It loses all of its scales", "It is trying to cool down"], correctIndex: 0, explanation: "The outer skin must be replaced as the snake grows.", difficulty: 1, bank: 1 },
      { id: "shed-2", prompt: "What is ecdysis?", options: ["Feeding", "Shedding", "Brumation", "Breathing"], correctIndex: 1, explanation: "Ecdysis is the biological term for shedding the old outer skin.", difficulty: 1, bank: 1, terminology: [{ term: "ecdysis", simple: "shedding the old outer skin", definition: "The biological process of shedding the old outer skin." }] },
      { id: "shed-3", prompt: "Which can be a normal sign that a snake is approaching a shed?", options: ["Cloudier-looking eyes", "A broken jaw", "Permanent loss of scales", "Blue tongue"], correctIndex: 0, explanation: "Cloudy or bluish-looking eyes can occur during the pre-shed phase.", difficulty: 2, bank: 2 },
      { id: "shed-4", prompt: "Where does the new skin form?", options: ["Under the old skin", "Inside the stomach", "Only on the head", "Only after the old skin falls off"], correctIndex: 0, explanation: "The new skin layer forms underneath the old outer layer before the old skin is shed.", difficulty: 2, bank: 2 },
      { id: "shed-5", prompt: "Which statement is most accurate?", options: ["Every snake must shed exactly once per month", "Young snakes often shed more frequently because they grow faster", "Adults never shed", "A shed in pieces always means a serious disease"], correctIndex: 1, explanation: "Shedding frequency varies, and growing young snakes often shed more frequently.", difficulty: 3, bank: 3 }
    ]
  },
  {
    id: "hognose-husbandry-foundations", title: "Hognose Husbandry Foundations", icon: "🏠", category: "Husbandry", summary: "Build a reliable husbandry foundation around environmental choices, observation and evidence-based keeper decisions.",
    sections: { what: "Good husbandry provides appropriate environmental choices such as a usable thermal gradient, secure hides and clean drinking water.", why: "A complete husbandry picture is more useful than chasing one magic number. Context, records and the individual snake all matter.", who: "Every keeper benefits from a strong husbandry foundation, including experienced keepers who want a useful refresher.", when: "Review husbandry when establishing an enclosure, after meaningful changes and whenever a repeated pattern suggests the environment may need closer assessment.", how: "Measure relevant conditions, provide appropriate choices, record observations and change variables deliberately rather than changing everything at once.", examples: "A snake spending time hidden can be normal. A repeated unexplained change alongside weight loss or other concerning signs is a different situation and may warrant investigation." },
    questions: husbandryChallengeQuestions["hognose-husbandry-foundations"]
  },
  {
    id: "feeding-foundations", title: "Feeding Foundations", icon: "🍽️", category: "Feeding", summary: "Build a sensible foundation for feeding records, individual context and evidence-based feeding decisions.",
    sections: { what: "Feeding management records what was offered, when it was offered and how the individual snake responded.", why: "Feeding patterns vary between individuals. Records help identify trends rather than encouraging reactions to isolated events.", who: "Every keeper benefits from a clear feeding history, from first-time keepers to experienced breeders.", when: "Consider feeding alongside age, growth, body condition, shedding, season and other relevant observations.", how: "Offer an appropriate meal, minimise unnecessary disturbance around feeding and record the outcome. Use trends rather than a single event to guide decisions.", examples: "A single missed meal in an otherwise well snake is an observation to record. Repeated refusal combined with weight loss or other concerning changes is a different situation and may warrant investigation." },
    questions: feedingChallengeQuestions["feeding-foundations"]
  },
  {
    id: "hognose-behaviour", title: "Hognose Behaviour", icon: "🐍", category: "Behaviour", summary: "Learn to describe hognose behaviour accurately, recognise normal variation and reason through behavioural changes without jumping to conclusions.",
    sections: { what: "Behaviour includes observable actions such as exploring, burrowing, hiding, tongue flicking and defensive displays.", why: "Behaviour is contextual. Describing what happened and considering recent events is more useful than attaching a fixed label to one response.", who: "All keepers benefit from being able to distinguish normal behaviour from a repeated behavioural change that deserves closer attention.", when: "Consider behaviour in relation to feeding, shedding, handling, enclosure changes, time and the snake's overall condition.", how: "Describe the behaviour precisely, record the context, look for patterns and separate observations from assumptions.", examples: "A single defensive display during a stressful interaction is not the same evidence as a persistent unexplained behavioural change accompanied by other concerning observations." },
    questions: behaviorChallengeQuestions["hognose-behaviour"]
  },
  {
    id: "what-is-polygenic", title: "What Does Polygenic Mean?", icon: "🧬", category: "Genetics", summary: "Learn why some traits involve contributions from multiple genes instead of a simple one-gene inheritance pattern.",
    sections: { what: "Polygenic means a trait is influenced by multiple genes or genetic factors rather than being controlled by one single gene with a simple inheritance pattern.", why: "Multiple genetic factors can combine to influence how a trait appears. This is why some characteristics do not behave like a straightforward dominant or recessive morph.", who: "Polygenic inheritance is a genetic concept that applies across many organisms and is useful when discussing variable or line-bred characteristics.", when: "Use the term when multiple genetic factors contribute to the phenotype. Do not use it simply because a trait is difficult to predict.", how: "Each contributing genetic factor can influence the final phenotype. Combined effects can make outcomes more variable than a single-gene model.", examples: "A line-bred trait can show variation across offspring because multiple factors contribute to appearance. That is different from claiming a simple recessive gene where two copies produce a predictable visual." },
    questions: [
      { id: "poly-1", prompt: "What does polygenic mean?", options: ["Influenced by multiple genes", "Caused by no genes", "Always a recessive gene", "A synonym for visual"], correctIndex: 0, explanation: "Polygenic describes traits influenced by multiple genes or genetic factors.", difficulty: 1, bank: 1, terminology: [{ term: "polygenic", simple: "many genes can contribute", definition: "A trait influenced by multiple genes or genetic factors." }] },
      { id: "poly-2", prompt: "Is polygenic inheritance automatically the same as a simple recessive morph?", options: ["Yes", "No", "Only in hatchlings", "Only in Super morphs"], correctIndex: 1, explanation: "Polygenic traits do not follow the same simple one-gene recessive model.", difficulty: 2, bank: 2 },
      { id: "poly-3", prompt: "Why can polygenic traits be harder to predict?", options: ["Several contributing factors can combine", "Snakes choose their genes", "The genes disappear during incubation", "Polygenic means random with no genetics involved"], correctIndex: 0, explanation: "Multiple contributing factors can produce more variable outcomes.", difficulty: 3, bank: 3 }
    ]
  },
  {
    id: "what-is-a-het", title: "What Is a Het?", icon: "🧬", category: "Genetics", summary: "Understand heterozygous, visual and carrier terminology without confusing incomplete-dominant traits with recessive hets.",
    sections: { what: "Het is short for heterozygous. In a simple recessive model, an animal carrying one copy of a recessive allele may look normal but can pass that allele to offspring.", why: "Knowing whether a snake carries a recessive allele changes breeding predictions. It is especially important to distinguish a true recessive carrier from traits that do not produce a conventional het state.", who: "Breeders, keepers and anyone using a genetics calculator will encounter het terminology when discussing recessive inheritance.", when: "A het label is meaningful only when the underlying genetic model supports it. You cannot simply add 'het' to every morph name.", how: "For a simple recessive gene, a heterozygous animal has one copy of the allele. Two copies can produce the visual phenotype in that model, while a single copy is the carrier state.", examples: "A snake can be 100% het for a simple recessive trait when its genotype is known, while a 50% or 66% possible het describes probability rather than certainty." },
    questions: [
      { id: "het-1", prompt: "What does 'het' usually mean?", options: ["Heterozygous", "Healthy", "Hatchling", "Heat tolerant"], correctIndex: 0, explanation: "Het is shorthand for heterozygous.", difficulty: 1, bank: 1, terminology: [{ term: "heterozygous", simple: "two different alleles", definition: "Having two different alleles at a gene in a simple diploid model." }] },
      { id: "het-2", prompt: "Can every morph have a conventional het state?", options: ["Yes", "No", "Only Super morphs", "Only line-bred traits"], correctIndex: 1, explanation: "A conventional het state depends on the inheritance model.", difficulty: 2, bank: 2 },
      { id: "het-3", prompt: "What does a 50% possible het mean?", options: ["The snake is definitely het", "There is a calculated 50% probability the snake carries the allele", "The snake is visual", "The snake has two copies"], correctIndex: 1, explanation: "A possible het percentage expresses probability, not certainty.", difficulty: 3, bank: 3 }
    ]
  }
];

export const learningTopics: LearningTopic[] = baseTopics.map((topic) => ({
  ...topic,
  questions: [
    ...topic.questions,
    ...(additionalLearningQuestions[topic.id] ?? []),
    ...(specialChallengeQuestions[topic.id] ?? []),
    ...(husbandryChallengeQuestions[topic.id] ?? []),
    ...(feedingChallengeQuestions[topic.id] ?? []),
    ...(behaviorChallengeQuestions[topic.id] ?? []),
  ],
}));

export function getLearningTopic(id: string): LearningTopic | undefined { return learningTopics.find((topic) => topic.id === id); }
