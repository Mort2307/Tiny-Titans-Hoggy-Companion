import { TITAN_V50_FEATURES } from "./titanV50FeatureMatrix";
import type { TitanRecommendation, TitanSignal } from "./titanIntelligenceContracts";
import { buildTitanContextSnapshot, type TitanContextSnapshotInput, type TitanContextSnapshotResult } from "./titanContextSnapshot";
import { runTitanV50 as runCapabilityRuntime, type TitanV50RuntimeInput, type TitanV50RuntimeResult } from "./titanV50Runtime";
import { buildV50ImpactResult, type TitanV50EventType } from "./titanV50ImpactGraph";

export interface TitanV50UnifiedInput extends TitanV50RuntimeInput {
  context?: TitanContextSnapshotInput;
  eventType?: TitanV50EventType;
}

export interface TitanV50UnifiedResult extends TitanV50RuntimeResult {
  contextSnapshot: TitanContextSnapshotResult;
  impactedFeatureIds: readonly number[];
}

function contextSignals(snapshot: TitanContextSnapshotResult): TitanSignal[] {
  const findings = [
    ...snapshot.genetics.conflicts,
    ...snapshot.genetics.impossibleOutcomes,
    ...snapshot.husbandry.findings.filter((finding) => finding.type === "anomaly" || finding.type === "alert"),
  ];
  return findings.slice(0, 12).map((finding, index) => ({
    id: `context-${index}-${finding.type}`,
    title: finding.title,
    message: finding.detail,
    severity: finding.severity,
    confidence: finding.confidence,
    createdAt: snapshot.generatedAt,
  }));
}

function contextRecommendations(snapshot: TitanContextSnapshotResult): TitanRecommendation[] {
  const recommendations: TitanRecommendation[] = [];
  if (snapshot.genetics.conflicts.length) {
    recommendations.push({ id: "context-review-genetics", title: "Review genetics evidence", reason: "Conflicting genetics claims were found; reconcile the underlying records before treating the identity as settled.", destination: "/morph-library", priority: 95, confidence: 0.98 });
  }
  if (snapshot.genetics.impossibleOutcomes.length) {
    recommendations.push({ id: "context-review-outcomes", title: "Review breeding outcome records", reason: "A recorded offspring claim conflicts with explicit parent copy counts. Check the source records before changing the outcome.", destination: "/breeding", priority: 100, confidence: 0.98 });
  }
  if (snapshot.growth && snapshot.growth.sampleCount >= 3) {
    recommendations.push({ id: "context-growth", title: "Review growth history", reason: `${snapshot.growth.sampleCount} dated weight records now support a bounded growth summary.`, destination: "/weights", priority: 58, confidence: snapshot.growth.confidence === "High" ? 0.95 : 0.82 });
  }
  if (snapshot.husbandry.findings.some((finding) => finding.type === "anomaly")) {
    recommendations.push({ id: "context-husbandry", title: "Review enclosure readings", reason: "Recorded environmental observations fall outside the configured keeper baseline.", destination: "/enclosure-intelligence", priority: 88, confidence: 0.98 });
  }
  if (snapshot.learning.nextTopics.length) {
    recommendations.push({ id: "context-learning", title: "Continue your weakest learning topics", reason: "The next topics are selected from your recorded learning performance rather than guessed ability.", destination: "/learn", priority: 42, confidence: 0.92 });
  }
  return recommendations;
}

export function runTitanV50Unified(input: TitanV50UnifiedInput): TitanV50UnifiedResult {
  const base = runCapabilityRuntime(input);
  const contextSnapshot = buildTitanContextSnapshot(input.context ?? {
    animal: input.animal,
    genetics: input.genetics,
    husbandry: input.husbandry,
    learning: input.learning,
    community: [],
  });
  const impact = input.eventType ? buildV50ImpactResult(input.eventType) : { featureIds: [] as number[], signals: [] as TitanSignal[], recommendations: [] as TitanRecommendation[] };
  const signals = [...base.signals, ...contextSignals(contextSnapshot), ...impact.signals].slice(0, 30);
  const recommendations = [...base.recommendations, ...contextRecommendations(contextSnapshot), ...impact.recommendations]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => TITAN_V50_FEATURES.some((feature) => feature.route === item.destination) || ["/", "/weights", "/feeding", "/shedding", "/husbandry", "/enclosure-intelligence", "/morph-library", "/breeding", "/learn"].includes(item.destination))
    .slice(0, 20);

  return {
    ...base,
    signals,
    recommendations,
    contextSnapshot,
    impactedFeatureIds: impact.featureIds,
  };
}
