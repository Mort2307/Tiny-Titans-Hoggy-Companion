import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";
import type { DataQualityReport } from "./intelligenceDataQualityService";
import type { Snake } from "../types/Snake";

export type IntelligenceConfidenceLevel = "high" | "good" | "developing" | "limited";
export type IntelligenceConfidence = { level: IntelligenceConfidenceLevel; score: number; label: string; reasons: string[]; factors: { key: string; label: string; score: number; detail: string }[] };

function clamp(value: number) { return Math.max(0, Math.min(100, value)); }

export function buildIntelligenceConfidence(snake: Snake, quality: DataQualityReport | null, benchmark: CommunityBenchmarkDataset | null): IntelligenceConfidence {
  const factors: IntelligenceConfidence["factors"] = [];
  const recordCount = (snake.weightHistory?.length ?? 0) + (snake.feedingHistory?.length ?? 0) + (snake.shedHistory?.length ?? 0);
  const recordScore = clamp(recordCount * 3);
  factors.push({ key: "records", label: "Personal history depth", score: recordScore, detail: `${recordCount} weight, feeding and shed records available.` });
  const qualityScore = quality?.score ?? 0;
  factors.push({ key: "quality", label: "Data quality", score: qualityScore, detail: quality ? `${quality.label} record quality.` : "Data quality report unavailable." });
  const metrics = benchmark?.metrics ?? [];
  const observations = metrics.reduce((sum, metric) => sum + metric.sampleSize, 0);
  const benchmarkScore = observations >= 100 ? 100 : observations >= 40 ? 80 : observations >= 15 ? 60 : observations > 0 ? 35 : 0;
  factors.push({ key: "community", label: "Community evidence", score: benchmarkScore, detail: benchmark ? `${observations} comparable metric observations.` : "No comparable community dataset available." });
  const confidenceScores = metrics.map((metric) => metric.confidence).filter(Boolean);
  const cohortScore = confidenceScores.includes("strong") ? 100 : confidenceScores.includes("developing") ? 70 : confidenceScores.includes("limited") ? 40 : 0;
  factors.push({ key: "cohort", label: "Cohort confidence", score: cohortScore, detail: confidenceScores.length ? `${confidenceScores.join(", ")} confidence signals are present.` : "No cohort confidence signal available." });
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.score, 0) / factors.length);
  const level: IntelligenceConfidenceLevel = score >= 80 ? "high" : score >= 65 ? "good" : score >= 40 ? "developing" : "limited";
  const label = level === "high" ? "High confidence" : level === "good" ? "Good confidence" : level === "developing" ? "Developing confidence" : "Limited confidence";
  const reasons = factors.filter((factor) => factor.score < 60).map((factor) => `${factor.label}: ${factor.detail}`);
  return { level, score, label, reasons, factors };
}
