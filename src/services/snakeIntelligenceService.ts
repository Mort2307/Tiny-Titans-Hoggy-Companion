import type { SnakeMasterRecord, DataConfidence } from "./snakeMasterRecord";
import { getSnakeMasterRecord } from "./snakeMasterRecord";

export type IntelligenceTone = "positive" | "neutral" | "attention";
export type IntelligenceConfidence = "High" | "Moderate" | "Low" | "Insufficient";

export type SnakeInsight = {
  id: string;
  title: string;
  value: string;
  why: string;
  action: string;
  tone: IntelligenceTone;
  confidence: IntelligenceConfidence;
  category: "weight" | "feeding" | "shedding" | "data" | "activity";
};

export type IntelligenceMetric = {
  key: "weight" | "feeding" | "shedding";
  label: string;
  percent: number;
  records: number;
  recordsForFullCoverage: number;
};

export type SnakeIntelligence = {
  snakeId: string;
  snakeName: string;
  /** Overall reliability of the engine's current interpretation. This is never a keeper rating or health score. */
  confidence: DataConfidence;
  /** Percentage of the core personal-history dataset currently available to the engine. */
  dataCoveragePercent: number;
  /** Transparent breakdown behind dataCoveragePercent. */
  coverageMetrics: IntelligenceMetric[];
  /** User-facing definition that can be shown beside the confidence value. */
  confidenceExplanation: string;
  insights: SnakeInsight[];
  priority: SnakeInsight | null;
  summary: string;
  generatedAt: string;
};

function confidenceRank(value: IntelligenceConfidence): number {
  return value === "High" ? 4 : value === "Moderate" ? 3 : value === "Low" ? 2 : 1;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = average(values);
  if (mean === null || mean === 0) return null;
  const variance = average(values.map((value) => (value - mean) ** 2));
  return variance === null ? null : Math.sqrt(variance) / Math.abs(mean);
}

function dateSpanDays(dates: string[]): number {
  const valid = dates.map((date) => new Date(`${date}T00:00:00`).getTime()).filter(Number.isFinite);
  if (valid.length < 2) return 0;
  return Math.round((Math.max(...valid) - Math.min(...valid)) / 86_400_000);
}

function feedingIntervals(record: SnakeMasterRecord): number[] {
  const dates = [...record.feedings].map((item) => item.date).filter(Boolean).sort();
  return dates.slice(1).map((date, index) => {
    const current = new Date(`${date}T00:00:00`).getTime();
    const previous = new Date(`${dates[index]}T00:00:00`).getTime();
    return Math.round((current - previous) / 86_400_000);
  }).filter((gap) => Number.isFinite(gap) && gap >= 0);
}

function shedIntervals(record: SnakeMasterRecord): number[] {
  const dates = [...record.sheds].map((item) => item.date).filter(Boolean).sort();
  return dates.slice(1).map((date, index) => {
    const current = new Date(`${date}T00:00:00`).getTime();
    const previous = new Date(`${dates[index]}T00:00:00`).getTime();
    return Math.round((current - previous) / 86_400_000);
  }).filter((gap) => Number.isFinite(gap) && gap >= 0);
}

function buildCoverageMetrics(record: SnakeMasterRecord): IntelligenceMetric[] {
  const definitions: Array<[IntelligenceMetric["key"], string, number, number]> = [
    ["weight", "Weight", record.weights.length, 5],
    ["feeding", "Feeding", record.feedings.length, 8],
    ["shedding", "Shedding", record.sheds.length, 5],
  ];

  return definitions.map(([key, label, records, recordsForFullCoverage]) => ({
    key,
    label,
    records,
    recordsForFullCoverage,
    percent: Math.round(Math.min(records / recordsForFullCoverage, 1) * 100),
  }));
}

/**
 * Coverage measures how much useful individual-history data exists.
 * Confidence is deliberately different: it measures how trustworthy the
 * resulting pattern is based on amount, spread, recency and consistency.
 */
function calculateDataCoverage(metrics: IntelligenceMetric[]): number {
  return Math.round(metrics.reduce((sum, metric) => sum + metric.percent, 0) / metrics.length);
}

function confidenceFromScore(score: number): DataConfidence {
  if (score >= 78) return "High";
  if (score >= 52) return "Moderate";
  if (score >= 25) return "Low";
  return "Insufficient";
}