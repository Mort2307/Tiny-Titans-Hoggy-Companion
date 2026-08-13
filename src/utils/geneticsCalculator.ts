// ============================================================
// TINY TITANS — GENETICS CALCULATOR ENGINE
// ============================================================
// SINGLE SOURCE OF TRUTH FOR OFFSPRING INHERITANCE.
// UI components MUST NOT contain genetics calculations.
// ============================================================

import { getCombinations, getMorphByGeneId, type MorphDefinition } from "../data/morphs";
import { getGeneId, resolveStrictMorph } from "./geneticsIdentity";
import { expandMorphToComponents } from "./morphResolver";
import type {
  GeneticsCalculatorInput,
  GeneticsCalculatorResult,
  OffspringComponent,
  OffspringResult,
  ParentGenetics,
  BreedingSummary,
  HetResult,
} from "../types/genetics";

type AlleleState = { geneId: string; copies: 0 | 1 | 2 };
type ParentLocus = { geneId: string; mother: AlleleState; father: AlleleState };
type LocusOutcome = { geneId: string; copies: 0 | 1 | 2; probability: number };
type InternalOutcome = { loci: Map<string, number>; probability: number };

const PROBABILITY_EPSILON = 0.000001;

function getDefinition(geneId: string): MorphDefinition | undefined {
  return getMorphByGeneId(geneId);
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

      const copies = Math.min(2, Math.max(0, component.copies ?? 1)) as 0 | 1 | 2;
      const existing = states.get(geneId);
      if (!existing) {
        states.set(geneId, { geneId, copies });
      } else {
        existing.copies = Math.min(2, existing.copies + copies) as 0 | 1 | 2;
      }
    }
  }

  for (const value of parent.hets) {
    const geneId = getGeneId(value);
    if (!geneId) continue;
    const morph = getDefinition(geneId);
    if (!morph || !morph.isGene || morph.kind !== "Gene" || !morph.hetPossible) continue;

    const existing = states.get(geneId);
    if (existing?.copies === 2) continue;
    if (!existing) states.set(geneId, { geneId, copies: 1 });
    else existing.copies = Math.max(existing.copies, 1) as 0 | 1 | 2;
  }

  return states;
}

function buildLoci(input: GeneticsCalculatorInput): ParentLocus[] {
  const mother = getParentAlleleStates(input.female);
  const father = getParentAlleleStates(input.male);
  const geneIds = new Set([...mother.keys(), ...father.keys()]);
  return Array.from(geneIds).map((geneId) => ({
    geneId,
    mother: mother.get(geneId) ?? { geneId, copies: 0 },
    father: father.get(geneId) ?? { geneId, copies: 0 },
  }));
}

function getMutationAlleleProbability(copies: 0 | 1 | 2): number {
  if (copies === 0) return 0;
  if (copies === 1) return 0.5;
  return 1;
}

function calculateLocus(locus: ParentLocus): LocusOutcome[] {
  const motherMutation = getMutationAlleleProbability(locus.mother.copies);
  const fatherMutation = getMutationAlleleProbability(locus.father.copies);
  const outcomes = new Map<0 | 1 | 2, number>();

  const normalNormal = (1 - motherMutation) * (1 - fatherMutation);
  if (normalNormal > PROBABILITY_EPSILON) outcomes.set(0, normalNormal);

  const motherMutant = motherMutation * (1 - fatherMutation);
  if (motherMutant > PROBABILITY_EPSILON) outcomes.set(1, (outcomes.get(1) ?? 0) + motherMutant);

  const fatherMutant = (1 - motherMutation) * fatherMutation;
  if (fatherMutant > PROBABILITY_EPSILON) outcomes.set(1, (outcomes.get(1) ?? 0) + fatherMutant);

  const bothMutant = motherMutation * fatherMutation;
  if (bothMutant > PROBABILITY_EPSILON) outcomes.set(2, bothMutant);

  return Array.from(outcomes.entries()).map(([copies, probability]) => ({ geneId: locus.geneId, copies, probability: probability * 100 }));
}

function internalOutcomeKey(outcome: InternalOutcome): string {
  return Array.from(outcome.loci.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([geneId, copies]) => `${geneId}:${copies}`).join("|");
}

