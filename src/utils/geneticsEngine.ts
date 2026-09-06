// ============================================================
// TINY TITANS — GENETICS ENGINE
// ============================================================
//
// Core inheritance calculation engine.
//
// The engine deliberately separates:
//   1. species-scoped identity / evidence resolution
//   2. inheritance mechanics
//   3. recognised combination presentation
//
// Legacy callers may omit speciesId and continue using the original
// Hognose database. Species-aware callers must provide speciesId on
// the parent records (or use calculateSpeciesGenetics()).
// ============================================================

import {
  getMorphByGeneId,
  resolveUnderlyingGenes,
  type MorphDefinition,
} from "../data/morphs";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";
import {
  getSpeciesCalculatorMorph,
  getSpeciesCalculatorMorphs,
  resolveSpeciesMorph,
  resolveSpeciesUnderlyingGenes,
} from "../data/species/speciesGeneticsResolver";
import { resolveStrictMorph, type HetPercentage } from "./geneticsIdentity";

export type ParentGeneState = {
  geneId: string;
  copies: number;
  visual: boolean;
  probability: number;
};

export type ParentGenetics = {
  visualMorphs: string[];
  hets: Array<{ gene: string; percentage: HetPercentage }>;
  /** Species id for species-scoped genetics. Legacy Hognose calls may omit it. */
  speciesId?: string;
  /** Explicitly known copy count for a visually expressed locus. */
  knownGeneCopies?: Record<string, 1 | 2>;
};

export type Gamete = { geneId: string; copies: number; probability: number };
export type OffspringGeneState = { geneId: string; copies: number; probability: number };

export type GeneticsOutcome = {
  probability: number;
  visualMorphs: string[];
  hets: Array<{ geneId: string; name: string; percentage: HetPercentage }>;
  geneStates: OffspringGeneState[];
};

export type GeneticsCalculation = {
  outcomes: GeneticsOutcome[];
  totalProbability: number;
  diagnostics?: string[];
};

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[×✕]/g, "x").replace(/\s+/g, " ");
}

