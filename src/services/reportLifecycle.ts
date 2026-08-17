import {
  canonicaliseReportIssueStatus,
  type CanonicalReportIssueStatus,
  type ReportIssueStatus,
} from "../types/reportIssue";

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

export function getCanonicalReportStatus(status: ReportIssueStatus | CanonicalReportIssueStatus): CanonicalReportIssueStatus {
  return canonicaliseReportIssueStatus(status);
}

/** Backwards-compatible alias for existing Creator queue consumers. */
export const getCanonicalReportIssueStatus = getCanonicalReportStatus;

export function canTransitionReport(from: ReportIssueStatus | CanonicalReportIssueStatus, to: CanonicalReportIssueStatus): boolean {
  const current = getCanonicalReportStatus(from);
  return current === to || REPORT_LIFECYCLE[current].includes(to);
}

export function getAllowedReportTransitions(status: ReportIssueStatus | CanonicalReportIssueStatus): readonly CanonicalReportIssueStatus[] {
  return REPORT_LIFECYCLE[getCanonicalReportStatus(status)];
}

export function isTerminalReportStatus(status: ReportIssueStatus | CanonicalReportIssueStatus): boolean {
  const current = getCanonicalReportStatus(status);
  return REPORT_LIFECYCLE[current].length === 0;
}

/** True while a report remains in a non-terminal workflow state. */
export function isActiveReportIssueStatus(status: ReportIssueStatus | CanonicalReportIssueStatus): boolean {
  return !isTerminalReportStatus(status);
}

export function getReportLifecycleLabel(status: ReportIssueStatus | CanonicalReportIssueStatus): string {
  return getCanonicalReportStatus(status);
}