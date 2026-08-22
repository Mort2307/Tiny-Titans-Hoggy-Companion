import { getFunctions, httpsCallable } from "firebase/functions";

export type CommunityIntelligenceSnapshot = {
  available: boolean;
  reason?: "insufficient-cohort-size";
  minimumContributors: number;
  contributors: number;
  snakes?: number;
  weightLogs?: number;
  validWeights?: number;
  averageWeightKg?: number | null;
  feedingLogs?: number;
  shedLogs?: number;
  validSheds?: number;
  averageShedLengthCm?: number | null;
  species?: Array<{ label: string; count: number }>;
  morphs?: Array<{ label: string; count: number }>;
  generatedAt: string;
};

export async function getCommunityIntelligenceSnapshot(): Promise<CommunityIntelligenceSnapshot> {
  const functions = getFunctions(undefined, "europe-west2");
  const callable = httpsCallable<void, CommunityIntelligenceSnapshot>(functions, "getCommunityIntelligenceSnapshot");
  const result = await callable();
  return result.data;
}
