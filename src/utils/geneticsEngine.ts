// ============================================================
// TINY TITANS — GENETICS ENGINE
// ============================================================
// CORE INHERITANCE CALCULATION ENGINE
// UI components MUST NOT contain inheritance rules.
// ============================================================

import { getCombinations, getMorphByGeneId, resolveUnderlyingGenes, type MorphDefinition } from "../data/morphs";
import { resolveStrictMorph, type HetPercentage } from "./geneticsIdentity";

export type ParentGeneState = { geneId: string; copies: number; visual: boolean; probability: number };
export type ParentGenetics = { visualMorphs: string[]; hets: Array<{ gene: string; percentage: HetPercentage }> };
export type Gamete = { copies: number; probability: number };
export type OffspringGeneState = { geneId: string; copies: number; probability: number };
export type GeneticsOutcome = { probability: number; visualMorphs: string[]; hets: Array<{ geneId: string; name: string; percentage: HetPercentage }>; geneStates: OffspringGeneState[] };
export type GeneticsCalculation = { outcomes: GeneticsOutcome[]; totalProbability: number };

const getMorph = (geneId: string) => getMorphByGeneId(geneId);
const roundProbability = (value: number) => Math.round(value * 1000000) / 1000000;
const clampProbability = (value: number) => Math.max(0, Math.min(1, value));

function hetPercentageToProbability(percentage: HetPercentage): number {
  return percentage === "100%" ? 1 : percentage === "66%" ? 0.66 : percentage === "50%" ? 0.5 : 0;
}

function resolveGeneId(value: string): string | undefined { return resolveStrictMorph(value)?.geneId; }

export function buildParentGeneStates(parent: ParentGenetics): ParentGeneState[] {
  const states = new Map<string, ParentGeneState>();
  for (const morphValue of parent.visualMorphs) {
    for (const component of resolveUnderlyingGenes(morphValue)) {
      const morph = getMorphByGeneId(component.morphId);
      if (!morph || morph.kind !== "Gene") continue;
      const copies = Math.max(1, Math.min(2, component.copies ?? 1));
      const existing = states.get(morph.geneId);
      if (!existing) states.set(morph.geneId, { geneId: morph.geneId, copies, visual: true, probability: 1 });
      else { existing.copies = Math.max(existing.copies, copies); existing.visual = true; existing.probability = 1; }
    }
  }
  for (const het of parent.hets) {
    const geneId = resolveGeneId(het.gene);
    if (!geneId) continue;
    const probability = hetPercentageToProbability(het.percentage);
    const existing = states.get(geneId);
    if (!existing) states.set(geneId, { geneId, copies: 1, visual: false, probability });
    else if (existing.copies < 2) existing.probability = Math.max(existing.probability, probability);
  }
  return [...states.values()];
}

export function getParentGeneState(parent: ParentGenetics, geneId: string): ParentGeneState { return buildParentGeneStates(parent).find((state) => state.geneId === geneId) ?? { geneId, copies: 0, visual: false, probability: 1 }; }

export function generateGametes(state: ParentGeneState): Gamete[] {
  if (state.copies <= 0) return [{ copies: 0, probability: 1 }];
  if (state.copies >= 2) return [{ copies: 1, probability: 1 }];
  const carrierProbability = clampProbability(state.probability);
  return [
    { copies: 1, probability: roundProbability(carrierProbability * 0.5) },
    { copies: 0, probability: roundProbability(1 - carrierProbability * 0.5) },
  ];
}

export function calculateGeneCross(motherState: ParentGeneState, fatherState: ParentGeneState): { copies: number; probability: number }[] {
  const outcomes = new Map<number, number>();
  for (const motherGamete of generateGametes(motherState)) {
    for (const fatherGamete of generateGametes(fatherState)) {
      const copies = motherGamete.copies + fatherGamete.copies;
      outcomes.set(copies, (outcomes.get(copies) ?? 0) + motherGamete.probability * fatherGamete.probability);
    }
  }
  return [...outcomes.entries()].map(([copies, probability]) => ({ copies, probability: roundProbability(probability) })).sort((a, b) => a.copies - b.copies);
}

function resolveGenePhenotype(geneId: string, copies: number): string | undefined {
  const morph = getMorph(geneId);
  if (!morph || morph.kind !== "Gene") return undefined;
  if (morph.inheritance === "Recessive") return copies >= 2 ? morph.geneId : undefined;
  if (morph.inheritance === "Incomplete Dominant") {
    if (copies === 1) return morph.geneId;
    if (copies >= 2 && morph.superFormId) return getMorphByGeneId(morph.superFormId)?.geneId;
  }
  return undefined;
}