function mergeInternalOutcomes(outcomes: InternalOutcome[]): InternalOutcome[] {
  const map = new Map<string, InternalOutcome>();
  for (const outcome of outcomes) {
    const key = internalOutcomeKey(outcome);
    const existing = map.get(key);
    if (!existing) map.set(key, { loci: new Map(outcome.loci), probability: outcome.probability });
    else existing.probability += outcome.probability;
  }
  return Array.from(map.values());
}

function combineLocusOutcomes(loci: ParentLocus[]): InternalOutcome[] {
  let outcomes: InternalOutcome[] = [{ loci: new Map(), probability: 100 }];
  for (const locus of loci) {
    const next: InternalOutcome[] = [];
    for (const existing of outcomes) {
      for (const locusOutcome of calculateLocus(locus)) {
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

function getLocusState(morph: MorphDefinition, copies: number): "Clear" | "Het" | "Visual" | "Super" | "Unknown" {
  if (copies <= 0) return "Clear";
  if (morph.verification !== "Confirmed" && morph.verification !== "Recognised") return "Unknown";

  if (morph.inheritance === "Recessive") return copies >= 2 ? "Visual" : "Het";
  if (morph.inheritance === "Incomplete Dominant") {
    if (copies === 1) return "Visual";
    const superForm = morph.superFormId ? getDefinition(morph.superFormId) : undefined;
    return superForm && (superForm.verification === "Confirmed" || superForm.verification === "Recognised") ? "Super" : "Unknown";
  }
  if (morph.inheritance === "Dominant") return "Visual";
  return "Unknown";
}

function buildComponent(geneId: string, copies: number): OffspringComponent | undefined {
  const morph = getDefinition(geneId);
  if (!morph || copies <= 0) return undefined;
  return { geneId, name: morph.name, copies, state: getLocusState(morph, copies) };
}

function getVisualComponents(loci: Map<string, number>): OffspringComponent[] {
  return Array.from(loci.entries()).map(([geneId, copies]) => buildComponent(geneId, copies)).filter((component): component is OffspringComponent => Boolean(component) && (component.state === "Visual" || component.state === "Super")).sort((a, b) => a.name.localeCompare(b.name));
}

function getHetComponents(loci: Map<string, number>): OffspringComponent[] {
  return Array.from(loci.entries()).map(([geneId, copies]) => buildComponent(geneId, copies)).filter((component): component is OffspringComponent => Boolean(component) && component.state === "Het").sort((a, b) => a.name.localeCompare(b.name));
}

function getUnresolvedComponents(loci: Map<string, number>): OffspringComponent[] {
  return Array.from(loci.entries()).map(([geneId, copies]) => buildComponent(geneId, copies)).filter((component): component is OffspringComponent => Boolean(component) && component.state === "Unknown");
}

function getCombinationForLoci(loci: Map<string, number>): MorphDefinition | undefined {
  if (!Array.from(loci.values()).some((copies) => copies > 0)) return undefined;
  for (const combination of getCombinations()) {
    if (combination.verification !== "Confirmed" && combination.verification !== "Recognised") continue;
    if (matchesCombination(loci, combination)) return combination;
  }
  return undefined;
}

function matchesCombination(loci: Map<string, number>, combination: MorphDefinition): boolean {
  const expectedMap = new Map<string, number>();
  for (const component of expandMorphToComponents(combination)) expectedMap.set(component.morphId, (expectedMap.get(component.morphId) ?? 0) + (component.copies ?? 1));

  const actualMap = new Map<string, number>();
  for (const [geneId, copies] of loci) if (copies > 0) actualMap.set(geneId, copies);
  if (actualMap.size !== expectedMap.size) return false;
  for (const [geneId, copies] of expectedMap) if (actualMap.get(geneId) !== copies) return false;
  return true;
}

function buildFallbackName(visualComponents: OffspringComponent[]): string {
  if (visualComponents.length === 0) return "Normal";
  return visualComponents.map((component) => component.name).join(" + ");
}

function getPossibleHetComponents(loci: Map<string, number>): OffspringComponent[] {
  return Array.from(loci.entries()).map(([geneId, copies]) => {
    const morph = getDefinition(geneId);
    if (!morph || !morph.hetPossible || copies !== 0) return undefined;
    return buildComponent(geneId, 1);
  }).filter((component): component is OffspringComponent => Boolean(component));
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
  const unresolvedComponents = getUnresolvedComponents(outcome.loci);
  const combination = unresolvedComponents.length === 0 ? getCombinationForLoci(outcome.loci) : undefined;
  const hasUnresolvedGenetics = unresolvedComponents.length > 0;

  return {
    id: buildResultId(visualComponents, hetComponents, possibleHetComponents),
    name: hasUnresolvedGenetics ? "Unresolved genetics" : combination?.name ?? buildFallbackName(visualComponents),
    percentage: outcome.probability,
    visualComponents,
    hetComponents,
    possibleHetComponents,
    recognisedCombination: Boolean(combination),
    combination,
    hasUnresolvedGenetics,
  };
}

function mergeOffspringResults(results: OffspringResult[]): OffspringResult[] {
  const map = new Map<string, OffspringResult>();
  for (const result of results) {
    const existing = map.get(result.id);
    if (!existing) {
      map.set(result.id, { ...result, visualComponents: [...result.visualComponents], hetComponents: [...result.hetComponents], possibleHetComponents: [...result.possibleHetComponents] });
    } else {
      existing.percentage += result.percentage;
      existing.hasUnresolvedGenetics = existing.hasUnresolvedGenetics || result.hasUnresolvedGenetics;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.percentage - a.percentage);
}

function ensureNormalResult(results: OffspringResult[]): OffspringResult[] {
  const normal = results.find((result) => result.visualComponents.length === 0 && result.hetComponents.length === 0 && result.possibleHetComponents.length === 0 && !result.hasUnresolvedGenetics);
  if (normal) normal.name = "Normal";
  return results;
}

export function calculateGenetics(input: GeneticsCalculatorInput): GeneticsCalculatorResult {
  const loci = buildLoci(input);
  const internalOutcomes = combineLocusOutcomes(loci);
  const results = ensureNormalResult(mergeOffspringResults(internalOutcomes.map(buildOffspringResult)));
  return { input, offspring: results, hasUnresolvedGenetics: results.some((result) => result.hasUnresolvedGenetics) };
}

export function calculateBreeding(female: ParentGenetics, male: ParentGenetics): GeneticsCalculatorResult {
  return calculateGenetics({ female, male });
}

function getHetProbability(percentage: number): 50 | 66 | 100 | undefined {
  if (Math.abs(percentage - 100) < PROBABILITY_EPSILON) return 100;
  if (Math.abs(percentage - 66.6666667) < 0.1) return 66;
  if (Math.abs(percentage - 50) < PROBABILITY_EPSILON) return 50;
  return undefined;
}

export function getBreedingSummary(result: GeneticsCalculatorResult): BreedingSummary {
  const visualOutcomes = result.offspring.filter((offspring) => offspring.visualComponents.length > 0);
  const combinations = result.offspring.filter((offspring) => offspring.recognisedCombination && offspring.combination).map((offspring) => ({ combination: offspring.combination!, percentage: offspring.percentage, underlyingComponents: [...offspring.visualComponents] }));
  const hetOutcomes: HetResult[] = [];

  for (const offspring of result.offspring) {
    for (const component of offspring.hetComponents) {
      const percentage = getHetProbability(offspring.percentage);
      if (percentage === undefined) continue;
      hetOutcomes.push({ geneId: component.geneId, name: component.name, percentage, certainty: "Confirmed" });
    }
  }

  return { outcomeCount: result.offspring.length, visualOutcomes, hetOutcomes, combinations, hasUnresolvedGenetics: result.hasUnresolvedGenetics };
}

export function calculateSingleGene(geneId: string, motherCopies: 0 | 1 | 2, fatherCopies: 0 | 1 | 2): LocusOutcome[] {
  return calculateLocus({ geneId, mother: { geneId, copies: motherCopies }, father: { geneId, copies: fatherCopies } });
}

export function debugGeneticsCalculation(input: GeneticsCalculatorInput) {
  const loci = buildLoci(input);
  const internal = combineLocusOutcomes(loci);
  const result = calculateGenetics(input);
  return { input, loci, internalOutcomes: internal, offspring: result.offspring, summary: getBreedingSummary(result) };
}
