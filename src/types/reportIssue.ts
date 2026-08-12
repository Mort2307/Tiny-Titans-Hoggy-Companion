// ============================================================
// TINY TITANS — REPORT ISSUE TYPES
// ============================================================

export type ReportIssueCategory =
  | "Genetics"
  | "Morph Database"
  | "Calculator"
  | "Breeding Planner"
  | "Husbandry"
  | "App Bug"
  | "Other";

export type ReportIssuePriority =
  | "Low"
  | "Normal"
  | "High"
  | "Critical";

export type ReportIssueStatus =
  | "Pending"
  | "Reviewing"
  | "Resolved"
  | "Rejected";

export type ReportIssueSource =
  | "Genetics Calculator"
  | "Morph Library"
  | "Breeding Planner"
  | "Snake Profile"
  | "Knowledge Base"
  | "Other";

export type ReportIssue = {
  id: string;

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

  metadata?: Record<
    string,
    unknown
  >;
};