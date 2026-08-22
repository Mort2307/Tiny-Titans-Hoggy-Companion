import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

export type BenchmarkConfidence = "strong" | "developing" | "limited" | "insufficient";

export type BenchmarkMetric = {
  metric: "weight" | "feedingInterval" | "shedInterval";
  label: string;
  sampleSize: number;
  contributorCount: number;
  median?: number;
  lowerQuartile?: number;
  upperQuartile?: number;
  unit: string;
  confidence: BenchmarkConfidence;
  explanation: string;
};

export type CommunityBenchmarkDataset = {
  generatedAt: string;
  contributorCount: number;
  snakeCount: number;
  cohortKey: string;
  metrics: BenchmarkMetric[];
};

const getCommunityBenchmarks = httpsCallable<
  { species?: string; sex?: string; morph?: string; ageBand?: string },
  CommunityBenchmarkDataset
>(functions, "getCommunityBenchmarks");

/**
 * Fetches only anonymised benchmark aggregates. Individual keeper/snake records
 * are never returned by this client service.
 */
export async function getCommunityBenchmarkDataset(input: {
  species?: string;
  sex?: string;
  morph?: string;
  ageBand?: string;
} = {}): Promise<CommunityBenchmarkDataset> {
  const result = await getCommunityBenchmarks(input);
  return result.data;
}

export function confidenceLabel(confidence: BenchmarkConfidence): string {
  switch (confidence) {
    case "strong": return "Strong dataset";
    case "developing": return "Developing dataset";
    case "limited": return "Limited dataset";
    default: return "Insufficient data";
  }
}

export function benchmarkIsUsable(metric: BenchmarkMetric): boolean {
  return metric.confidence !== "insufficient" && metric.sampleSize >= 5 && metric.contributorCount >= 5;
}
