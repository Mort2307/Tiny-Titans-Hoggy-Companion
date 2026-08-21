export type MentorVerification = "community" | "verified" | "breeder" | "educator" | "veterinary";

export type MentorProfile = {
  id: string;
  displayName: string;
  bio: string;
  verification: MentorVerification;
  specialities: string[];
  experienceYears: number;
  breedingYears?: number;
  clutchCount?: number;
  availability: "accepting" | "limited" | "unavailable";
  mentoringGoals: string[];
};

export type MentorshipMilestone = {
  id: string;
  title: string;
  description: string;
  status: "not-started" | "in-progress" | "discussed" | "completed";
};

export type MentorshipJourney = {
  id: string;
  goal: string;
  mentorId?: string;
  status: "planning" | "requested" | "active" | "paused" | "completed";
  milestones: MentorshipMilestone[];
  sharedRecords: string[];
};

export const verificationLabels: Record<MentorVerification, string> = {
  community: "Community Mentor",
  verified: "Verified Mentor",
  breeder: "Breeder Mentor",
  educator: "TTHC Educator",
  veterinary: "Veterinary Professional",
};

export const mentorshipMilestones: Record<string, MentorshipMilestone[]> = {
  husbandry: [
    { id: "observe", title: "Observation fundamentals", description: "Learn to interpret behaviour and individual patterns rather than relying only on generic rules.", status: "not-started" },
    { id: "environment", title: "Environment review", description: "Review enclosure, temperature, substrate, hides and lighting with context.", status: "not-started" },
    { id: "records", title: "Use your records", description: "Turn feeding, weight and shed records into useful husbandry decisions.", status: "not-started" },
  ],
  genetics: [
    { id: "inheritance", title: "Inheritance fundamentals", description: "Understand dominant, incomplete-dominant and recessive inheritance.", status: "not-started" },
    { id: "hets", title: "Hets and uncertainty", description: "Learn how genetic certainty should be recorded and communicated.", status: "not-started" },
    { id: "pairing", title: "Read a pairing", description: "Interpret potential outcomes without treating a probability as a guarantee.", status: "not-started" },
  ],
  breeding: [
    { id: "readiness", title: "Breeding readiness", description: "Assess animals, records and practical capacity before considering a pairing.", status: "not-started" },
    { id: "conditioning", title: "Conditioning and cycle", description: "Understand seasonal and reproductive preparation with experienced guidance.", status: "not-started" },
    { id: "pairing", title: "Responsible pairing", description: "Evaluate genetics, welfare, goals and contingency planning.", status: "not-started" },
  ],
  "first-clutch": [
    { id: "planning", title: "Pre-clutch planning", description: "Prepare housing, equipment, records and contingency plans.", status: "not-started" },
    { id: "incubation", title: "Incubation principles", description: "Understand incubation variables and what to monitor.", status: "not-started" },
    { id: "hatchlings", title: "Hatchling preparation", description: "Plan feeding, records, sheds, health monitoring and placement.", status: "not-started" },
  ],
  hatchlings: [
    { id: "setup", title: "Hatchling systems", description: "Create consistent individual setups and records.", status: "not-started" },
    { id: "feeding", title: "Feeding and growth", description: "Interpret feeding response and growth over time rather than isolated weights.", status: "not-started" },
    { id: "placement", title: "Responsible placement", description: "Plan transparent, welfare-focused placement and records.", status: "not-started" },
  ],
  mentor: [
    { id: "knowledge", title: "Knowledge foundations", description: "Build a strong, evidence-aware understanding of the areas you want to teach.", status: "not-started" },
    { id: "communication", title: "Teaching skills", description: "Learn to explain reasoning without presenting personal experience as universal fact.", status: "not-started" },
    { id: "contribution", title: "Community contribution", description: "Demonstrate useful, constructive contribution before applying for mentor status.", status: "not-started" },
  ],
};
