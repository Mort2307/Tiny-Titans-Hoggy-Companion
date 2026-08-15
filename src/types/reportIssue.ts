export type ReportIssueCategory =
  | "Genetics"
  | "Morph Database"
  | "Calculator"
  | "Breeding Planner"
  | "Husbandry"
  | "App Bug"
  | "Other";

export type ReportIssuePriority = "Low" | "Normal" | "High" | "Critical";
export type ReportIssueStatus = "Pending" | "Reviewing" | "Fixing" | "Testing" | "Resolved" | "Rejected" | "Cleared";
export type ReportIssueSource = "Genetics Calculator" | "Morph Library" | "Breeding Planner" | "Snake Profile" | "Knowledge Base" | "Other";

export type ReportIssue = {
  id: string;
  issueToken?: string;
  issueFingerprint?: string;
  category: ReportIssueCategory;
  priority: ReportIssuePriority;
  status: ReportIssueStatus;
  source: ReportIssueSource;
  title: string;
  description: string;
  context?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  appVersion?: string;
  metadata?: Record<string, unknown>;
  attachment?: { path: string; type: "image" | "video"; sizeBytes: number };
  resolution?: string;
  fixedVersion?: string;
  creatorMessage?: string;
  reviewedBy?: string;
  resolvedAt?: string;
};
