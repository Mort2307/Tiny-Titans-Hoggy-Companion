import type { Snake } from "../types/Snake";
import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";
import { buildIntelligenceSummary, type IntelligenceSummary } from "./intelligenceSummaryService";
import { buildKeeperContextInsights } from "./intelligenceKeeperContextService";

export type IntelligenceEvidence = {
  generatedAt: string;
  summary: IntelligenceSummary;
  evidence: { label: string; value: string }[];
  limitations: string[];
};

export function buildIntelligenceEvidence(snake: Snake, benchmark: CommunityBenchmarkDataset | null): IntelligenceEvidence {
  const summary = buildIntelligenceSummary(snake, benchmark);
  const context = buildKeeperContextInsights(snake);
  const evidence = [
    { label: "Personal records", value: `${summary.comparisons.reduce((total, item) => total + (item.personalValue !== undefined ? 1 : 0), 0)} measurable personal values` },
    { label: "Comparable community data", value: benchmark ? `${benchmark.metrics.reduce((total, metric) => total + metric.sampleSize, 0)} metric observations across the selected cohort` : "Not available" },
    { label: "Community confidence", value: summary.confidence },
    { label: "Timeline context", value: `${context.reduce((total, item) => total + item.nearbyEvents.length, 0)} nearby recorded events surfaced` },
  ];
  const limitations = [
    "Community comparisons are observational and depend on the quality and size of the available consent-eligible dataset.",
    "A pattern difference does not establish a cause, diagnosis, or health problem.",
    "Missing, inaccurate, or incomplete keeper records can reduce the usefulness of the intelligence.",
    "Tiny Titans should not replace veterinary assessment when a keeper has a health concern.",
  ];
  return { generatedAt: new Date().toISOString(), summary, evidence, limitations };
}
