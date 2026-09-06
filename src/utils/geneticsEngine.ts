// ============================================================
// TINY TITANS — GENETICS ENGINE
// ============================================================
//
// CORE INHERITANCE CALCULATION ENGINE
//
// This file contains genetics logic only. UI components must not
// contain inheritance rules. The engine works from underlying gene
// copies rather than display names.
// ============================================================

import {
  getMorphByGeneId,
  resolveUnderlyingGenes,
  type MorphDefinition,
} from "../data/morphs";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";
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
};

export type Gamete = { geneId: string; copies: number; probability: number };
export type OffspringGeneState = { geneId: string; copies: number; probability: number };

export type GeneticsOutcome = {
  probability: number;
  visualMorphs: string[];
  hets: Array<{ geneId: string; name: string; percentage: HetPercentage }>;
  geneStates: OffspringGeneState[];
};

export type GeneticsCalculation = { outcomes: GeneticsOutcome[]; totalProbability: number };

function getMorph(geneId: string): MorphDefinition | undefined {
  return getMorphByGeneId(geneId);
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

function resolveGeneId(value: string): string | undefined {
  return resolveStrictMorph(value)?.geneId;
}

export function buildParentGeneStates(parent: ParentGenetics): ParentGeneState[] {
  const states = new Map<string, ParentGeneState>();

  for (const morphValue of parent.visualMorphs) {
    const underlying = resolveUnderlyingGenes(morphValue);
    for (const component of underlying) {
      const morph = getMorphByGeneId(component.morphId);
      if (!morph) continue;

      const copies = component.copies ?? 1;
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
    const geneId = resolveGeneId(het.gene);
    if (!geneId) continue;

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
  const morph = getMorph(state.geneId);
  if (!morph) return [];

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
  const ids = new Set<string>();
  for (const parent of [mother, father]) {
    for (const morph of parent.visualMorphs) {
      for (const component of resolveUnderlyingGenes(morph)) ids.add(component.morphId);
    }
    for (const het of parent.hets) {
      const geneId = resolveGeneId(het.gene);
      if (geneId) ids.add(geneId);
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

export function resolveGenePhenotype(geneId: string, copies: number): string | undefined {
  const morph = getMorph(geneId);
  if (!morph) return undefined;
  if (morph.inheritance === "Recessive") return isRecessiveVisual(morph, copies) ? morph.geneId : undefined;
  if (morph.inheritance === "Incomplete Dominant") return getIncompleteDominantVisual(morph, copies);
  return undefined;
}

function getHetProbabilityFromCopies(morph: MorphDefinition, copies: number): HetPercentage | undefined {
  if (!morph.hetPossible || morph.inheritance !== "Recessive" || copies !== 1) return undefined;
  return "100%";
}

export function resolveSingleGeneOutcome(
  geneId: string,
  copies: number,
): { visual?: string; het?: HetPercentage } {
  const morph = getMorph(geneId);
  if (!morph) return {};

  const visual = resolveGenePhenotype(geneId, copies);
  if (visual) return { visual };

  const het = getHetProbabilityFromCopies(morph, copies);
  if (het) return { het };

  return {};
}

/**
 * Recognised combinations are sourced exclusively from the canonical
 * combination registry. Their component graph is authoritative; the
 * engine never re-parses a display name to discover genetic components.
 */
function getAllCombinations(): MorphDefinition[] {
  return calculatorNamedCombinations.filter(
    (morph): morph is MorphDefinition => morph.kind === "Combination" && morph.isCombination === true,
  );
}

function resolveRecognisedCombination(visualGeneIds: string[]): string | undefined {
  const visualSet = new Set(visualGeneIds);

  for (const morph of getAllCombinations()) {
    if (!morph.components?.length) continue;

    const requiredVisual = new Set(
      morph.components
        .filter((component) => component.type === "Gene" || component.type === "Super")
        .map((component) => component.morphId),
    );
    if (!requiredVisual.size) continue;

    let matches = true;
    for (const requiredGene of requiredVisual) {
      if (!visualSet.has(requiredGene)) {
        matches = false;
        break;
      }
    }

    if (matches) return morph.geneId;
  }

  return undefined;
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

export function calculateGenetics(mother: ParentGenetics, father: ParentGenetics): GeneticsCalculation {
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
        const geneResult = resolveSingleGeneOutcome(geneId, geneOutcome.copies);
        next.push({
          probability: existing.probability * geneOutcome.probability,
          visualMorphs: [...existing.visualMorphs, ...(geneResult.visual ? [geneResult.visual] : [])],
          hets: [
            ...existing.hets,
            ...(geneResult.het ? [{
              geneId,
              name: getMorph(geneId)?.name ?? geneId,
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
    const combination = resolveRecognisedCombination(outcome.visualMorphs);
    return combination ? { ...outcome, visualMorphs: [combination] } : outcome;
  });
  outcomes = mergeOutcomes(outcomes);

  const totalProbability = outcomes.reduce((total, outcome) => total + outcome.probability, 0);
  return { outcomes, totalProbability: roundProbability(totalProbability) };
}

export type CalculatorResult = {
  name: string;
  percentage: number;
  visualMorphs: string[];
  hets: string[];
  geneStates: OffspringGeneState[];
};

export function calculateCalculatorResults(
  mother: ParentGenetics,
  father: ParentGenetics,
): CalculatorResult[] {
  const calculation = calculateGenetics(mother, father);
  return calculation.outcomes.map((outcome) => {
    const visualNames = outcome.visualMorphs.map((geneId) => getMorph(geneId)?.name ?? geneId);
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
  return {
    mother,
    father,
    outcomes: calculation.outcomes.map((outcome) => ({
      probability: outcome.probability,
      percentage: outcome.probability * 100,
      visualMorphs: outcome.visualMorphs.map((geneId) => getMorph(geneId)?.name ?? geneId),
      hets: outcome.hets,
      geneStates: outcome.geneStates,
    })),
    totalProbability: calculation.totalProbability,
    totalPercentage: calculation.totalProbability * 100,
  };
}
