export type ReportIssueCategory =
  | "Genetics"
  | "Morph Database"
  | "Calculator"
  | "Breeding Planner"
  | "Husbandry"
  | "App Bug"
  | "Other";

export type ReportIssuePriority = "Low" | "Normal" | "High" | "Critical";

/** Canonical lifecycle targeted by the bug-report migration. */
export type CanonicalReportIssueStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Confirmed"
  | "In Progress"
  | "Resolved"
  | "Verified"
  | "Rejected"
  | "Duplicate"
  | "Won't Fix";

/** Existing persisted statuses retained for backwards-compatible reads during migration. */
export type ReportIssueStatus = "Pending" | "Reviewing" | "Fixing" | "Testing" | "Resolved" | "Rejected" | "Cleared";

export type ReportIssueSource = "Genetics Calculator" | "Morph Library" | "Breeding Planner" | "Snake Profile" | "Knowledge Base" | "Other";

/** True only when a report has explicitly entered the confirmed lifecycle. */
export function isConfirmedBugReportStatus(status: ReportIssueStatus | CanonicalReportIssueStatus): boolean {
  return status === "Confirmed" || status === "In Progress" || status === "Resolved" || status === "Verified" || status === "Fixing" || status === "Testing";
}

/** Convert historical status values to the canonical lifecycle without mutating persisted data. */
export function canonicaliseReportIssueStatus(status: ReportIssueStatus | CanonicalReportIssueStatus): CanonicalReportIssueStatus {
  switch (status) {
    case "Pending": return "Submitted";
    case "Reviewing": return "Under Review";
    case "Fixing": return "In Progress";
    case "Testing": return "Verified";
    case "Cleared": return "Won't Fix";
    default: return status;
  }
}

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
  /** Creator-only queue flag. Archived reports remain in Firestore but are hidden from the active queue. */
  archived?: boolean;
};
