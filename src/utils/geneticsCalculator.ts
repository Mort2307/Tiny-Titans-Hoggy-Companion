// ============================================================
// TINY TITANS — GENETICS CALCULATOR ENGINE
// ============================================================
// SINGLE SOURCE OF TRUTH FOR Mendelian offspring inheritance.
//
// Design rules:
// • Recessive visual gene = 2 copies.
// • Recessive het = 1 copy, but its parent probability may be
//   100%, 66% or 50%.
// • Incomplete-dominant visual = 1 copy.
// • Incomplete-dominant Super = 2 copies.
// • Dominant visual = 1 or 2 copies; neither is a het.
// • Combination morphs are phenotype names, never independent loci.
// ============================================================

import {
  getMorphByGeneId,
  getCombinations,
  type MorphDefinition,
  type MorphComponent,
} from "../data/morphs";
import {
  getGeneId,
  resolveStrictMorph,
} from "./geneticsIdentity";
import { expandMorphToComponents } from "./morphResolver";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";
import type {
  GeneticsCalculatorInput,
  GeneticsCalculatorResult,
  OffspringComponent,
  OffspringResult,
  ParentGenetics,
  BreedingSummary,
  HetResult,
  HetPercentage,
} from "../types/genetics";

type AlleleState = {
  geneId: string;
  /** Known allele copies when the parent's genotype is certain. */
  copies: 0 | 1 | 2;
  /** Probability that a gamete from this parent carries the mutation. */
  mutationAlleleProbability: number;
};

type ParentLocus = {
  geneId: string;
  mother: AlleleState;
  father: AlleleState;
};

type LocusOutcome = {
  geneId: string;
  copies: 0 | 1 | 2;
  probability: number;
};

type InternalOutcome = {
  loci: Map<string, number>;
  probability: number;
};

const PROBABILITY_EPSILON = 0.000001;

function getDefinition(geneId: string): MorphDefinition | undefined {
  return getMorphByGeneId(geneId);
}

function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function getHetProbabilityAsParentAlleleProbability(percentage: HetPercentage): number {
  // A het is one mutant allele in two, so:
  // 100% het -> 0.5 mutant gamete probability
  // 66% het  -> (2/3) × 0.5 = 1/3
  // 50% het  -> 0.5 × 0.5 = 1/4
  if (percentage === "66%") return 1 / 3;
  if (percentage === "50%") return 1 / 4;
  return 1 / 2;
}

function getVisualGeneCopies(morph: MorphDefinition): 0 | 1 | 2 {
  if (morph.inheritance === "Recessive") return 2;
  return 1;
}

function createKnownState(geneId: string, copies: 0 | 1 | 2): AlleleState {
  return {
    geneId,
    copies,
    mutationAlleleProbability: copies === 0 ? 0 : copies === 1 ? 0.5 : 1,
  };
}

function getParentAlleleStates(parent: ParentGenetics): Map<string, AlleleState> {
  const states = new Map<string, AlleleState>();

  for (const value of parent.morphs) {
    const morph = resolveStrictMorph(value);
    if (!morph) continue;

    const components = expandMorphToComponents(morph);
    for (const component of components) {
      const geneId = component.morphId;
      const definition = getDefinition(geneId);
      if (!definition || !definition.isGene || definition.kind !== "Gene") continue;

      // expandMorphToComponents supplies a default ×1 for a standalone gene.
      // For a visually selected recessive gene that default is NOT the true
      // genotype: a visual recessive must be homozygous (×2).
      const isStandaloneVisualGene =
        morph.kind === "Gene" &&
        morph.isGene &&
        morph.geneId === geneId &&
        (!morph.components || morph.components.length === 0);

      const copies = isStandaloneVisualGene
        ? getVisualGeneCopies(morph)
        : Math.min(2, Math.max(0, component.copies ?? 1)) as 0 | 1 | 2;

      const existing = states.get(geneId);
      if (!existing) states.set(geneId, createKnownState(geneId, copies));
      else {
        const mergedCopies = Math.min(2, existing.copies + copies) as 0 | 1 | 2;
        states.set(geneId, createKnownState(geneId, mergedCopies));
      }
    }
  }

  for (const entry of parent.hets) {
    const geneId = getGeneId(entry);
    if (!geneId) continue;

    const morph = getDefinition(geneId);
    if (!morph || !morph.isGene || morph.kind !== "Gene" || !morph.hetPossible) continue;

    const percentage = parent.hetPercentages?.[geneId] ?? "100%";
    const alleleProbability = getHetProbabilityAsParentAlleleProbability(percentage);
    const existing = states.get(geneId);

    // A visual copy count always wins over a het record for the same locus.
    if (existing && existing.copies === 2) continue;

    // A known het means exactly one copy if confirmed 100%; 50/66 are
    // probability states, so keep a representative copy count of 0/1 only
    // for debugging while using the mathematically correct transmission rate.
    states.set(geneId, {
      geneId,
      copies: 1,
      mutationAlleleProbability: clampProbability(alleleProbability),
    });
  }

  return states;
}

