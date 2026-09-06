import type { TitanRecommendation, TitanSignal } from "./titanIntelligenceContracts";
import { TITAN_V50_FEATURES } from "./titanV50FeatureMatrix";

export type TitanV50EventType =
  | "WeightRecorded"
  | "FeedingRecorded"
  | "ShedRecorded"
  | "BehaviourObserved"
  | "HealthRecordCreated"
  | "BreedingProjectCreated"
  | "MorphConfirmed"
  | "EnclosureUpdated"
  | "MicroclimateRecorded"
  | "LearningCompleted"
  | "CommunityContribution"
  | "SpeciesAdded";

const IMPACTS: Record<TitanV50EventType, readonly number[]> = {
  WeightRecorded: [6, 7, 8, 15, 27, 39, 44, 45, 49, 50],
  FeedingRecorded: [6, 8, 9, 15, 26, 27, 33, 39, 44, 49, 50],
  ShedRecorded: [6, 8, 15, 26, 39, 44, 45, 49, 50],
  BehaviourObserved: [6, 8, 9, 15, 26, 39, 44, 47, 49, 50],
  HealthRecordCreated: [6, 8, 13, 14, 15, 28, 29, 39, 44, 45, 49, 50],
  BreedingProjectCreated: [3, 4, 5, 24, 25, 33, 34, 37, 43, 44, 45, 46, 49, 50],
  MorphConfirmed: [1, 2, 5, 11, 23, 24, 34, 37, 43, 44, 45, 46, 49, 50],
  EnclosureUpdated: [6, 15, 18, 19, 20, 21, 22, 30, 31, 32, 39, 43, 44, 45, 49, 50],
  MicroclimateRecorded: [15, 18, 19, 20, 21, 22, 30, 31, 32, 44, 45, 49, 50],
  LearningCompleted: [12, 40, 41, 43, 44, 45, 48, 49, 50],
  CommunityContribution: [10, 23, 35, 36, 42, 47, 48, 49, 50],
  SpeciesAdded: [6, 10, 12, 41, 42, 43, 47, 48, 49, 50],
};

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function getV50ImpactFeatureIds(eventType: TitanV50EventType): readonly number[] {
  return IMPACTS[eventType] ?? [];
}

export function getV50ImpactedFeatures(eventType: TitanV50EventType) {
  const ids = new Set(getV50ImpactFeatureIds(eventType));
  return TITAN_V50_FEATURES.filter((feature) => ids.has(feature.id));
}

export interface TitanV50ImpactResult {
  eventType: TitanV50EventType;
  featureIds: readonly number[];
  signals: readonly TitanSignal[];
  recommendations: readonly TitanRecommendation[];
}

/**
 * Event fan-out contract. A single keeper action can update multiple
 * intelligence experiences, while each downstream experience remains
 * responsible for deciding whether it has enough evidence to say anything.
 */
export function buildV50ImpactResult(eventType: TitanV50EventType, destination = "/"): TitanV50ImpactResult {
  const ids = unique(getV50ImpactFeatureIds(eventType));
  const impacted = getV50ImpactedFeatures(eventType);
  const now = Date.now();
  return {
    eventType,
    featureIds: ids,
    signals: impacted.slice(0, 8).map((feature) => ({
      id: `v50-impact-${eventType}-${feature.id}`,
      title: `${feature.name} context updated`,
      message: `${eventType} can affect this intelligence capability. Tiny Titans will only surface an observation when its evidence requirements are met.`,
      severity: "info",
      confidence: 1,
      actionPath: feature.route ?? destination,
      createdAt: now,
    })),
    recommendations: impacted.slice(0, 6).map((feature, index) => ({
      id: `v50-next-${eventType}-${feature.id}`,
      title: `Revisit ${feature.name}`,
      reason: `${eventType} changed context relevant to this capability; no claim is made until the required records exist.`,
      destination: feature.route ?? destination,
      priority: 50 - index,
      confidence: 0.95,
    })),
  };
}