function roundProbability(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hetPercentageToProbability(percentage: HetPercentage): number {
  switch (percentage) {
    case "100%": return 1;
    case "66%": return 0.66;
    case "50%": return 0.5;
    default: return 0;
  }
}

function resolveLegacyMorph(value: string): MorphDefinition | undefined {
  return resolveStrictMorph(value) ?? getMorphByGeneId(value);
}

function resolveScopedMorph(speciesId: string | undefined, value: string): MorphDefinition | undefined {
  if (!speciesId) return resolveLegacyMorph(value);
  return resolveSpeciesMorph(speciesId, value);
}

function getMorph(geneId: string, speciesId?: string): MorphDefinition | undefined {
  if (speciesId) return getSpeciesCalculatorMorph(speciesId, geneId);
  return getMorphByGeneId(geneId);
}

function resolveParentSpecies(mother: ParentGenetics, father: ParentGenetics): string | undefined {
  if (mother.speciesId && father.speciesId && mother.speciesId !== father.speciesId) return undefined;
  return mother.speciesId ?? father.speciesId;
}

function getKnownCopies(parent: ParentGenetics, geneId: string, fallback: number): number {
  const explicit = parent.knownGeneCopies?.[geneId];
  return explicit ?? fallback;
}

export function buildParentGeneStates(parent: ParentGenetics): ParentGeneState[] {
  const speciesId = parent.speciesId;
  const states = new Map<string, ParentGeneState>();

  for (const morphValue of parent.visualMorphs) {
    const underlying = speciesId
      ? resolveSpeciesUnderlyingGenes(speciesId, morphValue)
      : resolveUnderlyingGenes(morphValue);

    const resolvedVisual = resolveScopedMorph(speciesId, morphValue);
    if (!underlying.length) {
      if (resolvedVisual?.kind === "Gene" && !resolvedVisual.isGene) continue;
      continue;
    }

    for (const component of underlying) {
      const morph = getMorph(component.morphId, speciesId);
      if (!morph || !morph.isGene || morph.kind !== "Gene") continue;

      const defaultCopies = component.copies ?? 1;
      const copies = getKnownCopies(parent, morph.geneId, defaultCopies);
      const existing = states.get(morph.geneId);
      if (!existing) {
        states.set(morph.geneId, {
          geneId: morph.geneId,
          copies,
          visual: true,
          probability: 1,
        });
        continue;
      }

      existing.copies = Math.max(existing.copies, copies);
      existing.visual = true;
    }
  }

  for (const het of parent.hets) {
    const resolved = resolveScopedMorph(speciesId, het.gene);
    if (!resolved?.isGene || resolved.kind !== "Gene") continue;
    if (speciesId && !getSpeciesCalculatorMorph(speciesId, resolved.geneId)) continue;

    const geneId = resolved.geneId;
    const probability = hetPercentageToProbability(het.percentage);
    const existing = states.get(geneId);
    if (!existing) {
      states.set(geneId, { geneId, copies: 1, visual: false, probability });
      continue;
    }

    if (existing.copies >= 2) {
      existing.probability = 1;
      continue;
    }

    existing.copies = Math.max(existing.copies, 1);
    existing.probability = Math.max(existing.probability, probability);
  }

  return Array.from(states.values());
}

export function getParentGeneState(parent: ParentGenetics, geneId: string): ParentGeneState {
  return buildParentGeneStates(parent).find((state) => state.geneId === geneId) ?? {
    geneId,
    copies: 0,
    visual: false,
    probability: 1,
  };
}

export function generateGametes(state: ParentGeneState): Gamete[] {
  if (state.copies <= 0) {
    return [{ geneId: state.geneId, copies: 0, probability: 1 }];
  }

  if (state.copies >= 2) {
    return [{
      geneId: state.geneId,
      copies: 1,
      probability: clampProbability(state.probability),
    }];
  }

  return [
    { geneId: state.geneId, copies: 1, probability: clampProbability(state.probability * 0.5) },
    { geneId: state.geneId, copies: 0, probability: clampProbability(state.probability * 0.5) },
  ];
}

function combineGametes(mother: Gamete, father: Gamete): OffspringGeneState {
  return {
    geneId: mother.geneId,
    copies: mother.copies + father.copies,
    probability: mother.probability * father.probability,
  };
}

function collectRelevantGeneIds(mother: ParentGenetics, father: ParentGenetics): string[] {
  const speciesId = resolveParentSpecies(mother, father);
  const ids = new Set<string>();

  for (const parent of [mother, father]) {
    for (const morphValue of parent.visualMorphs) {
      const underlying = speciesId
        ? resolveSpeciesUnderlyingGenes(speciesId, morphValue)
        : resolveUnderlyingGenes(morphValue);
      for (const component of underlying) {
        const morph = getMorph(component.morphId, speciesId);
        if (morph?.isGene && morph.kind === "Gene") ids.add(component.morphId);
      }
    }

    for (const het of parent.hets) {
      const resolved = resolveScopedMorph(speciesId, het.gene);
      if (resolved?.isGene && resolved.kind === "Gene" && (!speciesId || getSpeciesCalculatorMorph(speciesId, resolved.geneId))) {
        ids.add(resolved.geneId);
      }
    }
  }

  return Array.from(ids);
}

type GeneCrossOutcome = { copies: number; probability: number };

export function calculateGeneCross(
  motherState: ParentGeneState,
  fatherState: ParentGeneState,
): GeneCrossOutcome[] {
  const motherGametes = generateGametes(motherState);
  const fatherGametes = generateGametes(fatherState);
  const outcomes = new Map<number, number>();

  for (const motherGamete of motherGametes) {
    for (const fatherGamete of fatherGametes) {
      const combined = combineGametes(motherGamete, fatherGamete);
      outcomes.set(combined.copies, (outcomes.get(combined.copies) ?? 0) + combined.probability);
    }
  }

  return Array.from(outcomes.entries())
    .map(([copies, probability]) => ({ copies, probability: roundProbability(probability) }))
    .sort((a, b) => a.copies - b.copies);
}

function isRecessiveVisual(morph: MorphDefinition, copies: number): boolean {
  return morph.inheritance === "Recessive" && copies >= 2;
}

function getIncompleteDominantVisual(morph: MorphDefinition, copies: number): string | undefined {
  if (morph.inheritance !== "Incomplete Dominant") return undefined;
  if (copies >= 2) return morph.superFormId ?? morph.geneId;
  if (copies === 1) return morph.geneId;
  return undefined;
}

export function resolveGenePhenotype(geneId: string, copies: number, speciesId?: string): string | undefined {
  const morph = getMorph(geneId, speciesId);
  if (!morph) return undefined;
  if (morph.inheritance === "Recessive") return isRecessiveVisual(morph, copies) ? morph.geneId : undefined;
  if (morph.inheritance === "Incomplete Dominant") return getIncompleteDominantVisual(morph, copies);
  if (morph.inheritance === "Dominant") return copies >= 1 ? morph.geneId : undefined;
  return undefined;
}

function getHetProbabilityFromCopies(morph: MorphDefinition, copies: number): HetPercentage | undefined {
  if (!morph.hetPossible || morph.inheritance !== "Recessive" || copies !== 1) return undefined;
  return "100%";
}

export function resolveSingleGeneOutcome(
  geneId: string,
  copies: number,
  speciesId?: string,
): { visual?: string; het?: HetPercentage } {
  const morph = getMorph(geneId, speciesId);
  if (!morph) return {};

  const visual = resolveGenePhenotype(geneId, copies, speciesId);
  if (visual) return { visual };

  const het = getHetProbabilityFromCopies(morph, copies);
  if (het) return { het };

  return {};
}

function getAllCombinations(): MorphDefinition[] {
  return calculatorNamedCombinations.filter(
    (morph): morph is MorphDefinition => morph.kind === "Combination" && morph.isCombination === true,
  );
}

type CombinationMatch = {
  combinationId: string;
  consumedGeneIds: Set<string>;
  specificity: number;
};

function getCombinationRequirements(morph: MorphDefinition): Map<string, number> {
  const requirements = new Map<string, number>();
  for (const component of morph.components ?? []) {
    const copies = component.copies ?? (component.type === "Super" ? 2 : 1);
    requirements.set(component.morphId, (requirements.get(component.morphId) ?? 0) + copies);
  }
  return requirements;
}

function resolveRecognisedCombination(
  visualGeneIds: string[],
  geneStates: OffspringGeneState[],
  speciesId?: string,
): CombinationMatch | undefined {
  // The current canonical named-combination registry contains Hognose
  // combinations. Do not leak those names into other species calculators.
  if (speciesId && speciesId !== "heterodon-nasicus") return undefined;
  if (!speciesId && visualGeneIds.length === 0) return undefined;

  const available = new Map<string, number>();
  for (const state of geneStates) {
    if (state.copies > 0) available.set(state.geneId, state.copies);
  }

  const candidates: CombinationMatch[] = [];
  for (const morph of getAllCombinations()) {
    const requirements = getCombinationRequirements(morph);
    if (!requirements.size) continue;

    let matches = true;
    const consumedGeneIds = new Set<string>();
    for (const [geneId, requiredCopies] of requirements) {
      const actualCopies = available.get(geneId) ?? 0;
      if (actualCopies < requiredCopies) {
        matches = false;
        break;
      }
      consumedGeneIds.add(geneId);
    }

    if (matches) {
      candidates.push({
        combinationId: morph.geneId,
        consumedGeneIds,
        specificity: Array.from(requirements.values()).reduce((sum, copies) => sum + copies, 0),
      });
    }
  }

  return candidates.sort((a, b) => b.specificity - a.specificity)[0];
}

function getOutcomeKey(outcome: GeneticsOutcome): string {
  const visuals = outcome.visualMorphs.slice().sort().join(",");
  const hets = outcome.hets.map((het) => `${het.geneId}:${het.percentage}`).sort().join(",");
  return `${visuals}|${hets}`;
}

function mergeOutcomes(outcomes: GeneticsOutcome[]): GeneticsOutcome[] {
  const map = new Map<string, GeneticsOutcome>();
  for (const outcome of outcomes) {
    const key = getOutcomeKey(outcome);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...outcome,
        visualMorphs: [...outcome.visualMorphs],
        hets: [...outcome.hets],
        geneStates: [...outcome.geneStates],
      });
      continue;
    }
    existing.probability += outcome.probability;
  }

  return Array.from(map.values())
    .map((outcome) => ({ ...outcome, probability: roundProbability(outcome.probability) }))
    .sort((a, b) => b.probability - a.probability);
}

