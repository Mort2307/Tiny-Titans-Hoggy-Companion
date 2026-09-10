import type { FeedingRecord } from "../types/Feeding";

export function feedingDateValue(value?: string): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function latestFeedingAttempt(records?: FeedingRecord[]): FeedingRecord | undefined {
  return records?.slice().sort((a, b) => feedingDateValue(b.date) - feedingDateValue(a.date))[0];
}

/** A successful feed is an explicitly Accepted feeding record. */
export function latestSuccessfulFeed(records?: FeedingRecord[]): FeedingRecord | undefined {
  return records?.filter((record) => record.response === "Accepted").slice().sort((a, b) => feedingDateValue(b.date) - feedingDateValue(a.date))[0];
}

export function daysSinceFeeding(value?: string): number | null {
  if (!value) return null;
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const recordStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.max(0, Math.floor((todayStart - recordStart) / 86400000));
}

export function formatDaysSinceFeeding(value?: string): string {
  const days = daysSinceFeeding(value);
  if (days === null) return "Not recorded";
  return String(days) + " " + (days === 1 ? "Day" : "Days");
}
