import type { Snake } from "../types/Snake";

export type DataQualitySeverity = "info" | "watch" | "action";
export type DataQualityIssue = { key: string; severity: DataQualitySeverity; title: string; detail: string };
export type DataQualityReport = { score: number; label: "Strong" | "Good" | "Developing" | "Needs attention"; issues: DataQualityIssue[]; checkedRecords: number };
/** Backwards-compatible name used by the intelligence UI. */
export type IntelligenceDataQualityReport = DataQualityReport;

function parsed(value: unknown): number | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : undefined;
}

function checkDates(result: DataQualityIssue[], history: unknown, label: string, dateKey = "date") {
  if (!Array.isArray(history)) return;
  const dates = history.map((entry) => entry && typeof entry === "object" ? parsed((entry as Record<string, unknown>)[dateKey]) : undefined);
  const invalid = dates.filter((date) => date === undefined).length;
  if (invalid) result.push({ key: `${label}-invalid-date`, severity: "action", title: `${label} records need date checking`, detail: `${invalid} record${invalid === 1 ? "" : "s"} has no valid ${dateKey}.` });
  const valid = dates.filter((date): date is number => date !== undefined);
  const duplicateDates = valid.length - new Set(valid.map((date) => new Date(date).toISOString().slice(0, 10))).size;
  if (duplicateDates) result.push({ key: `${label}-duplicate-date`, severity: "watch", title: `${label} contains duplicate dates`, detail: `${duplicateDates} additional record${duplicateDates === 1 ? "" : "s"} share a calendar date with another record. Review them rather than assuming they are duplicates.` });
}

export function buildIntelligenceDataQuality(snake: Snake): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const weights = snake.weightHistory ?? [];
  const feedings = snake.feedingHistory ?? [];
  const sheds = snake.shedHistory ?? [];
  const health = snake.healthHistory ?? [];
  const timeline = snake.timeline ?? [];
  checkDates(issues, weights, "Weight"); checkDates(issues, feedings, "Feeding"); checkDates(issues, sheds, "Shed"); checkDates(issues, health, "Health"); checkDates(issues, timeline, "Timeline");

  const invalidWeights = weights.filter((record) => !Number.isFinite(Number(record.weight)) || Number(record.weight) <= 0).length;
  if (invalidWeights) issues.push({ key: "weight-invalid-value", severity: "action", title: "Weight records need checking", detail: `${invalidWeights} weight record${invalidWeights === 1 ? "" : "s"} has a non-positive or invalid weight.` });

  const sortedWeights = weights.map((record) => ({ date: parsed(record.date), weight: Number(record.weight) })).filter((record) => record.date !== undefined && Number.isFinite(record.weight) && record.weight > 0).sort((a, b) => a.date! - b.date!);
  for (let i = 1; i < sortedWeights.length; i += 1) {
    const previous = sortedWeights[i - 1].weight; const current = sortedWeights[i].weight;
    if (previous > 0 && Math.abs(current - previous) / previous >= 0.35) {
      issues.push({ key: `weight-jump-${i}`, severity: "watch", title: "Large weight change detected", detail: `A recorded change of ${Math.abs(current - previous).toFixed(1)} g is unusually large relative to the previous record. Check the dates, units and entry before treating it as a real trend.` });
      break;
    }
  }

  const allDates = [snake.hatchDate, snake.arrivalDate].map(parsed).filter((value): value is number => value !== undefined);
  const earliestRecord = [...weights, ...feedings, ...sheds, ...health].map((record) => parsed((record as { date?: string }).date)).filter((value): value is number => value !== undefined).sort((a, b) => a - b)[0];
  if (earliestRecord !== undefined && allDates.some((date) => earliestRecord < date)) issues.push({ key: "record-before-snake", severity: "watch", title: "A record predates the snake's recorded history", detail: "One or more husbandry records occur before the recorded hatch or arrival date. This may be intentional, but it is worth checking." });

  if (!weights.length) issues.push({ key: "no-weight-history", severity: "info", title: "Weight history is empty", detail: "Add weight records before Tiny Titans can assess a personal weight trajectory." });
  if (feedings.length < 3) issues.push({ key: "feeding-low-sample", severity: "info", title: "Feeding history is still developing", detail: "At least three dated feeding records are needed before interval-change detection can become useful." });
  if (sheds.length < 3) issues.push({ key: "shed-low-sample", severity: "info", title: "Shed history is still developing", detail: "More dated shed records will make personal shed-pattern analysis more reliable." });

  const checkedRecords = weights.length + feedings.length + sheds.length + health.length + timeline.length;
  const deductions = issues.reduce((score, issue) => score + (issue.severity === "action" ? 20 : issue.severity === "watch" ? 10 : 0), 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));
  const label = score >= 90 ? "Strong" : score >= 75 ? "Good" : score >= 50 ? "Developing" : "Needs attention";
  return { score, label, issues, checkedRecords };
}
