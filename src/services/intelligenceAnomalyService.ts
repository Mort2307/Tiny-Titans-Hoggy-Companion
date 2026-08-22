import type { Snake } from "../types/Snake";
import { buildIntelligenceTimeline, type IntelligenceTimelineMetric } from "./intelligenceTimelineService";

export type IntelligenceAnomaly = {
  key: "weight" | "feeding" | "shed";
  severity: "notice" | "watch";
  title: string;
  observation: string;
  context: string;
  recordCount: number;
};

function intervalValues(history: unknown, keys: string[], maxDays: number): number[] {
  if (!Array.isArray(history)) return [];
  const timestamps = history.map((entry) => {
    if (!entry || typeof entry !== "object") return NaN;
    const record = entry as Record<string, unknown>;
    const raw = keys.map((key) => record[key]).find((value) => typeof value === "string" || value instanceof Date);
    return raw ? Date.parse(String(raw)) : NaN;
  }).filter(Number.isFinite).sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i += 1) {
    const days = (timestamps[i] - timestamps[i - 1]) / 86400000;
    if (days > 0 && days <= maxDays) intervals.push(days);
  }
  return intervals;
}

function addIntervalAnomaly(result: IntelligenceAnomaly[], metric: IntelligenceTimelineMetric, values: number[], key: "feeding" | "shed") {
  if (values.length < 3) return;
  const recent = values.slice(-3);
  const baseline = (recent[0] + recent[1]) / 2;
  const latest = recent[2];
  if (!baseline || Math.abs(latest - baseline) < Math.max(baseline * 0.3, 3)) return;
  const direction = latest > baseline ? "increased" : "shortened";
  result.push({ key, severity: "notice", title: `${metric.label} pattern change detected`, observation: `The latest recorded interval ${direction} compared with the previous two intervals.`, context: `Previous two intervals averaged ${baseline.toFixed(1)} days; the latest recorded interval is ${latest.toFixed(1)} days.`, recordCount: metric.records });
}

export function detectIntelligenceAnomalies(snake: Snake): IntelligenceAnomaly[] {
  const metrics = buildIntelligenceTimeline(snake);
  const result: IntelligenceAnomaly[] = [];
  const feeding = intervalValues(snake.feedingHistory, ["date", "feedingDate"], 120);
  const shed = intervalValues(snake.shedHistory, ["date", "shedDate"], 180);
  const feedingMetric = metrics.find((metric) => metric.key === "feeding");
  const shedMetric = metrics.find((metric) => metric.key === "shed");
  if (feedingMetric) addIntervalAnomaly(result, feedingMetric, feeding, "feeding");
  if (shedMetric) addIntervalAnomaly(result, shedMetric, shed, "shed");

  const weights = (snake.weightHistory ?? []).map((entry) => Number(entry.weight)).filter(Number.isFinite);
  if (weights.length >= 4) {
    const recent = weights.slice(-3);
    const baseline = recent.slice(0, 2).reduce((sum, value) => sum + value, 0) / 2;
    const latest = recent[2];
    if (baseline > 0 && Math.abs(latest - baseline) >= Math.max(baseline * 0.1, 5)) {
      result.push({ key: "weight", severity: "watch", title: "Weight pattern change detected", observation: latest > baseline ? "The latest recorded weight is notably above the previous two-record average." : "The latest recorded weight is notably below the previous two-record average.", context: `Previous two-record average: ${baseline.toFixed(1)} g; latest record: ${latest.toFixed(1)} g.`, recordCount: weights.length });
    }
  }
  return result;
}
