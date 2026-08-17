import {
  canonicaliseReportIssueStatus,
  type CanonicalReportIssueStatus,
  type ReportIssueStatus,
} from "../types/reportIssue";

/**
 * Canonical bug-report lifecycle for Creator/Test workflows.
 *
 * Historical Firestore statuses are accepted and normalised first. This lets
 * the UI migrate progressively without rewriting existing documents.
 */
export const REPORT_LIFECYCLE: Record<CanonicalReportIssueStatus, readonly CanonicalReportIssueStatus[]> = {
  Draft: ["Submitted"],
  Submitted: ["Under Review", "Rejected", "Duplicate", "Won't Fix"],
  "Under Review": ["Confirmed", "Rejected", "Duplicate", "Won't Fix"],
  Confirmed: ["In Progress", "Rejected", "Duplicate", "Won't Fix"],
  "In Progress": ["Resolved", "Rejected", "Duplicate", "Won't Fix"],
  Resolved: ["Verified", "In Progress"],
  Verified: ["In Progress"],
  Rejected: [],
  Duplicate: [],
  "Won't Fix": [],
};

export function getCanonicalReportStatus(
  status: ReportIssueStatus | CanonicalReportIssueStatus,
): CanonicalReportIssueStatus {
  return canonicaliseReportIssueStatus(status);
}

export function canTransitionReport(
  from: ReportIssueStatus | CanonicalReportIssueStatus,
  to: CanonicalReportIssueStatus,
): boolean {
  const current = getCanonicalReportStatus(from);
  return current === to || REPORT_LIFECYCLE[current].includes(to);
}

export function getAllowedReportTransitions(
  status: ReportIssueStatus | CanonicalReportIssueStatus,
): readonly CanonicalReportIssueStatus[] {
  return REPORT_LIFECYCLE[getCanonicalReportStatus(status)];
}

export function isTerminalReportStatus(
  status: ReportIssueStatus | CanonicalReportIssueStatus,
): boolean {
  const current = getCanonicalReportStatus(status);
  return REPORT_LIFECYCLE[current].length === 0;
}

/**
 * Returns a safe user-facing lifecycle label while retaining legacy values in
 * Firestore until the migration is explicitly completed.
 */
export function getReportLifecycleLabel(
  status: ReportIssueStatus | CanonicalReportIssueStatus,
): string {
  return getCanonicalReportStatus(status);
}
