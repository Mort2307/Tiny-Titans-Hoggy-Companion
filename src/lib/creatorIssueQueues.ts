import type { FeedbackStatus } from "../types/feedback";
import type { ReportIssue } from "../types/reportIssue";

export type QueueTab = "bugs" | "feedback";
export type BugFilter = "active" | "archived" | "all";
export type FeedbackFilter = "all" | NonNullable<import("../types/feedback").Feedback["status"]>;

export const BUG_FEEDBACK_STATUSES: FeedbackStatus[] = [
  "New","Reviewing","Planned","In Development","Implemented","Declined","Duplicate",
];

export function displayCreatorQueueDate(value: unknown) {
  if (!value) return "Unknown date";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString("en-GB");
  }
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    return new Date(value.toMillis()).toLocaleString("en-GB");
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString("en-GB");
}

export function bugStatusLabel(status: ReportIssue["status"]) {
  return status === "Resolved" || status === "resolved" || status === "fixed"
    ? "Fixed & Confirmed"
    : status;
}