function resolveSpeciesDiagnostics(mother: ParentGenetics, father: ParentGenetics, speciesId?: string): string[] {
  if (!speciesId) return [];
  const diagnostics: string[] = [];
  const allowed = new Set(getSpeciesCalculatorMorphs(speciesId).map((morph) => morph.geneId));

  for (const [label, parent] of [["mother", mother], ["father", father]] as const) {
    for (const value of parent.visualMorphs) {
      const resolved = resolveSpeciesMorph(speciesId, value);
      if (!resolved) {
        diagnostics.push(`${label}: "${value}" is not recognised in this species genetics registry.`);
        continue;
      }
      if (resolved.kind === "Gene" && resolved.isGene && allowed.has(resolved.geneId)) continue;
      if (resolved.kind === "Super" || resolved.kind === "Combination") {
        const underlying = resolveSpeciesUnderlyingGenes(speciesId, value);
        if (underlying.length && underlying.every((part) => allowed.has(part.morphId))) continue;
      }
      if (resolved.kind === "Gene" && !resolved.isGene) continue;
      diagnostics.push(`${label}: "${resolved.name}" is catalogued but not calculator-eligible for ${speciesId}.`);
    }

    for (const het of parent.hets) {
      const resolved = resolveSpeciesMorph(speciesId, het.gene);
      if (!resolved || !resolved.isGene || resolved.kind !== "Gene" || !allowed.has(resolved.geneId)) {
        diagnostics.push(`${label}: het "${het.gene}" is not calculator-eligible for ${speciesId}.`);
      }
    }
  }

  return diagnostics;
}