function buildLoci(input: GeneticsCalculatorInput): ParentLocus[] {
  const mother = getParentAlleleStates(input.female);
  const father = getParentAlleleStates(input.male);
  const geneIds = new Set([...mother.keys(), ...father.keys()]);
  return [...geneIds].map((geneId) => ({
    geneId,
    mother: mother.get(geneId) ?? createKnownState(geneId, 0),
    father: father.get(geneId) ?? createKnownState(geneId, 0),
  }));
}

function calculateLocus(locus: ParentLocus): LocusOutcome[] {
  const motherMutation = clampProbability(locus.mother.mutationAlleleProbability);
  const fatherMutation = clampProbability(locus.father.mutationAlleleProbability);
  const outcomes = new Map<0 | 1 | 2, number>();

  const normalNormal = (1 - motherMutation) * (1 - fatherMutation);
  if (normalNormal > PROBABILITY_EPSILON) outcomes.set(0, normalNormal);

  const motherMutant = motherMutation * (1 - fatherMutation);
  if (motherMutant > PROBABILITY_EPSILON) outcomes.set(1, (outcomes.get(1) ?? 0) + motherMutant);

  const fatherMutant = (1 - motherMutation) * fatherMutation;
  if (fatherMutant > PROBABILITY_EPSILON) outcomes.set(1, (outcomes.get(1) ?? 0) + fatherMutant);

  const bothMutant = motherMutation * fatherMutation;
  if (bothMutant > PROBABILITY_EPSILON) outcomes.set(2, bothMutant);

  return [...outcomes.entries()].map(([copies, probability]) => ({
    geneId: locus.geneId,
    copies,
    probability: probability * 100,
  }));
}

function internalOutcomeKey(outcome: InternalOutcome): string {
  return [...outcome.loci.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([geneId, copies]) => `${geneId}:${copies}`)
    .join("|");
}

function mergeInternalOutcomes(outcomes: InternalOutcome[]): InternalOutcome[] {
  const map = new Map<string, InternalOutcome>();
  for (const outcome of outcomes) {
    const key = internalOutcomeKey(outcome);
    const existing = map.get(key);
    if (!existing) map.set(key, { loci: new Map(outcome.loci), probability: outcome.probability });
    else existing.probability += outcome.probability;
  }
  return [...map.values()];
}

function combineLocusOutcomes(loci: ParentLocus[]): InternalOutcome[] {
  let outcomes: InternalOutcome[] = [{ loci: new Map(), probability: 100 }];
  for (const locus of loci) {
    const locusOutcomes = calculateLocus(locus);
    const next: InternalOutcome[] = [];
    for (const existing of outcomes) {
      for (const locusOutcome of locusOutcomes) {
        const probability = existing.probability * (locusOutcome.probability / 100);
        if (probability <= PROBABILITY_EPSILON) continue;
        const map = new Map(existing.loci);
        map.set(locusOutcome.geneId, locusOutcome.copies);
        next.push({ loci: map, probability });
      }
    }
    outcomes = mergeInternalOutcomes(next);
  }
  return outcomes;
}

