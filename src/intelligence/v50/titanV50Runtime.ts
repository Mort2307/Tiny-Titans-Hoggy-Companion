import { TITAN_V50_FEATURES, type V50Feature } from "./titanV50FeatureMatrix";
import type { TitanIntelligenceResult, TitanRecommendation, TitanSignal } from "./titanIntelligenceContracts";
import { buildTitanProactiveIntelligence, type TitanProactiveInput } from "./titanProactiveEngine";

export interface TitanV50RuntimeInput extends TitanProactiveInput {
  hasGeneticRecords?: boolean;
  hasBreedingProjects?: boolean;
  hasEnclosures?: boolean;
  hasBehaviourRecords?: boolean;
  hasLearningActivity?: boolean;
  hasCommunityActivity?: boolean;
}

export interface TitanV50CapabilityResult {
  feature: V50Feature;
  state: "ready" | "needs-data";
  summary: string;
  evidence: readonly string[];
  signals: readonly TitanSignal[];
  recommendations: readonly TitanRecommendation[];
}

export interface TitanV50RuntimeResult extends TitanIntelligenceResult {
  capabilities: readonly TitanV50CapabilityResult[];
}

const FEATURE_SUMMARIES: Record<number, string> = {
  1: "Compare recorded genetics, phenotype notes and evidence without promoting uncertain claims to facts.",
  2: "Keep phenotype recognition separate from genetic confirmation and route uncertain observations for review.",
  3: "Turn recorded parent genetics into an explorable breeding design surface with explicit uncertainty.",
  4: "Represent known parentage and recorded offspring as a living family relationship graph.",
  5: "Compare recorded genetic states and breeding history across time rather than rewriting historical records.",
  6: "Use the keeper's real records as the central context for useful next actions.",
  7: "Turn animal history into a chronological life graph of real recorded events.",
  8: "Compare meaningful earlier and current records so change is visible without manufacturing trends.",
  9: "Build a behaviour profile from repeated observations, not from assumed temperament.",
  10: "Connect opted-in community location and contribution data to the community globe without exposing private identity.",
  11: "Suggest relevant morph-library paths from recorded terms, aliases and recognised combinations.",
  12: "Present the same underlying knowledge in adjustable explanation modes without changing factual content.",
  13: "Create a portable animal passport from the keeper's confirmed record set.",
  14: "Prepare an exportable health/vet summary while keeping diagnosis and treatment decisions with professionals.",
  15: "Detect recorded changes that merit review without declaring that a change is medically significant.",
  16: "Explore genetic what-if combinations without modifying the keeper's real records.",
  17: "Connect all intelligence layers through shared context, events and explainable recommendations.",
  18: "Flag husbandry data that differs from the keeper's established baseline for review.",
  19: "Store enclosure microclimate observations as time-series evidence for later pattern analysis.",
  20: "Maintain a structured digital model of the keeper's vivarium entities and their state.",
  21: "Track bioactive ecosystem observations, maintenance and changes as first-class enclosure records.",
  22: "Track plant presence and care observations as part of enclosure context.",
  23: "Expose evidence strength and provenance alongside genetics and morph information.",
  24: "Identify inconsistent or conflicting genetics records for keeper review before breeding decisions.",
  25: "Check claimed offspring outcomes against recorded parent genetics and flag impossible combinations for review.",
  26: "Use shed history and observations to build an evidence-based shed investigation trail.",
  27: "Use recorded weights to establish a growth history and make bounded future projections when enough data exists.",
  28: "Provide a structured escape-response checklist and recovery record without requiring a health claim.",
  29: "Provide a safety-first emergency workflow with clear escalation boundaries and no diagnosis.",
  30: "Surface configured microclimate alerts from recorded thresholds and sensor observations.",
  31: "Represent individual enclosure structure as a reusable digital twin model.",
  32: "Compare digital-twin state with recorded goals and identify optimisation opportunities.",
  33: "Apply a hatchling-specific context layer to feeding, weight, husbandry and genetics records.",
  34: "Compare expected breeding outcomes with recorded results and preserve outcome uncertainty.",
  35: "Build keeper reputation from transparent contribution history rather than popularity alone.",
  36: "Provide a community verification workflow for disputed morph terminology and evidence.",
  37: "Preserve the provenance chain behind a genetic claim from source record to current animal.",
  38: "Capture a yearly snapshot of the keeper's real records and milestones without rewriting history.",
  39: "Assemble a keeper journal from recorded events and observations with traceable source links.",
  40: "Adapt learning prompts to the learner's recorded activity and demonstrated knowledge.",
  41: "Measure species learning progress from completed learning activity, not from assumptions.",
  42: "Aggregate opted-in community participation into a privacy-preserving reptile census.",
  43: "Connect species, genetics, husbandry, learning and community concepts through shared identifiers and evidence.",
  44: "Explain which record, rule or evidence caused an intelligence surface to appear.",
  45: "Expose data coverage and evidence confidence so users can judge intelligence output quality.",
  46: "Score genetic identity confidence from explicit records and evidence rather than phenotype alone.",
  47: "Combine opt-in community data into species-level intelligence while protecting private keeper records.",
  48: "Provide a structured research archive with source provenance and confidence labels.",
  49: "Generate proactive suggestions only from explicit context, existing records and supported rules.",
  50: "Run the unified Titan Intelligence layer across the collection while keeping every signal explainable and bounded.",
};

