import type { TitanIntelligenceResult } from "./titanIntelligenceContracts";
import { getCachedTitanV50 } from "./titanIntelligenceCache";
import { buildV50ImpactResult, type TitanV50EventType } from "./titanV50ImpactGraph";
import type { TitanV50RuntimeInput } from "./titanV50Runtime";

export interface TitanV50JourneyResult extends TitanIntelligenceResult {
  eventType?: TitanV50EventType;
  impactedFeatureIds: readonly number[];
}

/**
 * Canonical path for a keeper event entering V50:
 * record -> refresh deterministic context -> calculate feature impacts ->
 * return explainable recommendations.
 */
export function processTitanV50Event(
  eventType: TitanV50EventType,
  input: TitanV50RuntimeInput,
): TitanV50JourneyResult {
  const runtime = getCachedTitanV50({
    ...input,
    eventType,
    recentEventTypes: [...(input.recentEventTypes ?? []), eventType],
  });
  const impact = buildV50ImpactResult(eventType);
  return {
    ...runtime,
    eventType,
    impactedFeatureIds: [...new Set([...runtime.impactedFeatureIds, ...impact.featureIds])],
    signals: [...runtime.signals, ...impact.signals],
    recommendations: [...runtime.recommendations, ...impact.recommendations],
  };
}
