export type MentorshipGoal = "husbandry" | "genetics" | "breeding" | "first-clutch" | "hatchlings" | "mentor";

export type MentorSpeciality = "husbandry" | "genetics" | "breeding" | "hatchlings" | "behaviour" | "enclosures" | "records" | "community";

export type MentorshipSignal = {
  label: string;
  reason: string;
  weight: number;
};

export type MentorshipProfile = {
  goals: MentorshipGoal[];
  specialities: MentorSpeciality[];
  experienceYears?: number;
  breedingYears?: number;
  clutchCount?: number;
  verified?: boolean;
};

export type MentorshipMatch = {
  score: number;
  signals: MentorshipSignal[];
  caveat: string;
};

const goalSpecialities: Record<MentorshipGoal, MentorSpeciality[]> = {
  husbandry: ["husbandry", "behaviour", "enclosures"],
  genetics: ["genetics", "records"],
  breeding: ["breeding", "genetics", "records"],
  "first-clutch": ["breeding", "genetics", "hatchlings"],
  hatchlings: ["hatchlings", "records", "husbandry"],
  mentor: ["community", "husbandry", "records"],
};

/**
 * Deterministic, explainable matching. This deliberately avoids a black-box
 * score so users can see why a mentor/pathway was recommended.
 */
export function scoreMentor(goal: MentorshipGoal, mentor: MentorshipProfile): MentorshipMatch {
  const desired = goalSpecialities[goal];
  const matching = desired.filter((speciality) => mentor.specialities.includes(speciality));
  const signals: MentorshipSignal[] = [];

  if (matching.length) {
    signals.push({
      label: "Goal alignment",
      reason: `${matching.length} relevant speciality${matching.length === 1 ? "" : "ies"} match your selected goal.`,
      weight: Math.min(45, matching.length * 15),
    });
  }
  if (goal === "breeding" || goal === "first-clutch") {
    if ((mentor.breedingYears ?? 0) > 0) signals.push({ label: "Breeding experience", reason: `${mentor.breedingYears} year${mentor.breedingYears === 1 ? "" : "s"} of breeding experience is relevant to this goal.`, weight: Math.min(25, (mentor.breedingYears ?? 0) * 5) });
    if ((mentor.clutchCount ?? 0) > 0) signals.push({ label: "Practical experience", reason: `${mentor.clutchCount} recorded clutch${mentor.clutchCount === 1 ? "" : "es"} indicates hands-on breeding experience.`, weight: Math.min(15, mentor.clutchCount ?? 0) });
  }
  if (mentor.verified) signals.push({ label: "Mentor verified", reason: "The mentor has passed the TTHC verification process.", weight: 10 });

  const raw = 50 + signals.reduce((total, signal) => total + signal.weight, 0);
  return {
    score: Math.min(99, Math.max(50, raw)),
    signals: signals.sort((a, b) => b.weight - a.weight),
    caveat: "Match score indicates relevance, not mentor quality or veterinary authority.",
  };
}
