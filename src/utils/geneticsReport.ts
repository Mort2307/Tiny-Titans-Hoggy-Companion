// ============================================================
// TINY TITANS — GENETICS ISSUE REPORTING
// ============================================================
//
// Central reporting utility.
//
// UI components should NOT decide how reports are stored.
// This utility gives us one consistent reporting pipeline.
//
// Current stage:
// • Local storage fallback
//
// Future stage:
// • Firebase / Firestore
// • User authentication
// • Admin review
// • Community verification
// • Issue status tracking
//
// ============================================================

import type { GeneticsIssueType } from "../types/genetics";

// ============================================================
// CONSTANTS
// ============================================================

export const GENETICS_REPORT_STORAGE_KEY =
  "tinyTitansGeneticsIssueReports";

// ============================================================
// TYPES
// ============================================================

export type GeneticsIssueReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "rejected";

export type GeneticsIssueReport = {
  id: string;

  context: string;

  issueType: GeneticsIssueType;

  message: string;

  createdAt: string;

  status: GeneticsIssueReportStatus;
};

// ============================================================
// ID GENERATION
// ============================================================

function generateReportId(): string {
  return `genetics-report-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

// ============================================================
// READ REPORTS
// ============================================================

export function getGeneticsIssueReports(): GeneticsIssueReport[] {
  try {
    const stored =
      localStorage.getItem(
        GENETICS_REPORT_STORAGE_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      isGeneticsIssueReport
    );
  } catch (error) {
    console.error(
      "Tiny Titans: failed to read genetics issue reports.",
      error
    );

    return [];
  }
}

// ============================================================
// VALIDATION
// ============================================================

function isGeneticsIssueReport(
  value: unknown
): value is GeneticsIssueReport {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const report =
    value as Partial<GeneticsIssueReport>;

  return (
    typeof report.id === "string" &&
    typeof report.context === "string" &&
    typeof report.issueType === "string" &&
    typeof report.message === "string" &&
    typeof report.createdAt === "string" &&
    (
      report.status === "pending" ||
      report.status === "reviewing" ||
      report.status === "resolved" ||
      report.status === "rejected"
    )
  );
}

// ============================================================
// CREATE REPORT
// ============================================================

export function createGeneticsIssueReport(
  input: Omit<
    GeneticsIssueReport,
    "id" | "createdAt" | "status"
  >
): GeneticsIssueReport {
  return {
    id: generateReportId(),

    context:
      input.context.trim(),

    issueType:
      input.issueType,

    message:
      input.message.trim(),

    createdAt:
      new Date().toISOString(),

    status:
      "pending",
  };
}

// ============================================================
// SAVE REPORT
// ============================================================

export function saveGeneticsIssueReport(
  report: GeneticsIssueReport
): boolean {
  try {
    const reports =
      getGeneticsIssueReports();

    reports.push(report);

    localStorage.setItem(
      GENETICS_REPORT_STORAGE_KEY,
      JSON.stringify(reports)
    );

    return true;
  } catch (error) {
    console.error(
      "Tiny Titans: failed to save genetics issue report.",
      error
    );

    return false;
  }
}

// ============================================================
// CREATE + SAVE
// ============================================================

export function submitGeneticsIssueReport(
  input: Omit<
    GeneticsIssueReport,
    "id" | "createdAt" | "status"
  >
): GeneticsIssueReport | undefined {
  const report =
    createGeneticsIssueReport(
      input
    );

  const saved =
    saveGeneticsIssueReport(
      report
    );

  if (!saved) {
    return undefined;
  }

  return report;
}

// ============================================================
// UPDATE REPORT STATUS
// ============================================================

export function updateGeneticsIssueReportStatus(
  reportId: string,
  status: GeneticsIssueReportStatus
): boolean {
  try {
    const reports =
      getGeneticsIssueReports();

    const index =
      reports.findIndex(
        (report) =>
          report.id === reportId
      );

    if (index === -1) {
      return false;
    }

    reports[index] = {
      ...reports[index],
      status,
    };

    localStorage.setItem(
      GENETICS_REPORT_STORAGE_KEY,
      JSON.stringify(reports)
    );

    return true;
  } catch (error) {
    console.error(
      "Tiny Titans: failed to update genetics issue report.",
      error
    );

    return false;
  }
}

// ============================================================
// DELETE REPORT
// ============================================================
//
// Development/admin helper only.
//
// This can later be removed from the public build
// when Firebase moderation is implemented.
// ============================================================

export function deleteGeneticsIssueReport(
  reportId: string
): boolean {
  try {
    const reports =
      getGeneticsIssueReports();

    const filtered =
      reports.filter(
        (report) =>
          report.id !== reportId
      );

    if (
      filtered.length ===
      reports.length
    ) {
      return false;
    }

    localStorage.setItem(
      GENETICS_REPORT_STORAGE_KEY,
      JSON.stringify(filtered)
    );

    return true;
  } catch (error) {
    console.error(
      "Tiny Titans: failed to delete genetics issue report.",
      error
    );

    return false;
  }
}

// ============================================================
// CLEAR ALL REPORTS
// ============================================================
//
// Development helper.
// ============================================================

export function clearGeneticsIssueReports(): void {
  localStorage.removeItem(
    GENETICS_REPORT_STORAGE_KEY
  );
}

// ============================================================
// REPORT COUNT
// ============================================================

export function getGeneticsIssueReportCount(): number {
  return getGeneticsIssueReports().length;
}

// ============================================================
// PENDING REPORT COUNT
// ============================================================

export function getPendingGeneticsIssueReportCount(): number {
  return getGeneticsIssueReports().filter(
    (report) =>
      report.status === "pending"
  ).length;
}