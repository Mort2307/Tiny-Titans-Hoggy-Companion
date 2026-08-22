import type { Snake } from "../types/Snake";

export type IntelligenceTrend = "improving" | "stable" | "changing" | "insufficient";
export type IntelligenceTimelineMetric = { key: "weight" | "feeding" | "shed"; label: string; trend: IntelligenceTrend; current?: number; previous?: number; unit: string; change?: number; records: number; explanation: string };

function dates(history: unknown, keys: string[]): number[] {
  if (!Array.isArray(history)) return [];
  return history.map((entry) => {
    if (!entry || typeof entry !== "object") return NaN;
    const record = entry as Record<string, unknown>;
    const value = keys.map((key) => record[key]).find((item) => typeof item === "string" || item instanceof Date);
    return value ? Date.parse(String(value)) : NaN;
  }).filter(Number.isFinite).sort((a, b) => a - b);
}

function intervals(history: unknown, keys: string[], maxDays: number): number[] {
  const values = dates(history, keys); const result: number[] = [];
  for (let i = 1; i < values.length; i += 1) { const days = (values[i] - values[i - 1]) / 86400000; if (days > 0 && days <= maxDays) result.push(days); }
  return result;
}

function intervalTrend(values: number[]): { trend: IntelligenceTrend; current?: number; previous?: number; change?: number } {
  if (values.length < 2) return { trend: "insufficient", current: values.at(-1) };
  const current = values.at(-1)!; const previous = values.at(-2)!; const change = current - previous; const tolerance = Math.max(previous * 0.15, 2);
  return { trend: Math.abs(change) <= tolerance ? "stable" : "changing", current, previous, change };
}

export function buildIntelligenceTimeline(snake: Snake): IntelligenceTimelineMetric[] {
  const weightValues = (snake.weightHistory ?? []).map((entry) => Number(entry.weight)).filter(Number.isFinite);
  const feedingIntervals = intervals(snake.feedingHistory, ["date", "feedingDate"], 120);
  const shedIntervals = intervals(snake.shedHistory, ["date", "shedDate"], 180);
  const weightCurrent = weightValues.at(-1); const weightPrevious = weightValues.at(-2);
  const weightChange = weightCurrent !== undefined && weightPrevious !== undefined ? weightCurrent - weightPrevious : undefined;
  const weightTrend: IntelligenceTrend = weightValues.length < 2 ? "insufficient" : Math.abs(weightChange ?? 0) < Math.max(Math.abs(weightPrevious ?? 0) * 0.03, 1) ? "stable" : weightChange! > 0 ? "improving" : "changing";
  const feeding = intervalTrend(feedingIntervals); const shed = intervalTrend(shedIntervals);
  return [
    { key: "weight", label: "Weight", trend: weightTrend, current: weightCurrent, previous: weightPrevious, unit: "g", change: weightChange, records: weightValues.length, explanation: weightValues.length < 2 ? "More weight records are needed to establish a personal trajectory." : weightTrend === "stable" ? "Recent weight records are relatively stable." : weightTrend === "improving" ? "Recent records show an upward weight trajectory." : "Recent records show a change in weight direction." },
    { key: "feeding", label: "Feeding interval", trend: feeding.trend, current: feeding.current, previous: feeding.previous, unit: "days", change: feeding.change, records: feedingIntervals.length + 1, explanation: feeding.trend === "insufficient" ? "More feeding records are needed to establish a personal interval trend." : feeding.trend === "stable" ? "Recent feeding intervals are relatively consistent." : "Recent feeding intervals have changed compared with the previous interval." },
    { key: "shed", label: "Shed interval", trend: shed.trend, current: shed.current, previous: shed.previous, unit: "days", change: shed.change, records: shedIntervals.length + 1, explanation: shed.trend === "insufficient" ? "More shed records are needed to establish a personal interval trend." : shed.trend === "stable" ? "Recent shed intervals are relatively consistent." : "Recent shed intervals have changed compared with the previous interval." },
  ];
}

export function timelineHeadline(metrics: IntelligenceTimelineMetric[]): string {
  const available = metrics.filter((metric) => metric.trend !== "insufficient");
  if (!available.length) return "Your personal intelligence timeline is still building";
  const changing = available.filter((metric) => metric.trend === "changing").length;
  const improving = available.filter((metric) => metric.trend === "improving").length;
  if (changing === 0 && improving === 0) return "Recent records look relatively stable";
  if (improving > 0 && changing === 0) return "Recent records show positive change in measurable areas";
  return "Recent records show some changes worth keeping an eye on";
}
