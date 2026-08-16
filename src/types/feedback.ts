export type FeedbackCategory = "Idea" | "Suggestion" | "Usability" | "Learning" | "Genetics" | "Community" | "Other";

export type FeedbackStatus = "New" | "Reviewing" | "Planned" | "In Development" | "Implemented" | "Declined" | "Duplicate";

export type Feedback = {
  id: string;
  userId: string;
  category: FeedbackCategory;
  title: string;
  message: string;
  status?: FeedbackStatus;
  creatorNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  appVersion?: string;
  metadata?: Record<string, unknown>;
};
