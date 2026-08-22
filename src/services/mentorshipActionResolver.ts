import type { KnowledgeGap } from "./mentorshipKnowledgeGaps";

export type MentorshipAction = {
  label: string;
  route: string;
  reason: string;
};

export function resolveMentorshipAction(gap: KnowledgeGap): MentorshipAction {
  switch (gap.id) {
    case "genetics-mastery":
      return { label: "Open genetics learning", route: "/learn", reason: "Build the relevant inheritance knowledge before progressing." };
    case "genetics-records":
      return { label: "Review genetics records", route: "/morph-library", reason: "Check documented genetics before making pairing decisions." };
    case "weight-evidence":
      return { label: "Open weight tracker", route: "/weights", reason: "Build a stronger growth and condition history." };
    case "feeding-evidence":
      return { label: "Open feeding tracker", route: "/feeding", reason: "Build a stronger feeding history for husbandry context." };
    case "shed-observation":
      return { label: "Open shed tracker", route: "/shedding", reason: "Build a stronger observation and shed history." };
    case "reasoning":
      return { label: "Try reasoning challenges", route: "/challenge", reason: "Demonstrate applied reasoning rather than simple recall." };
    case "practical-evidence":
      return { label: "Build tracker history", route: "/community/keeper-meets-breeder/intelligence", reason: "Continue building practical evidence before applying as a mentor." };
    case "mentor-review":
      return { label: "Find a suitable mentor", route: "/community/keeper-meets-breeder/mentors", reason: "A mentor can add human context that automated evidence cannot." };
    default:
      return { label: "Review your pathway", route: "/community/keeper-meets-breeder/intelligence", reason: "Return to Mentorship Intelligence and reassess your next step." };
  }
}
