import type { Snake } from "../types/Snake";
import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";
import { buildIntelligenceSummary, type IntelligenceSummary } from "./intelligenceSummaryService";
import { buildIntelligenceTimeline, type IntelligenceTimelineMetric } from "./intelligenceTimelineService";
import { detectIntelligenceAnomalies } from "./intelligenceAnomalyService";

export type IntelligenceSnapshot = {
  generatedAt: string;
  confidenceScore: number;
  confidenceLevel: IntelligenceSummary["confidenceLevel"];
  headline: string;
  metrics: Pick<IntelligenceTimelineMetric, "key" | "trend" | "current" | "change" | "records">[];
  anomalyKeys: string[];
};

export type IntelligenceMemoryDelta = {
  confidenceChange: number;
  confidenceDirection: "increased" | "decreased" | "unchanged";
  changedMetrics: { key: string; label: string; from: string; to: string }[];
  newAnomalies: string[];
  narrative: string;
};

export function buildIntelligenceSnapshot(snake: Snake, benchmark: CommunityBenchmarkDataset | null, generatedAt = new Date().toISOString()): IntelligenceSnapshot {
  const summary = buildIntelligenceSummary(snake, benchmark);
  const metrics = buildIntelligenceTimeline(snake).map(({ key, trend, current, change, records }) => ({ key, trend, current, change, records }));
  const anomalies = detectIntelligenceAnomalies(snake);
  return { generatedAt, confidenceScore: summary.confidenceScore, confidenceLevel: summary.confidenceLevel, headline: summary.headline, metrics, anomalyKeys: anomalies.map((anomaly) => anomaly.key) };
}

function displayTrend(value: IntelligenceTimelineMetric["trend"]): string {
  return value === "improving" ? "positive change" : value === "stable" ? "stable" : value === "changing" ? "changing" : "still building";
}

export function compareIntelligenceSnapshots(previous: IntelligenceSnapshot | null, current: IntelligenceSnapshot): IntelligenceMemoryDelta {
  if (!previous) return { confidenceChange: current.confidenceScore, confidenceDirection: "increased", changedMetrics: [], newAnomalies: current.anomalyKeys, narrative: "This is the first saved intelligence snapshot. Future assessments can show how Tiny Titans' understanding changes over time." };
  const confidenceChange = current.confidenceScore - previous.confidenceScore;
  const confidenceDirection = confidenceChange > 0 ? "increased" : confidenceChange < 0 ? "decreased" : "unchanged";
  const changedMetrics: IntelligenceMemoryDelta["changedMetrics"] = [];
  for (const metric of current.metrics) {
    const old = previous.metrics.find((item) => item.key === metric.key);
    if (!old) continue;
    const oldTrend = displayTrend(old.trend); const newTrend = displayTrend(metric.trend);
    if (oldTrend !== newTrend) changedMetrics.push({ key: metric.key, label: metric.key === "weight" ? "Weight" : metric.key === "feeding" ? "Feeding interval" : "Shed interval", from: oldTrend, to: newTrend });
  }
  const newAnomalies = current.anomalyKeys.filter((key) => !previous.anomalyKeys.includes(key));
  const narrative = changedMetrics.length ? `${changedMetrics.length} personal pattern${changedMetrics.length === 1 ? " has" : "s have"} changed since the previous assessment.` : confidenceChange ? `Evidence strength has ${confidenceDirection} by ${Math.abs(confidenceChange)} points since the previous assessment.` : "No material change was detected in the current intelligence assessment.";
  return { confidenceChange, confidenceDirection, changedMetrics, newAnomalies, narrative };
}
