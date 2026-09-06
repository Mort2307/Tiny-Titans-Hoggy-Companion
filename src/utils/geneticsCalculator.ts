// ============================================================
// TINY TITANS — SPECIES-AWARE GENETICS CALCULATOR ENGINE
// ============================================================
// Mendelian probability engine. Species identity, aliases, recognised
// combinations and inheritance definitions are resolved through the
// species-scoped canonical genetics layer. Combination names are phenotype
// labels; they are never treated as independent loci.
// ============================================================

import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import { findCanonicalMorphForComposition } from "./canonicalGenetics";
import {
  findSpeciesCanonicalMorphForComposition,
  getSpeciesGeneticDefinition,
  resolveSpeciesGenetics,
} from "../data/species/speciesGenetics";
import { getGeneId } from "./geneticsIdentity";
import type { MorphComponent } from "../data/morphs";
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

type AlleleState = { geneId: string; copies: 0 | 1 | 2; mutationAlleleProbability: number; unresolved?: boolean };
type ParentLocus = { geneId: string; mother: AlleleState; father: AlleleState };
type LocusOutcome = { geneId: string; copies: 0 | 1 | 2; probability: number };
type InternalOutcome = { loci: Map<string, number>; probability: number; unresolved: boolean };
const EPSILON = 0.000001;

function getDefinition(geneId: string, speciesId?: string | null): MasterMorphDefinition | undefined {
  if (speciesId && speciesId !== "heterodon-nasicus") return getSpeciesGeneticDefinition(speciesId, geneId);
  return masterMorphs.find((morph) => morph.geneId === geneId);
}

function clampProbability(value: number): number { return Math.min(1, Math.max(0, value)); }
function getHetProbabilityAsParentAlleleProbability(percentage: HetPercentage): number {
  if (percentage === "66%" || percentage === 66) return 1 / 3;
  if (percentage === "50%" || percentage === 50) return 1 / 4;
  return 1 / 2;
}
function getVisualGeneCopies(morph: MasterMorphDefinition): 0 | 1 | 2 { return morph.inheritance === "Recessive" ? 2 : 1; }
function createKnownState(geneId: string, copies: 0 | 1 | 2, probabilityOverride?: number): AlleleState { return { geneId, copies, mutationAlleleProbability: probabilityOverride ?? copies / 2 }; }