function evidenceFor(featureId: number, input: TitanV50RuntimeInput): string[] {
  const evidence: string[] = [];
  if (input.counts.snakes > 0) evidence.push(`${input.counts.snakes} animal record(s)`);
  if (input.counts.weights > 0) evidence.push(`${input.counts.weights} weight record(s)`);
  if (input.counts.feedings > 0) evidence.push(`${input.counts.feedings} feeding record(s)`);
  if (input.counts.sheds > 0) evidence.push(`${input.counts.sheds} shed record(s)`);
  if (input.counts.health > 0) evidence.push(`${input.counts.health} health record(s)`);
  if (input.hasGeneticRecords) evidence.push("recorded genetics available");
  if (input.hasBreedingProjects) evidence.push("breeding projects available");
  if (input.hasEnclosures) evidence.push("enclosure records available");
  if (input.hasBehaviourRecords) evidence.push("behaviour observations available");
  if (input.hasLearningActivity) evidence.push("learning activity available");
  if (input.hasCommunityActivity) evidence.push("community activity available");
  if (input.recentEventTypes?.length) evidence.push(`recent event: ${input.recentEventTypes[input.recentEventTypes.length - 1]}`);
  if (featureId === 45 && evidence.length === 0) evidence.push("no qualifying keeper records yet");
  return evidence.slice(0, 6);
}

function featureReady(feature: V50Feature, input: TitanV50RuntimeInput): boolean {
  switch (feature.id) {
    case 6:
    case 17:
    case 44:
    case 45:
    case 49:
    case 50:
      return true;
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 11:
    case 16:
    case 23:
    case 24:
    case 25:
    case 34:
    case 37:
    case 46:
      return Boolean(input.hasGeneticRecords || input.hasBreedingProjects);
    case 7:
    case 8:
    case 13:
    case 38:
    case 39:
      return input.counts.snakes > 0;
    case 9:
      return Boolean(input.hasBehaviourRecords || input.counts.behaviour > 0);
    case 10:
    case 35:
    case 36:
    case 42:
    case 47:
      return Boolean(input.hasCommunityActivity);
    case 12:
    case 40:
    case 41:
    case 48:
      return Boolean(input.hasLearningActivity);
    case 14:
    case 29:
      return input.counts.snakes > 0;
    case 15:
    case 18:
    case 26:
    case 27:
      return input.counts.snakes > 0;
    case 19:
    case 20:
    case 21:
    case 22:
    case 30:
    case 31:
    case 32:
      return Boolean(input.hasEnclosures);
    case 28:
    case 33:
      return input.counts.snakes > 0;
    case 43:
      return input.counts.snakes > 0 || Boolean(input.hasGeneticRecords || input.hasEnclosures || input.hasLearningActivity);
    default:
      return false;
  }
}

export function runTitanV50(input: TitanV50RuntimeInput): TitanV50RuntimeResult {
  const base = buildTitanProactiveIntelligence(input);
  const capabilities = TITAN_V50_FEATURES.map((feature) => {
    const ready = featureReady(feature, input);
    const evidence = evidenceFor(feature.id, input);
    const recommendations: TitanRecommendation[] = ready || feature.id === 6 || feature.id === 17 || feature.id === 44 || feature.id === 45 || feature.id === 49 || feature.id === 50
      ? []
      : [{
          id: `v50-feature-${feature.id}-needs-data`,
          title: `Add data for ${feature.name}`,
          reason: FEATURE_SUMMARIES[feature.id] ?? "This capability needs more real keeper records before it can produce a meaningful result.",
          destination: feature.route ?? "/",
          priority: Math.max(10, 55 - feature.id),
          confidence: 0.99,
        }];

    return {
      feature,
      state: ready ? "ready" : "needs-data",
      summary: FEATURE_SUMMARIES[feature.id] ?? feature.name,
      evidence,
      signals: ready ? base.signals.filter((signal) => signal.id.includes("context") || signal.id.includes("feeding") || signal.id.includes("weight")) : [],
      recommendations,
    };
  });

  const proactiveRecommendations = capabilities
    .flatMap((capability) => capability.recommendations)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 12);

  return {
    ...base,
    recommendations: [...base.recommendations, ...proactiveRecommendations],
    capabilities,
  };
}

export { FEATURE_SUMMARIES };
