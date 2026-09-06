import type { AnimalIntelligenceInput, BehaviourProfile, GrowthInsight, AnimalTimelineEvent } from "./animalIntelligenceEngine";
import { buildAnimalTimeline, buildBehaviourProfile, getGrowthInsight } from "./animalIntelligenceEngine";
import type { GeneticsClaim, GeneticsIntegrityFinding } from "./geneticsIntegrityEngine";
import { calculateGeneticIdentityConfidence, detectGeneticsConflicts, detectImpossibleOffspring } from "./geneticsIntegrityEngine";
import type { HusbandryBaseline, HusbandryFinding, HusbandryObservation } from "./husbandryIntelligenceEngine";
import { analyseMicroclimate, buildHusbandryBaseline, buildMissingDataFindings } from "./husbandryIntelligenceEngine";
import type { LearningSignal, CommunityContribution } from "./learningCommunityIntelligenceEngine";
import { buildAdaptiveLearningProfile, buildCommunityCensus, calculateKeeperReputation, chooseNextLearningTopics } from "./learningCommunityIntelligenceEngine";

export interface TitanContextSnapshotInput {
  animal?: AnimalIntelligenceInput;
  genetics?: {
    claims?: readonly GeneticsClaim[];
    parentA?: readonly GeneticsClaim[];
    parentB?: readonly GeneticsClaim[];
    observedOffspring?: readonly GeneticsClaim[];
  };
  husbandry?: {
    hasEnclosure: boolean;
    observations?: readonly HusbandryObservation[];
    baseline?: HusbandryBaseline;
  };
  learning?: {
    signals?: readonly LearningSignal[];
    availableTopics?: readonly string[];
  };
  community?: readonly CommunityContribution[];
}

export interface TitanContextSnapshotResult {
  generatedAt: number;
  growth?: GrowthInsight;
  behaviour?: BehaviourProfile;
  lifeTimeline: readonly AnimalTimelineEvent[];
  genetics: {
    conflicts: readonly GeneticsIntegrityFinding[];
    impossibleOutcomes: readonly GeneticsIntegrityFinding[];
    identityConfidence: number;
  };
  husbandry: {
    baseline?: HusbandryBaseline;
    findings: readonly HusbandryFinding[];
  };
  learning: ReturnType<typeof buildAdaptiveLearningProfile> & { nextTopics: readonly string[] };
  community: ReturnType<typeof buildCommunityCensus> & { keeperReputation: number };
}

export function buildTitanContextSnapshot(input: TitanContextSnapshotInput): TitanContextSnapshotResult {
  const animal = input.animal;
  const weights = animal?.weights ?? [];
  const behaviour = animal?.behaviour ?? [];
  const genetics = input.genetics ?? {};
  const husbandryObservations = input.husbandry?.observations ?? [];
  const baseline = input.husbandry?.baseline ?? buildHusbandryBaseline(husbandryObservations);
  const learningSignals = input.learning?.signals ?? [];
  const community = input.community ?? [];

  return {
    generatedAt: Date.now(),
    growth: animal ? getGrowthInsight(weights) : undefined,
    behaviour: animal ? buildBehaviourProfile(behaviour) : undefined,
    lifeTimeline: animal ? buildAnimalTimeline(animal) : [],
    genetics: {
      conflicts: detectGeneticsConflicts(genetics.claims ?? []),
      impossibleOutcomes: detectImpossibleOffspring(genetics),
      identityConfidence: calculateGeneticIdentityConfidence(genetics.claims ?? []),
    },
    husbandry: {
      baseline: Object.keys(baseline).length ? baseline : undefined,
      findings: [
        ...analyseMicroclimate(husbandryObservations, baseline),
        ...buildMissingDataFindings(input.husbandry?.hasEnclosure ?? false, husbandryObservations.length),
      ],
    },
    learning: {
      ...buildAdaptiveLearningProfile(learningSignals),
      nextTopics: chooseNextLearningTopics(learningSignals, input.learning?.availableTopics ?? []),
    },
    community: {
      ...buildCommunityCensus(community),
      keeperReputation: calculateKeeperReputation(community),
    },
  };
}