function getParentAlleleStates(parent: ParentGenetics, speciesId?: string | null): Map<string, AlleleState> {
  const states = new Map<string, AlleleState>();
  for (const value of parent.morphs) {
    const resolution = resolveSpeciesGenetics(speciesId, value);
    if (!resolution.morph || resolution.components.length === 0) {
      for (const unresolved of resolution.unresolvedComponents) {
        const unresolvedId = `unresolved:${unresolved.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        states.set(unresolvedId, { ...createKnownState(unresolvedId, 0), unresolved: true });
      }
      continue;
    }
    for (const component of resolution.components) {
      const definition = getDefinition(component.morphId, speciesId);
      if (!definition?.isGene || definition.kind !== "Gene") continue;
      const copies = Math.min(2, Math.max(0, component.copies ?? 1)) as 0 | 1 | 2;
      const standalone = resolution.morph.kind === "Gene" && resolution.morph.geneId === definition.geneId;
      const effectiveCopies = standalone ? getVisualGeneCopies(definition) : copies;
      const existing = states.get(definition.geneId);
      const mergedCopies = Math.min(2, (existing?.copies ?? 0) + effectiveCopies) as 0 | 1 | 2;
      states.set(definition.geneId, createKnownState(definition.geneId, mergedCopies));
    }
    for (const unresolved of resolution.unresolvedComponents) {
      const unresolvedId = `unresolved:${unresolved.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      states.set(unresolvedId, { ...createKnownState(unresolvedId, 0), unresolved: true });
    }
  }
  for (const entry of parent.hets) {
    const value = entry.geneId ?? entry.gene;
    const morph = getSpeciesGeneticDefinition(speciesId, value) ?? getSpeciesGeneticDefinition(speciesId, getGeneId(value) ?? value);
    if (!morph?.isGene || morph.kind !== "Gene" || !morph.hetPossible) continue;
    const geneId = morph.geneId;
    const percentage = parent.hetPercentages?.[geneId] ?? entry.percentage ?? "100%";
    const existing = states.get(geneId);
    if (existing?.copies === 2) continue;
    states.set(geneId, createKnownState(geneId, 1, clampProbability(getHetProbabilityAsParentAlleleProbability(percentage))));
  }
  return states;
}

function buildLoci(input: GeneticsCalculatorInput): ParentLocus[] {
  const mother = getParentAlleleStates(input.female, input.speciesId);
  const father = getParentAlleleStates(input.male, input.speciesId);
  const geneIds = new Set([...mother.keys(), ...father.keys()]);
  return [...geneIds].map((geneId) => ({ geneId, mother: mother.get(geneId) ?? createKnownState(geneId, 0), father: father.get(geneId) ?? createKnownState(geneId, 0) }));
}
function calculateLocus(locus: ParentLocus): LocusOutcome[] {
  const motherMutation = clampProbability(locus.mother.mutationAlleleProbability);
  const fatherMutation = clampProbability(locus.father.mutationAlleleProbability);
  const outcomes = new Map<0 | 1 | 2, number>();
  const normalNormal = (1 - motherMutation) * (1 - fatherMutation);
  const motherMutant = motherMutation * (1 - fatherMutation);
  const fatherMutant = (1 - motherMutation) * fatherMutation;
  const bothMutant = motherMutation * fatherMutation;
  if (normalNormal > EPSILON) outcomes.set(0, normalNormal);
  if (motherMutant + fatherMutant > EPSILON) outcomes.set(1, motherMutant + fatherMutant);
  if (bothMutant > EPSILON) outcomes.set(2, bothMutant);
  return [...outcomes.entries()].map(([copies, probability]) => ({ geneId: locus.geneId, copies, probability: probability * 100 }));
}
function internalOutcomeKey(outcome: InternalOutcome): string { return [...outcome.loci.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([geneId, copies]) => `${geneId}:${copies}`).join("|"); }
function mergeInternalOutcomes(outcomes: InternalOutcome[]): InternalOutcome[] {
  const map = new Map<string, InternalOutcome>();
  for (const outcome of outcomes) {
    const key = internalOutcomeKey(outcome);
    const existing = map.get(key);
    if (!existing) map.set(key, { loci: new Map(outcome.loci), probability: outcome.probability, unresolved: outcome.unresolved });
    else { existing.probability += outcome.probability; existing.unresolved ||= outcome.unresolved; }
  }
  return [...map.values()];
}
function combineLocusOutcomes(loci: ParentLocus[]): InternalOutcome[] {
  let outcomes: InternalOutcome[] = [{ loci: new Map(), probability: 100, unresolved: false }];
  for (const locus of loci) {
    const next: InternalOutcome[] = [];
    for (const existing of outcomes) for (const locusOutcome of calculateLocus(locus)) {
      const probability = existing.probability * locusOutcome.probability / 100;
      if (probability <= EPSILON) continue;
      const lociMap = new Map(existing.loci);
      lociMap.set(locusOutcome.geneId, locusOutcome.copies);
      next.push({ loci: lociMap, probability, unresolved: existing.unresolved || Boolean(locus.mother.unresolved || locus.father.unresolved) });
    }
    outcomes = mergeInternalOutcomes(next);
  }
  return outcomes;
}
function getLocusState(morph: MasterMorphDefinition, copies: number): "Clear" | "Het" | "Visual" | "Super" {
  if (copies <= 0) return "Clear";
  if (morph.inheritance === "Recessive") return copies >= 2 ? "Visual" : "Het";
  if (morph.inheritance === "Incomplete Dominant") return copies >= 2 ? "Super" : "Visual";
  if (morph.inheritance === "Dominant") return "Visual";
  return "Clear";
}
function buildComponent(geneId: string, copies: number, speciesId?: string | null): OffspringComponent | undefined { const morph = getDefinition(geneId, speciesId); if (!morph || copies <= 0) return undefined; return { geneId, name: morph.name, copies, state: getLocusState(morph, copies) }; }
function getVisualComponents(loci: Map<string, number>, speciesId?: string | null): OffspringComponent[] { const components: OffspringComponent[] = []; for (const [geneId, copies] of loci) { const component = buildComponent(geneId, copies, speciesId); if (component?.state === "Visual" || component?.state === "Super") components.push(component); } return components.sort((a, b) => a.name.localeCompare(b.name)); }
function getHetComponents(loci: Map<string, number>, speciesId?: string | null): OffspringComponent[] { const components: OffspringComponent[] = []; for (const [geneId, copies] of loci) { const component = buildComponent(geneId, copies, speciesId); if (component?.state === "Het") components.push(component); } return components.sort((a, b) => a.name.localeCompare(b.name)); }
function getRecognisedCombinationForLoci(loci: Map<string, number>, speciesId?: string | null): MasterMorphDefinition | undefined {
  const components: MorphComponent[] = [...loci.entries()].filter(([, copies]) => copies > 0).map(([morphId, copies]) => ({ morphId, type: "Gene", copies }));
  return speciesId ? findSpeciesCanonicalMorphForComposition(speciesId, components) : findCanonicalMorphForComposition(components);
}
function buildFallbackName(visualComponents: OffspringComponent[]): string { return visualComponents.length ? visualComponents.map((component) => component.state === "Super" ? `Super ${component.name}` : component.name).join(" + ") : "Normal"; }
function getPossibleHetComponents(_loci: Map<string, number>): OffspringComponent[] { return []; }
function buildResultId(visual: OffspringComponent[], het: OffspringComponent[], possible: OffspringComponent[]): string { return [visual.map((item) => `${item.geneId}:${item.copies}`).sort().join(","), het.map((item) => `${item.geneId}:${item.copies}`).sort().join(","), possible.map((item) => item.geneId).sort().join(",")].join("|"); }
function buildOffspringResult(outcome: InternalOutcome, speciesId?: string | null): OffspringResult { const visualComponents = getVisualComponents(outcome.loci, speciesId); const hetComponents = getHetComponents(outcome.loci, speciesId); const possibleHetComponents = getPossibleHetComponents(outcome.loci); const combination = getRecognisedCombinationForLoci(outcome.loci, speciesId); return { id: buildResultId(visualComponents, hetComponents, possibleHetComponents), name: combination?.name ?? buildFallbackName(visualComponents), percentage: outcome.probability, visualComponents, hetComponents, possibleHetComponents, recognisedCombination: Boolean(combination), combination, hasUnresolvedGenetics: outcome.unresolved }; }
function mergeOffspringResults(results: OffspringResult[]): OffspringResult[] { const map = new Map<string, OffspringResult>(); for (const result of results) { const existing = map.get(result.id); if (!existing) map.set(result.id, { ...result, visualComponents: [...result.visualComponents], hetComponents: [...result.hetComponents], possibleHetComponents: [...result.possibleHetComponents] }); else { existing.percentage += result.percentage; existing.hasUnresolvedGenetics ||= result.hasUnresolvedGenetics; } } return [...map.values()].sort((a, b) => b.percentage - a.percentage); }
function ensureNormalResult(results: OffspringResult[]): OffspringResult[] { const normal = results.find((result) => result.visualComponents.length === 0 && result.hetComponents.length === 0 && result.possibleHetComponents.length === 0); if (normal) normal.name = "Normal"; return results; }
export function calculateGenetics(input: GeneticsCalculatorInput): GeneticsCalculatorResult { const merged = ensureNormalResult(mergeOffspringResults(combineLocusOutcomes(buildLoci(input)).map((outcome) => buildOffspringResult(outcome, input.speciesId)))); return { input, offspring: merged, hasUnresolvedGenetics: merged.some((result) => result.hasUnresolvedGenetics) }; }
export function calculateBreeding(female: ParentGenetics, male: ParentGenetics, speciesId?: string | null): GeneticsCalculatorResult { return calculateGenetics({ female, male, speciesId }); }
export function getBreedingSummary(result: GeneticsCalculatorResult): BreedingSummary { const visualOutcomes = result.offspring.filter((offspring) => offspring.visualComponents.length > 0); const combinations = result.offspring.filter((offspring) => offspring.recognisedCombination && offspring.combination).map((offspring) => ({ combination: offspring.combination!, percentage: offspring.percentage, underlyingComponents: [...offspring.visualComponents] })); const hetByGene = new Map<string, { name: string; percentage: number }>(); for (const offspring of result.offspring) for (const component of offspring.hetComponents) { const existing = hetByGene.get(component.geneId); if (!existing) hetByGene.set(component.geneId, { name: component.name, percentage: offspring.percentage }); else existing.percentage += offspring.percentage; } const hetOutcomes: HetResult[] = [...hetByGene.entries()].map(([geneId, value]) => ({ geneId, name: value.name, percentage: value.percentage, certainty: value.percentage >= 99.999999 ? "Confirmed" as const : "Possible" as const })).sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name)); return { outcomeCount: result.offspring.length, visualOutcomes, hetOutcomes, combinations, hasUnresolvedGenetics: result.hasUnresolvedGenetics }; }
export function calculateSingleGene(geneId: string, motherCopies: 0 | 1 | 2, fatherCopies: 0 | 1 | 2, speciesId?: string | null): LocusOutcome[] { const definition = getDefinition(geneId, speciesId); const canonicalGeneId = definition?.geneId ?? geneId; return calculateLocus({ geneId: canonicalGeneId, mother: createKnownState(canonicalGeneId, motherCopies), father: createKnownState(canonicalGeneId, fatherCopies) }); }
export function debugGeneticsCalculation(input: GeneticsCalculatorInput) { const loci = buildLoci(input); const internalOutcomes = combineLocusOutcomes(loci); const result = calculateGenetics(input); return { input, loci, internalOutcomes, offspring: result.offspring, summary: getBreedingSummary(result) }; }
