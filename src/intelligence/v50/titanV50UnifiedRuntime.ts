import { TITAN_V50_FEATURES } from "./titanV50FeatureMatrix";
import type { TitanRecommendation, TitanSignal } from "./titanIntelligenceContracts";
import { buildTitanContextSnapshot, type TitanContextSnapshotInput, type TitanContextSnapshotResult } from "./titanContextSnapshot";
import { runTitanV50 as runCapabilityRuntime, type TitanV50RuntimeInput, type TitanV50RuntimeResult } from "./titanV50Runtime";
import { buildV50ImpactResult, type TitanV50EventType } from "./titanV50ImpactGraph";
import { buildHolyShitDiscoveries } from "./titanKnowledgeGraph";
import { buildTitanDiscoveries, type TitanMemorySignal } from "./titanHolyShitEngine";

export interface TitanV50UnifiedInput extends TitanV50RuntimeInput {
  context?: TitanContextSnapshotInput;
  animal?: TitanContextSnapshotInput["animal"];
  genetics?: TitanContextSnapshotInput["genetics"];
  husbandry?: TitanContextSnapshotInput["husbandry"];
  learning?: TitanContextSnapshotInput["learning"];
  community?: TitanContextSnapshotInput["community"];
  eventType?: TitanV50EventType;
}

export interface TitanV50UnifiedResult extends TitanV50RuntimeResult {
  contextSnapshot: TitanContextSnapshotResult;
  impactedFeatureIds: readonly number[];
  discoveries: readonly { title: string; detail: string; featureIds: readonly number[] }[];
  advancedDiscoveries: ReturnType<typeof buildTitanDiscoveries>;
}

function contextSignals(snapshot: TitanContextSnapshotResult): TitanSignal[] {
  const findings = [
    ...snapshot.genetics.conflicts,
    ...snapshot.genetics.impossibleOutcomes,
    ...snapshot.husbandry.findings.filter((finding) => finding.type === "anomaly" || finding.type === "alert"),
    ...snapshot.husbandry.digitalTwin.findings,
  ];
  return findings.slice(0, 12).map((finding, index) => ({
    id: `context-${index}-${finding.type ?? finding.id}`,
    title: finding.title,
    message: finding.detail ?? finding.explanation,
    severity: finding.severity,
    confidence: finding.confidence,
    createdAt: snapshot.generatedAt,
  }));
}

function contextRecommendations(snapshot: TitanContextSnapshotResult): TitanRecommendation[] {
  const recommendations: TitanRecommendation[] = [];
  if (snapshot.genetics.conflicts.length) recommendations.push({ id: "context-review-genetics", title: "Review genetics evidence", reason: "Conflicting genetics claims were found; reconcile the underlying records before treating the identity as settled.", destination: "/morph-library", priority: 95, confidence: 0.98 });
  if (snapshot.genetics.impossibleOutcomes.length) recommendations.push({ id: "context-review-outcomes", title: "Review breeding outcome records", reason: "A recorded offspring claim conflicts with explicit parent copy counts. Check the source records before changing the outcome.", destination: "/breeding", priority: 100, confidence: 0.98 });
  if (snapshot.growth && snapshot.growth.sampleCount >= 3) recommendations.push({ id: "context-growth", title: "Review growth history", reason: `${snapshot.growth.sampleCount} dated weight records now support a bounded growth summary.`, destination: "/weights", priority: 58, confidence: snapshot.growth.confidence === "High" ? 0.95 : 0.82 });
  if (snapshot.husbandry.findings.some((finding) => finding.type === "anomaly")) recommendations.push({ id: "context-husbandry", title: "Review enclosure readings", reason: "Recorded environmental observations fall outside the configured keeper baseline.", destination: "/enclosure-intelligence", priority: 88, confidence: 0.98 });
  if (snapshot.husbandry.digitalTwin.optimisations.length) recommendations.push({ id: "context-twin", title: "Review Digital Twin optimisation", reason: snapshot.husbandry.digitalTwin.optimisations[0].reason, destination: "/reptile-room", priority: 72, confidence: 0.9 });
  if (snapshot.learning.nextTopics.length) recommendations.push({ id: "context-learning", title: "Continue your weakest learning topics", reason: "The next topics are selected from your recorded learning performance rather than guessed ability.", destination: "/learn", priority: 42, confidence: 0.92 });
  return recommendations;
}