function resolveSingleGeneOutcome(geneId: string, copies: number): { visual?: string; het?: HetPercentage } {
  const morph = getMorph(geneId);
  if (!morph || morph.kind !== "Gene") return {};
  const visual = resolveGenePhenotype(geneId, copies);
  if (visual) return { visual };
  if (morph.inheritance === "Recessive" && copies === 1 && morph.hetPossible) return { het: "100%" };
  return {};
}

function combinationMatches(visualGeneIds: string[], components: NonNullable<MorphDefinition["components"]>): boolean {
  const counts = new Map<string, number>();
  for (const id of visualGeneIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return components.every((component) => {
    const definition = getMorphByGeneId(component.morphId);
    if (!definition || definition.kind !== "Gene") return false;
    return (counts.get(component.morphId) ?? 0) >= (component.copies ?? 1);
  });
}

function resolveRecognisedCombination(visualGeneIds: string[]): string | undefined {
  const combinations = getCombinations().filter((morph) => morph.verification === "Confirmed" || morph.verification === "Recognised");
  const matches = combinations.filter((morph) => morph.components?.length && combinationMatches(visualGeneIds, morph.components));
  return matches.sort((a, b) => (b.components?.length ?? 0) - (a.components?.length ?? 0))[0]?.geneId;
}

function getOutcomeKey(outcome: GeneticsOutcome): string {
  return `${[...outcome.visualMorphs].sort().join(",")}|${outcome.hets.map((het) => `${het.geneId}:${het.percentage}`).sort().join(",`)}`;
}

function mergeOutcomes(outcomes: GeneticsOutcome[]): GeneticsOutcome[] {
  const map = new Map<string, GeneticsOutcome>();
  for (const outcome of outcomes) {
    const key = getOutcomeKey(outcome);
    const existing = map.get(key);
    if (!existing) map.set(key, { ...outcome, visualMorphs: [...outcome.visualMorphs], hets: [...outcome.hets], geneStates: [...outcome.geneStates] });
    else existing.probability += outcome.probability;
  }
  return [...map.values()].map((outcome) => ({ ...outcome, probability: roundProbability(outcome.probability) })).sort((a, b) => b.probability - a.probability);
}

function collectRelevantGeneIds(mother: ParentGenetics, father: ParentGenetics): string[] {
  const ids = new Set<string>();
  for (const parent of [mother, father]) {
    for (const morph of parent.visualMorphs) for (const component of resolveUnderlyingGenes(morph)) if (getMorphByGeneId(component.morphId)?.kind === "Gene") ids.add(component.morphId);
    for (const het of parent.hets) { const id = resolveGeneId(het.gene); if (id) ids.add(id); }
  }
  return [...ids];
}

export function calculateGenetics(mother: ParentGenetics, father: ParentGenetics): GeneticsCalculation {
  const geneIds = collectRelevantGeneIds(mother, father);
  if (!geneIds.length) return { outcomes: [], totalProbability: 0 };
  let outcomes: GeneticsOutcome[] = [{ probability: 1, visualMorphs: [], hets: [], geneStates: [] }];
  for (const geneId of geneIds) {
    const geneCross = calculateGeneCross(getParentGeneState(mother, geneId), getParentGeneState(father, geneId));
    const next: GeneticsOutcome[] = [];
    for (const existing of outcomes) for (const geneOutcome of geneCross) {
      const geneResult = resolveSingleGeneOutcome(geneId, geneOutcome.copies);
      next.push({ probability: existing.probability * geneOutcome.probability, visualMorphs: [...existing.visualMorphs, ...(geneResult.visual ? [geneResult.visual] : [])], hets: [...existing.hets, ...(geneResult.het ? [{ geneId, name: getMorph(geneId)?.name ?? geneId, percentage: geneResult.het }] : [])], geneStates: [...existing.geneStates, { geneId, copies: geneOutcome.copies, probability: geneOutcome.probability }] });
    }
    outcomes = mergeOutcomes(next);
  }
  outcomes = mergeOutcomes(outcomes.map((outcome) => { const combination = resolveRecognisedCombination(outcome.visualMorphs); return combination ? { ...outcome, visualMorphs: [combination] } : outcome; }));
  return { outcomes, totalProbability: roundProbability(outcomes.reduce((total, outcome) => total + outcome.probability, 0)) };
}

export type CalculatorResult = { name: string; percentage: number; visualMorphs: string[]; hets: string[] };
export function calculateOffspring(mother: ParentGenetics, father: ParentGenetics, _genes?: MorphDefinition[]): CalculatorResult[] {
  return calculateGenetics(mother, father).outcomes.map((outcome) => ({ name: outcome.visualMorphs.length ? outcome.visualMorphs.map((id) => getMorph(id)?.name ?? id).join(" + ") : "Normal", percentage: outcome.probability * 100, visualMorphs: outcome.visualMorphs, hets: outcome.hets.map((het) => het.geneId) }));
}
