// ============================================================
// TINY TITANS — REPORT ISSUE SERVICE
// ============================================================
//
// Central service for creating and storing issue reports.
//
// Current implementation:
// • localStorage
//
// Future implementation:
// • Firebase / Firestore
// • authenticated user ID
// • admin moderation
// • report status updates
//
// UI components should call this service rather than
// writing reports directly to storage.
// ============================================================

import type {
  ReportIssue,
  ReportIssueCategory,
  ReportIssuePriority,
  ReportIssueSource,
} from "../types/reportIssue";

// ============================================================
// STORAGE
// ============================================================

const REPORT_STORAGE_KEY =
  "tinyTitansReportIssues";

// ============================================================
// INPUT TYPE
// ============================================================

export type CreateReportIssueInput = {
  category: ReportIssueCategory;

  priority?: ReportIssuePriority;

  source: ReportIssueSource;

  title: string;

  description: string;

  context?: string;

  userId?: string;

  appVersion?: string;

  metadata?: Record<string, unknown>;
};

// ============================================================
// ID
// ============================================================

function generateReportId(): string {
  return [
    "report",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 9),
  ].join("-");
}

// ============================================================
// READ
// ============================================================

export function getReportIssues(): ReportIssue[] {
  try {
    const stored =
      localStorage.getItem(
        REPORT_STORAGE_KEY
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
      isReportIssue
    );
  } catch (error) {
    console.error(
      "Tiny Titans: unable to read issue reports.",
      error
    );

    return [];
  }
}

// ============================================================
// VALIDATION
// ============================================================

function isReportIssue(
  value: unknown
): value is ReportIssue {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const report =
    value as Partial<ReportIssue>;

  return (
    typeof report.id === "string" &&
    typeof report.category === "string" &&
    typeof report.priority === "string" &&
    typeof report.status === "string" &&
    typeof report.source === "string" &&
    typeof report.title === "string" &&
    typeof report.description === "string" &&
    typeof report.createdAt === "string" &&
    typeof report.updatedAt === "string"
  );
}

// ============================================================
// CREATE
// ============================================================

export function createReportIssue(
  input: CreateReportIssueInput
): ReportIssue {
  const now =
    new Date().toISOString();

  return {
    id: generateReportId(),

    category:
      input.category,

    priority:
      input.priority ??
      "Normal",

    status:
      "Pending",

    source:
      input.source,

    title:
      input.title.trim(),

    description:
      input.description.trim(),

    context:
      input.context?.trim(),

    createdAt:
      now,

    updatedAt:
      now,

    userId:
      input.userId,

    appVersion:
      input.appVersion,

    metadata:
      input.metadata,
  };
}

// ============================================================
// SAVE
// ============================================================

export function saveReportIssue(
  report: ReportIssue
): boolean {
  try {
    const reports =
      getReportIssues();

    reports.push(report);

    localStorage.setItem(
      REPORT_STORAGE_KEY,
      JSON.stringify(reports)
    );

    return true;
  } catch (error) {
    console.error(
      "Tiny Titans: unable to save issue report.",
      error
    );

    return false;
  }
}

// ============================================================
// SUBMIT
// ============================================================

export function submitReportIssue(
  input: CreateReportIssueInput
): ReportIssue | undefined {
  const report =
    createReportIssue(input);

  const saved =
    saveReportIssue(report);

  if (!saved) {
    return undefined;
  }

  return report;
}

// ============================================================
// UPDATE
// ============================================================

export function updateReportIssue(
  reportId: string,
  updates: Partial<
    Pick<
      ReportIssue,
      | "category"
      | "priority"
      | "status"
      | "title"
      | "description"
      | "context"
      | "metadata"
    >
  >
): boolean {
  try {
    const reports =
      getReportIssues();

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

      ...updates,

      updatedAt:
        new Date().toISOString(),
    };

    localStorage.setItem(
      REPORT_STORAGE_KEY,
      JSON.stringify(reports)
    );

    return true;
  } catch (error) {
    console.error(
      "Tiny Titans: unable to update issue report.",
      error
    );

    return false;
  }
}

// ============================================================
// DELETE
// ============================================================

export function deleteReportIssue(
  reportId: string
): boolean {
  try {
    const reports =
      getReportIssues();

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
      REPORT_STORAGE_KEY,
      JSON.stringify(filtered)
    );

    return true;
  } catch (error) {
    console.error(
      "Tiny Titans: unable to delete issue report.",
      error
    );

    return false;
  }
}

// ============================================================
// COUNTS
// ============================================================

export function getReportIssueCount(): number {
  return getReportIssues().length;
}

export function getPendingReportIssueCount(): number {
  return getReportIssues().filter(
    (report) =>
      report.status === "Pending"
  ).length;
}

// ============================================================
// FILTERS
// ============================================================

export function getReportIssuesByStatus(
  status: ReportIssue["status"]
): ReportIssue[] {
  return getReportIssues().filter(
    (report) =>
      report.status === status
  );
}

export function getReportIssuesByCategory(
  category: ReportIssue["category"]
): ReportIssue[] {
  return getReportIssues().filter(
    (report) =>
      report.category === category
  );
}

export function getReportIssuesBySource(
  source: ReportIssue["source"]
): ReportIssue[] {
  return getReportIssues().filter(
    (report) =>
      report.source === source
  );
}

// ============================================================
// DEVELOPMENT RESET
// ============================================================

export function clearAllReportIssues(): void {
  localStorage.removeItem(
    REPORT_STORAGE_KEY
  );
}