export function calculateGenetics(mother: ParentGenetics, father: ParentGenetics): GeneticsCalculation {
  if (mother.speciesId && father.speciesId && mother.speciesId !== father.speciesId) {
    return {
      outcomes: [],
      totalProbability: 0,
      diagnostics: [`Species mismatch: ${mother.speciesId} × ${father.speciesId} cannot be crossed in one species-scoped calculation.`],
    };
  }

  const speciesId = resolveParentSpecies(mother, father);
  const diagnostics = resolveSpeciesDiagnostics(mother, father, speciesId);
  if (diagnostics.length) return { outcomes: [], totalProbability: 0, diagnostics };

  const geneIds = collectRelevantGeneIds(mother, father);
  if (!geneIds.length) return { outcomes: [], totalProbability: 0 };

  let outcomes: GeneticsOutcome[] = [{ probability: 1, visualMorphs: [], hets: [], geneStates: [] }];

  for (const geneId of geneIds) {
    const motherState = getParentGeneState(mother, geneId);
    const fatherState = getParentGeneState(father, geneId);
    const geneCross = calculateGeneCross(motherState, fatherState);
    const next: GeneticsOutcome[] = [];

    for (const existing of outcomes) {
      for (const geneOutcome of geneCross) {
        const geneResult = resolveSingleGeneOutcome(geneId, geneOutcome.copies, speciesId);
        next.push({
          probability: existing.probability * geneOutcome.probability,
          visualMorphs: [...existing.visualMorphs, ...(geneResult.visual ? [geneResult.visual] : [])],
          hets: [
            ...existing.hets,
            ...(geneResult.het ? [{
              geneId,
              name: getMorph(geneId, speciesId)?.name ?? geneId,
              percentage: geneResult.het,
            }] : []),
          ],
          geneStates: [
            ...existing.geneStates,
            { geneId, copies: geneOutcome.copies, probability: geneOutcome.probability },
          ],
        });
      }
    }

    outcomes = mergeOutcomes(next);
  }

  outcomes = outcomes.map((outcome) => {
    const combination = resolveRecognisedCombination(outcome.visualMorphs, outcome.geneStates, speciesId);
    if (!combination) return outcome;

    const nonConsumedVisuals = outcome.visualMorphs.filter((geneId) => !combination.consumedGeneIds.has(geneId));
    return {
      ...outcome,
      visualMorphs: [combination.combinationId, ...nonConsumedVisuals],
    };
  });
  outcomes = mergeOutcomes(outcomes);

  const totalProbability = outcomes.reduce((total, outcome) => total + outcome.probability, 0);
  return {
    outcomes,
    totalProbability: roundProbability(totalProbability),
    ...(diagnostics.length ? { diagnostics } : {}),
  };
}

