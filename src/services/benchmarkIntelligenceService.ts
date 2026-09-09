import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase/config";

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
  eligibleKeepers: number;
  snakeCount: number;
  cohortKey: string;
  publicationThreshold: { minimumContributors: number; minimumRecords: number; met: boolean };
  metrics: BenchmarkMetric[];
};

const functions = getFunctions(app);
const getCommunityBenchmarks = httpsCallable<
  { species?: string; sex?: string; morph?: string; ageBand?: string },
  CommunityBenchmarkDataset
>(functions, "getCommunityBenchmarks");

export function getAgeBand(hatchDate?: string, now = new Date()): string | undefined {
  if (!hatchDate) return undefined;
  const parsed = Date.parse(hatchDate);
  if (!Number.isFinite(parsed)) return undefined;
  const years = (now.getTime() - parsed) / 31557600000;
  if (years < 0) return undefined;
  if (years < 0.5) return "juvenile-early";
  if (years < 1) return "juvenile-late";
  if (years < 2) return "subadult";
  if (years < 5) return "adult";
  return "mature";
}

export async function getCommunityBenchmarkDataset(input: { species?: string; sex?: string; morph?: string; ageBand?: string } = {}): Promise<CommunityBenchmarkDataset> {
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
