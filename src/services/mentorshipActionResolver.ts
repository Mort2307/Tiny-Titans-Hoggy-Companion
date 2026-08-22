import type { KnowledgeGap } from "./mentorshipKnowledgeGaps";

export type MentorshipAction = {
  label: string;
  route: string;
  reason: string;
};

export function resolveMentorshipAction(gap: KnowledgeGap): MentorshipAction {
  switch (gap.id) {
    case "genetic-certainty":
      return { label: "Review genetics", route: "/morph-library", reason: "Check documented genetics before making pairing decisions." };
    case "genetics-learning":
    case "breeding-learning":
      return { label: "Continue learning", route: "/learning", reason: "Build the relevant knowledge before progressing." };
    case "weight-evidence":
      return { label: "Open weight tracker", route: "/weight-records", reason: "Build a stronger growth and condition history." };
    case "enclosure-evidence":
      return { label: "Review enclosure", route: "/enclosures", reason: "Complete husbandry evidence for the relevant snake." };
    case "no-snake-records":
      return { label: "Add a snake", route: "/add-snake", reason: "TTHC needs an animal record before it can use tracker evidence." };
    case "mentor-foundations":
      return { label: "View learning", route: "/learning", reason: "Strengthen transferable knowledge before applying as a mentor." };
    default:
      return { label: "Find a mentor", route: "/community/keeper-meets-breeder", reason: "A mentor can add human context where automated evidence is limited." };
  }
}
