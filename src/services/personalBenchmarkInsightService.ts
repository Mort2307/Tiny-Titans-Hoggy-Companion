import type { Snake } from "../types/Snake";
import type { BenchmarkMetric, CommunityBenchmarkDataset } from "./benchmarkIntelligenceService";

export type PersonalBenchmarkComparison = {
  metric: BenchmarkMetric["metric"];
  label: string;
  personalValue?: number;
  lowerQuartile?: number;
  upperQuartile?: number;
  unit: string;
  status: "within" | "below" | "above" | "unavailable";
  explanation: string;
};

function intervals(history: unknown, keys: string[], maxDays: number): number[] {
  if (!Array.isArray(history)) return [];
  const dates = history.map((entry) => {
    if (!entry || typeof entry !== "object") return NaN;
    const record = entry as Record<string, unknown>;
    const raw = keys.map((key) => record[key]).find((value) => typeof value === "string" || value instanceof Date);
    return raw ? Date.parse(String(raw)) : NaN;
  }).filter(Number.isFinite).sort((a, b) => a - b);
  const result: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    const days = (dates[i] - dates[i - 1]) / 86400000;
    if (days > 0 && days <= maxDays) result.push(days);
  }
  return result;
}

function compare(metric: BenchmarkMetric | undefined, value?: number): PersonalBenchmarkComparison {
  if (!metric || value === undefined || metric.lowerQuartile === undefined || metric.upperQuartile === undefined) {
    return { metric: metric?.metric ?? "weight", label: metric?.label ?? "Benchmark", personalValue: value, lowerQuartile: metric?.lowerQuartile, upperQuartile: metric?.upperQuartile, unit: metric?.unit ?? "", status: "unavailable", explanation: "There is not enough comparable community data to make a responsible comparison yet." };
  }
  const status = value < metric.lowerQuartile ? "below" : value > metric.upperQuartile ? "above" : "within";
  return { metric: metric.metric, label: metric.label, personalValue: value, lowerQuartile: metric.lowerQuartile, upperQuartile: metric.upperQuartile, unit: metric.unit, status, explanation: status === "within" ? "The recorded value sits within the middle 50% of this comparable community cohort." : status === "below" ? "The recorded value is below the middle 50% of this comparable community cohort. This is an observation, not a health judgement." : "The recorded value is above the middle 50% of this comparable community cohort. This is an observation, not a health judgement." };
}

export function buildPersonalBenchmarkComparisons(snake: Snake, benchmark: CommunityBenchmarkDataset | null): PersonalBenchmarkComparison[] {
  if (!benchmark) return [];
  const weight = Number(snake.weight ?? snake.weightHistory?.[snake.weightHistory.length - 1]?.weight ?? NaN);
  const feeding = intervals(snake.feedingHistory, ["date", "feedingDate"], 120).at(-1);
  const shed = intervals(snake.shedHistory, ["date", "shedDate"], 180).at(-1);
  return [
    compare(benchmark.metrics.find((m) => m.metric === "weight"), Number.isFinite(weight) ? weight : undefined),
    compare(benchmark.metrics.find((m) => m.metric === "feedingInterval"), feeding),
    compare(benchmark.metrics.find((m) => m.metric === "shedInterval"), shed),
  ];
}

export function comparisonLabel(status: PersonalBenchmarkComparison["status"]): string {
  switch (status) {
    case "within": return "Within recorded pattern";
    case "below": return "Below recorded pattern";
    case "above": return "Above recorded pattern";
    default: return "Benchmark unavailable";
  }
}
