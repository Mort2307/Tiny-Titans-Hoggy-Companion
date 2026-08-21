import type { MentorshipGoal } from "./mentorshipIntelligence";

export type MentorshipSignal = { label: string; value: "strong" | "developing" | "unknown"; explanation: string };
export type MentorshipInsightInput = {
  goal: MentorshipGoal;
  hasWeightRecords?: boolean;
  hasFeedingRecords?: boolean;
  hasShedRecords?: boolean;
  hasGeneticsRecords?: boolean;
  hasEnclosureData?: boolean;
  learningCompleted?: number;
  learningTotal?: number;
  experienceMonths?: number;
};

const goalNeeds: Record<MentorshipGoal, string[]> = {
  husbandry: ["weight", "feeding", "sheds", "enclosure"],
  genetics: ["genetics", "learning"],
  breeding: ["weight", "feeding", "genetics", "learning"],
  "first-clutch": ["weight", "feeding", "genetics", "learning", "enclosure"],
  hatchlings: ["weight", "feeding", "sheds", "enclosure"],
  mentor: ["learning", "experience"],
};

export function buildMentorshipReadiness(input: MentorshipInsightInput) {
  const values: Record<string, boolean> = {
    weight: Boolean(input.hasWeightRecords),
    feeding: Boolean(input.hasFeedingRecords),
    sheds: Boolean(input.hasShedRecords),
    genetics: Boolean(input.hasGeneticsRecords),
    enclosure: Boolean(input.hasEnclosureData),
    learning: Boolean(input.learningTotal && input.learningCompleted && input.learningCompleted > 0),
    experience: Boolean(input.experienceMonths && input.experienceMonths >= 6),
  };
  const needs = goalNeeds[input.goal];
  const known = needs.filter((need) => values[need]).length;
  const score = Math.round((known / needs.length) * 100);
  const signals: MentorshipSignal[] = needs.map((need) => ({
    label: need[0].toUpperCase() + need.slice(1),
    value: values[need] ? "strong" : "unknown",
    explanation: values[need] ? "TTHC has useful evidence to work from." : "Adding this information would make the mentorship pathway more useful.",
  }));
  const nextStep = signals.find((signal) => signal.value === "unknown")?.label ?? "Start your first mentor conversation";
  return { score, signals, nextStep, confidence: score >= 75 ? "good" : score >= 40 ? "developing" : "early" } as const;
}

export function getAdaptiveMentorshipMessage(goal: MentorshipGoal, readiness: ReturnType<typeof buildMentorshipReadiness>) {
  if (readiness.confidence === "good") return `You have a useful record base for ${goal}. TTHC recommends focusing the mentorship on decisions and reasoning rather than repeating basic record keeping.`;
  if (readiness.confidence === "developing") return `You have started building evidence for ${goal}. A mentor can help you turn the gaps into a practical learning plan.`;
  return `You are at the early stage of this pathway. TTHC recommends building a small evidence base first so your mentor can work from your real keeper experience.`;
}