function memorySignals(snapshot: TitanContextSnapshotResult): TitanMemorySignal[] {
  const signals: TitanMemorySignal[] = [];
  for (const finding of snapshot.genetics.conflicts.slice(0, 3)) signals.push({ id: `genetic-${finding.title}`, domain: "genetics", label: finding.title, value: finding.detail, confidence: finding.confidence });
  for (const finding of snapshot.genetics.impossibleOutcomes.slice(0, 3)) signals.push({ id: `offspring-${finding.title}`, domain: "genetics", label: finding.title, value: finding.detail, confidence: finding.confidence });
  for (const finding of snapshot.husbandry.findings.filter((item) => item.type === "anomaly" || item.type === "alert").slice(0, 3)) signals.push({ id: `husbandry-${finding.title}`, domain: "husbandry", label: finding.title, value: finding.detail, confidence: finding.confidence });
  for (const finding of snapshot.husbandry.digitalTwin.findings.slice(0, 3)) signals.push({ id: `twin-${finding.id}`, domain: "husbandry", label: finding.title, value: finding.explanation, confidence: finding.confidence });
  if (snapshot.growth) signals.push({ id: "animal-growth", domain: "animal", label: "Growth history", value: `${snapshot.growth.sampleCount} recorded weights`, confidence: snapshot.growth.sampleCount >= 3 ? 0.9 : 0.7 });
  if (snapshot.behaviour) signals.push({ id: "animal-behaviour", domain: "animal", label: "Behaviour history", value: `${snapshot.behaviour.observationCount} recorded observations`, confidence: snapshot.behaviour.observationCount >= 4 ? 0.84 : 0.6 });
  if (snapshot.learning.topicMastery.length) signals.push({ id: "learning-history", domain: "learning", label: "Learning history", value: `${snapshot.learning.topicMastery.length} measured topics`, confidence: snapshot.learning.overallAccuracy >= 0.8 ? 0.9 : 0.75 });
  if (snapshot.community.totalAccepted > 0) signals.push({ id: "community-history", domain: "community", label: "Community contributions", value: `${snapshot.community.totalAccepted} accepted contributions`, confidence: 0.88 });
  return signals;
}

export function runTitanV50Unified(input: TitanV50UnifiedInput): TitanV50UnifiedResult {
  const base = runCapabilityRuntime(input);
  const contextSnapshot = buildTitanContextSnapshot(input.context ?? { animal: input.animal, genetics: input.genetics, husbandry: input.husbandry, learning: input.learning, community: input.community });
  const impact = input.eventType ? buildV50ImpactResult(input.eventType) : { featureIds: [] as number[], signals: [] as TitanSignal[], recommendations: [] as TitanRecommendation[] };
  const discoveries = buildHolyShitDiscoveries(input.eventType);
  const advancedDiscoveries = buildTitanDiscoveries(memorySignals(contextSnapshot));
  const discoverySignals: TitanSignal[] = [
    ...discoveries.map((item, index) => ({ id: `holy-shit-${index}`, title: item.title, message: item.detail, severity: "info" as const, confidence: 0.88, createdAt: contextSnapshot.generatedAt })),
    ...advancedDiscoveries.map((item) => ({ id: item.id, title: item.title, message: item.detail, severity: "info" as const, confidence: item.confidence, createdAt: contextSnapshot.generatedAt })),
  ];
  const signals = [...base.signals, ...contextSignals(contextSnapshot), ...impact.signals, ...discoverySignals].slice(0, 30);
  const recommendations = [...base.recommendations, ...contextRecommendations(contextSnapshot), ...impact.recommendations]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .filter((item) => TITAN_V50_FEATURES.some((feature) => feature.route === item.destination) || ["/", "/weights", "/feeding", "/shedding", "/husbandry", "/enclosure-intelligence", "/morph-library", "/breeding", "/learn", "/reptile-room"].includes(item.destination))
    .slice(0, 20);

  return { ...base, signals, recommendations, contextSnapshot, impactedFeatureIds: impact.featureIds, discoveries, advancedDiscoveries };
}