function getLocusState(morph: MorphDefinition, copies: number): "Clear" | "Het" | "Visual" | "Super" {
  if (copies <= 0) return "Clear";
  switch (morph.inheritance) {
    case "Recessive":
      return copies >= 2 ? "Visual" : "Het";
    case "Incomplete Dominant":
      return copies >= 2 ? "Super" : "Visual";
    case "Dominant":
      // One copy already expresses a dominant trait; it is never a het.
      return "Visual";
    default:
      return "Clear";
  }
}

function buildComponent(geneId: string, copies: number): OffspringComponent | undefined {
  const morph = getDefinition(geneId);
  if (!morph || copies <= 0) return undefined;
  return { geneId, name: morph.name, copies, state: getLocusState(morph, copies) };
}

function getVisualComponents(loci: Map<string, number>): OffspringComponent[] {
  const components: OffspringComponent[] = [];
  for (const [geneId, copies] of loci) {
    const component = buildComponent(geneId, copies);
    if (component?.state === "Visual" || component?.state === "Super") components.push(component);
  }
  return components.sort((a, b) => a.name.localeCompare(b.name));
}

function getHetComponents(loci: Map<string, number>): OffspringComponent[] {
  const components: OffspringComponent[] = [];
  for (const [geneId, copies] of loci) {
    const component = buildComponent(geneId, copies);
    if (component?.state === "Het") components.push(component);
  }
  return components.sort((a, b) => a.name.localeCompare(b.name));
}

function componentSignature(components: MorphComponent[]): Iterable<[string, number]> {
  const totals = new Map<string, number>();
  for (const component of components) {
    totals.set(component.morphId, (totals.get(component.morphId) ?? 0) + (component.copies ?? 1));
  }
  return totals.entries();
}

function makeSignatureKey(entries: Iterable<[string, number]>): string {
  return [...entries]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([geneId, copies]) => `${geneId}:${copies}`)
    .join("|");
}

function getAllRecognisedCombinations(): MorphDefinition[] {
  const all = [...getCombinations(), ...calculatorNamedCombinations];
  const seen = new Set<string>();
  return all.filter((morph) => {
    if (seen.has(morph.geneId)) return false;
    seen.add(morph.geneId);
    return true;
  });
}

function matchesCombination(loci: Map<string, number>, combination: MorphDefinition): boolean {
  const expected = expandMorphToComponents(combination);
  const expectedKey = makeSignatureKey(componentSignature(expected));
  const actual = [...loci.entries()].filter(([, copies]) => copies > 0);
  return makeSignatureKey(actual) === expectedKey;
}

function getCombinationForLoci(loci: Map<string, number>): MorphDefinition | undefined {
  if (![...loci.values()].some((copies) => copies > 0)) return undefined;
  return getAllRecognisedCombinations().find((combination) => matchesCombination(loci, combination));
}

function buildFallbackName(visualComponents: OffspringComponent[]): string {
  if (visualComponents.length === 0) return "Normal";
  return visualComponents.map((component) => {
    if (component.state === "Super") {
      const morph = getDefinition(component.geneId);
      if (morph?.superFormId) {
        const superMorph = getDefinition(morph.superFormId);
        if (superMorph) return superMorph.name;
      }
      return `Super ${component.name}`;
    }
    return component.name;
  }).join(" + ");
}

function getPossibleHetComponents(loci: Map<string, number>): OffspringComponent[] {
  // Exact Mendelian outcomes have a known genotype. A copy-0 offspring is
  // CLEAR, not "Possible Het", and we must not manufacture carrier claims.
  // Future uncertain-data modelling can add probability-based carrier states
  // without corrupting these exact outcomes.
  void loci;
  return [];
}

function buildResultId(visualComponents: OffspringComponent[], hetComponents: OffspringComponent[], possibleHetComponents: OffspringComponent[]): string {
  const visual = visualComponents.map((component) => `${component.geneId}:${component.copies}`).sort().join(",");
  const het = hetComponents.map((component) => `${component.geneId}:${component.copies}`).sort().join(",");
  const possible = possibleHetComponents.map((component) => component.geneId).sort().join(",");
  return [visual, het, possible].join("|");
}

