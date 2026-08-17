export type ReportIssueCategory =
  | "Genetics"
  | "Morph Database"
  | "Calculator"
  | "Breeding Planner"
  | "Husbandry"
  | "App Bug"
  | "Other";

export type ReportIssuePriority = "Low" | "Normal" | "High" | "Critical";

/**
 * Canonical bug-report lifecycle.
 *
 * The legacy values remain accepted temporarily so existing Firestore reports
 * and historical UI states can be read safely during migration.
 */
export type ReportIssueStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Confirmed"
  | "In Progress"
  | "Resolved"
  | "Verified"
  | "Rejected"
  | "Duplicate"
  | "Won't Fix"
  | "Pending" // legacy: maps to Submitted
  | "Reviewing" // legacy: maps to Under Review
  | "Fixing" // legacy: maps to Confirmed/In Progress
  | "Testing" // legacy: maps to Verified
  | "Cleared"; // legacy terminal state

export type ReportIssueSource = "Genetics Calculator" | "Morph Library" | "Breeding Planner" | "Snake Profile" | "Knowledge Base" | "Other";

/** True only when a report has explicitly entered the confirmed lifecycle. */
export function isConfirmedBugReportStatus(status: ReportIssueStatus): boolean {
  return status === "Confirmed" || status === "In Progress" || status === "Resolved" || status === "Verified" || status === "Fixing" || status === "Testing";
}

/** Convert historical status values to the canonical lifecycle for display/logic. */
export function canonicaliseReportIssueStatus(status: ReportIssueStatus): Exclude<ReportIssueStatus, "Pending" | "Reviewing" | "Fixing" | "Testing" | "Cleared"> {
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
};
