export type FeedbackCategory = "Idea" | "Suggestion" | "Usability" | "Learning" | "Genetics" | "Community" | "Other";

export type Feedback = {
  id: string;
  userId: string;
  category: FeedbackCategory;
  title: string;
  message: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  appVersion?: string;
  metadata?: Record<string, unknown>;
};
