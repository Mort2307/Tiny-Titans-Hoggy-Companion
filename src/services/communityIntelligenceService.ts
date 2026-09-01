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

export type PublicContributionSnapshot = {
  available: boolean;
  contributors: number;
  totalRecords: number;
  publicCommunityRecords?: number;
  behaviourContributions: number;
  morphContributions: number;
  communityContributions: number;
  intelligenceContributions?: number;
  intelligenceWeightRecords?: number;
  intelligenceFeedingRecords?: number;
  intelligenceShedRecords?: number;
  intelligenceHealthRecords?: number;
  intelligenceContributingKeepers?: number;
  generatedAt: string;
};

export type PublicContributionEntry = {
  id: string;
  category: string;
  title: string;
  snippet: string;
  contributor: string;
  createdAt: string;
  source: string;
};

export type PublicContributionFeed = {
  entries: PublicContributionEntry[];
  generatedAt: string;
};

function functions() { return getFunctions(undefined, "europe-west2"); }

export async function getCommunityIntelligenceSnapshot(): Promise<CommunityIntelligenceSnapshot> {
  const callable = httpsCallable<void, CommunityIntelligenceSnapshot>(functions(), "getCommunityIntelligenceSnapshot");
  const result = await callable();
  return result.data;
}

export async function getPublicCommunityContributionSnapshot(): Promise<PublicContributionSnapshot> {
  const callable = httpsCallable<void, PublicContributionSnapshot>(functions(), "getPublicCommunityContributionSnapshotV2");
  const result = await callable();
  return result.data;
}

export async function getPublicCommunityContributionFeed(): Promise<PublicContributionFeed> {
  const callable = httpsCallable<void, PublicContributionFeed>(functions(), "getPublicCommunityContributionFeedV2");
  const result = await callable();
  return result.data;
}