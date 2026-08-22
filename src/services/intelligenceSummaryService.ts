import type { Snake } from "../types/Snake";
import type { CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";
import { buildPersonalBenchmarkComparisons, type PersonalBenchmarkComparison } from "./personalBenchmarkInsightService";
import { buildIntelligenceDataQuality, type DataQualityReport } from "./intelligenceDataQualityService";
import { buildIntelligenceConfidence, type IntelligenceConfidence } from "./intelligenceConfidenceService";

export type IntelligenceSummaryTone = "positive" | "mixed" | "developing" | "neutral";

export type IntelligenceSummary = {
  tone: IntelligenceSummaryTone;
  headline: string;
  explanation: string;
  comparisons: PersonalBenchmarkComparison[];
  availableCount: number;
  withinCount: number;
  outsideCount: number;
  unavailableCount: number;
  confidence: string;
  confidenceScore: number;
  confidenceLevel: IntelligenceConfidence["level"];
  confidenceReasons: string[];
  dataQuality: DataQualityReport;
};

export function buildIntelligenceSummary(snake: Snake, benchmark: CommunityBenchmarkDataset | null): IntelligenceSummary {
  const comparisons = buildPersonalBenchmarkComparisons(snake, benchmark);
  const available = comparisons.filter((item) => item.status !== "unavailable");
  const withinCount = available.filter((item) => item.status === "within").length;
  const outsideCount = available.filter((item) => item.status !== "within").length;
  const unavailableCount = comparisons.length - available.length;
  const dataQuality = buildIntelligenceDataQuality(snake);
  const confidence = buildIntelligenceConfidence(snake, dataQuality, benchmark);
  const base = { comparisons, availableCount: available.length, withinCount, outsideCount, unavailableCount, confidence: confidence.label, confidenceScore: confidence.score, confidenceLevel: confidence.level, confidenceReasons: confidence.reasons, dataQuality };

  if (!available.length) return { ...base, tone: "developing", headline: "Your intelligence baseline is still building", explanation: "Tiny Titans has personal records, but there is not yet enough comparable community data to make a responsible pattern comparison." };
  if (outsideCount === 0) return { ...base, tone: "positive", headline: "The recorded picture is consistent", explanation: `The measurable records currently sit within the middle 50% of their comparable community patterns across ${withinCount} tracked area${withinCount === 1 ? "" : "s"}.` };
  if (withinCount > 0) return { ...base, tone: "mixed", headline: "Some patterns differ from the community cohort", explanation: `${withinCount} measurable area${withinCount === 1 ? " is" : "s are"} within the recorded middle 50%, while ${outsideCount} sit outside it. That is an observation to investigate, not a diagnosis or health judgement.` };
  return { ...base, tone: "neutral", headline: "Your recorded patterns differ from this cohort", explanation: "The currently measurable records sit outside the middle 50% of this comparable community cohort. Context, record quality and individual variation matter, so Tiny Titans does not interpret this as a health judgement." };
}