function buildOffspringResult(outcome: InternalOutcome): OffspringResult {
  const visualComponents = getVisualComponents(outcome.loci);
  const hetComponents = getHetComponents(outcome.loci);
  const possibleHetComponents = getPossibleHetComponents(outcome.loci);
  const combination = getCombinationForLoci(outcome.loci);
  return {
    id: buildResultId(visualComponents, hetComponents, possibleHetComponents),
    name: combination?.name ?? buildFallbackName(visualComponents),
    percentage: outcome.probability,
    visualComponents,
    hetComponents,
    possibleHetComponents,
    recognisedCombination: Boolean(combination),
    combination,
    hasUnresolvedGenetics: false,
  };
}

function mergeOffspringResults(results: OffspringResult[]): OffspringResult[] {
  const map = new Map<string, OffspringResult>();
  for (const result of results) {
    const existing = map.get(result.id);
    if (!existing) {
      map.set(result.id, {
        ...result,
        visualComponents: [...result.visualComponents],
        hetComponents: [...result.hetComponents],
        possibleHetComponents: [...result.possibleHetComponents],
      });
    } else existing.percentage += result.percentage;
  }
  return [...map.values()].sort((a, b) => b.percentage - a.percentage);
}

function ensureNormalResult(results: OffspringResult[]): OffspringResult[] {
  const normal = results.find((result) => result.visualComponents.length === 0 && result.hetComponents.length === 0 && result.possibleHetComponents.length === 0);
  if (normal) normal.name = "Normal";
  return results;
}

export function calculateGenetics(input: GeneticsCalculatorInput): GeneticsCalculatorResult {
  const loci = buildLoci(input);
  const internalOutcomes = combineLocusOutcomes(loci);
  const results = internalOutcomes.map(buildOffspringResult);
  const merged = ensureNormalResult(mergeOffspringResults(results));
  return {
    input,
    offspring: merged,
    hasUnresolvedGenetics: merged.some((result) => result.hasUnresolvedGenetics),
  };
}

export function calculateBreeding(female: ParentGenetics, male: ParentGenetics): GeneticsCalculatorResult {
  return calculateGenetics({ female, male });
}

export function getBreedingSummary(result: GeneticsCalculatorResult): BreedingSummary {
  const visualOutcomes = result.offspring.filter((offspring) => offspring.visualComponents.length > 0);
  const combinations = result.offspring
    .filter((offspring) => offspring.recognisedCombination && offspring.combination)
    .map((offspring) => ({
      combination: offspring.combination!,
      percentage: offspring.percentage,
      underlyingComponents: [...offspring.visualComponents],
    }));

  const hetByGene = new Map<string, { name: string; percentage: number }>();
  for (const offspring of result.offspring) {
    for (const component of offspring.hetComponents) {
      const existing = hetByGene.get(component.geneId);
      if (!existing) hetByGene.set(component.geneId, { name: component.name, percentage: offspring.percentage });
      else existing.percentage += offspring.percentage;
    }
  }

  const hetOutcomes: HetResult[] = [...hetByGene.entries()]
    .map(([geneId, value]) => ({
      geneId,
      name: value.name,
      percentage: value.percentage,
      certainty: value.percentage >= 99.999999 ? "Confirmed" as const : "Possible" as const,
    }))
    .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));

  return {
    outcomeCount: result.offspring.length,
    visualOutcomes,
    hetOutcomes,
    combinations,
    hasUnresolvedGenetics: result.hasUnresolvedGenetics,
  };
}

export function calculateSingleGene(geneId: string, motherCopies: 0 | 1 | 2, fatherCopies: 0 | 1 | 2): LocusOutcome[] {
  return calculateLocus({
    geneId,
    mother: createKnownState(geneId, motherCopies),
    father: createKnownState(geneId, fatherCopies),
  });
}

export function debugGeneticsCalculation(input: GeneticsCalculatorInput) {
  const loci = buildLoci(input);
  const internal = combineLocusOutcomes(loci);
  const result = calculateGenetics(input);
  return { input, loci, internalOutcomes: internal, offspring: result.offspring, summary: getBreedingSummary(result) };
}