export function calculateSpeciesGenetics(
  speciesId: string,
  mother: Omit<ParentGenetics, "speciesId">,
  father: Omit<ParentGenetics, "speciesId">,
): GeneticsCalculation {
  return calculateGenetics(
    { ...mother, speciesId },
    { ...father, speciesId },
  );
}

export type CalculatorResult = {
  name: string;
  percentage: number;
  visualMorphs: string[];
  hets: string[];
  geneStates: OffspringGeneState[];
};

function resolveDisplayMorph(geneId: string, speciesId?: string): MorphDefinition | undefined {
  if (speciesId) return resolveSpeciesMorph(speciesId, geneId);
  return getMorphByGeneId(geneId);
}

export function calculateCalculatorResults(
  mother: ParentGenetics,
  father: ParentGenetics,
): CalculatorResult[] {
  const calculation = calculateGenetics(mother, father);
  const speciesId = resolveParentSpecies(mother, father);
  return calculation.outcomes.map((outcome) => {
    const visualNames = outcome.visualMorphs.map((geneId) => resolveDisplayMorph(geneId, speciesId)?.name ?? geneId);
    const hetNames = outcome.hets.map((het) => `${het.percentage} Het ${het.name}`);
    let name = visualNames.join(" + ");
    if (!name) name = hetNames.join(" + ");
    if (!name) name = "No visual copy";

    return {
      name,
      percentage: Math.round(outcome.probability * 10000) / 100,
      visualMorphs: outcome.visualMorphs,
      hets: hetNames,
      geneStates: outcome.geneStates,
    };
  });
}

export function debugGeneticsCross(mother: ParentGenetics, father: ParentGenetics) {
  const calculation = calculateGenetics(mother, father);
  const speciesId = resolveParentSpecies(mother, father);
  return {
    mother,
    father,
    diagnostics: calculation.diagnostics ?? [],
    outcomes: calculation.outcomes.map((outcome) => ({
      probability: outcome.probability,
      percentage: outcome.probability * 100,
      visualMorphs: outcome.visualMorphs.map((geneId) => resolveDisplayMorph(geneId, speciesId)?.name ?? geneId),
      hets: outcome.hets,
      geneStates: outcome.geneStates,
    })),
    totalProbability: calculation.totalProbability,
    totalPercentage: calculation.totalProbability * 100,
  };
}
