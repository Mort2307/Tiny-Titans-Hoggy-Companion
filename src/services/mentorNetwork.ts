import type { MentorProfile, MentorVerification, MentorshipJourney } from "./mentorshipProfiles";

export type MentorApplicationStatus = "draft" | "submitted" | "under-review" | "approved" | "needs-more-evidence" | "declined" | "published";
export type MentorshipRequestStatus = "draft" | "sent" | "accepted" | "declined" | "cancelled";

export type MentorApplication = {
  id: string;
  applicantId: string;
  status: MentorApplicationStatus;
  requestedVerification: MentorVerification;
  specialities: string[];
  experienceSummary: string;
  breedingExperience?: string;
  evidenceNotes?: string;
  conductAccepted: boolean;
};

export type MentorshipRequest = {
  id: string;
  requesterId: string;
  mentorId: string;
  goal: string;
  message: string;
  requestedRecords: string[];
  status: MentorshipRequestStatus;
  createdAt: string;
};

export type MentorDirectoryEntry = MentorProfile & {
  acceptingNewMentees: boolean;
  responseTimeLabel?: string;
};

export function canRequestMentorship(mentor: MentorDirectoryEntry, goal: string): boolean {
  return mentor.availability !== "unavailable" && mentor.acceptingNewMentees && mentor.mentoringGoals.includes(goal);
}

export function getVerificationTrustNote(level: MentorVerification): string {
  switch (level) {
    case "veterinary": return "Professional veterinary status should be independently verified and does not mean every answer is veterinary advice.";
    case "educator": return "Educational contribution status reflects TTHC review of teaching contribution, not universal expertise.";
    case "breeder": return "Breeder Mentor reflects demonstrated breeding experience relevant to the areas listed on the profile.";
    case "verified": return "Verified Mentor reflects reviewed identity/experience information and community standards.";
    default: return "Community Mentor reflects contribution and participation; it is not a professional qualification.";
  }
}

export function createMentorshipJourney(goal: string, requesterId: string, mentorId?: string): MentorshipJourney {
  return {
    id: crypto.randomUUID(),
    goal,
    mentorId,
    status: mentorId ? "requested" : "planning",
    milestones: [],
    sharedRecords: [],
  };
}
