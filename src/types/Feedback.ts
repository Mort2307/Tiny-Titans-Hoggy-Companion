export type FeedbackCategory = "bug" | "suggestion" | "confusing" | "general" | "other";
export type FeedbackSeverity = "minor" | "annoying" | "blocked" | "broken";

export interface FeedbackReport {
  id: string;
  issueToken: string;
  issueFingerprint: string;
  userId: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  whatWereYouDoing: string;
  expected: string;
  actual: string;
  appVersion?: string;
  deviceHint?: string;
  createdAt: string;
  status: "open" | "investigating" | "resolved" | "cleared";
  attachment?: {
    path: string;
    type: "image" | "video";
    sizeBytes: number;
  };
  mediaClearedAt?: string;
}
