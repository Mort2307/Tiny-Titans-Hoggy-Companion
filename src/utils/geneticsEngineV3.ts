// ============================================================
// TINY TITANS — GENETICS ENGINE V3
// ============================================================
// Species -> locus -> allele aware inheritance core.
// Unknown dominant/incomplete-dominant zygosity is represented as
// bounded genotype scenarios instead of fabricated percentages.
// ============================================================

import type { MorphDefinition } from "../data/morphs";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";
import {
  getSpeciesCalculatorMorph,
  getSpeciesCalculatorMorphs,
  resolveSpeciesMorph,
  resolveSpeciesUnderlyingGenes,
} from "../data/species/speciesGeneticsResolver";
import { getSpeciesGeneticsLocus, getSpeciesLocusMembers } from "../data/species/speciesGeneticsLoci";

export type CopyKnowledge = 0 | 1 | 2 | "unknown";

export type V3ParentGenetics = {
  visualMorphs: string[];
  hets: Array<{ gene: string; percentage: "100%" | "66%" | "50%" }>;
  speciesId: string;
  knownGeneCopies?: Record<string, 1 | 2>;
};

export type V3GeneState = { geneId: string; copies: CopyKnowledge; visual: boolean };
export type V3Gamete = { geneId: string; copies: 0 | 1; probability: number };

export type V3Outcome = {
  visualMorphs: string[];
  hets: string[];
  geneStates: Array<{ geneId: string; copies: 0 | 1 | 2 }>;
  certainty: "exact" | "bounded";
  probability?: number;
  genotypeScenarios?: Array<{ visualMorphs: string[]; hets: string[]; probability: number }>;
};

export type V3Calculation = { outcomes: V3Outcome[]; diagnostics: string[] };

const HOGNOSE_ID = "heterodon-nasicus";

function clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
function hetProbability(value: V3ParentGenetics["hets"][number]["percentage"]): number {
  return value === "100%" ? 1 : value === "66%" ? 0.66 : 0.5;
}
function getMorph(speciesId: string, geneId: string): MorphDefinition | undefined { return getSpeciesCalculatorMorph(speciesId, geneId); }

function getParentState(parent: V3ParentGenetics, geneId: string): V3GeneState {
  const explicit = parent.knownGeneCopies?.[geneId];
  if (explicit) return { geneId, copies: explicit, visual: true };

  for (const visual of parent.visualMorphs) {
    const component = resolveSpeciesUnderlyingGenes(parent.speciesId, visual).find((part) => part.morphId === geneId);
    if (!component) continue;
    const morph = getMorph(parent.speciesId, geneId);
    if (morph && (morph.inheritance === "Dominant" || morph.inheritance === "Incomplete Dominant")) return { geneId, copies: "unknown", visual: true };
    return { geneId, copies: Math.min(2, component.copies) as 1 | 2, visual: true };
  }

  const het = parent.hets.find((entry) => resolveSpeciesMorph(parent.speciesId, entry.gene)?.geneId === geneId);
  return het ? { geneId, copies: 1, visual: false } : { geneId, copies: 0, visual: false };
}

function gametesForKnown(state: V3GeneState, probability = 1): V3Gamete[] {
  if (state.copies === 0) return [{ geneId: state.geneId, copies: 0, probability: 1 }];
  if (state.copies === 2) return [{ geneId: state.geneId, copies: 1, probability: clamp(probability) }];
  return [
    { geneId: state.geneId, copies: 1, probability: clamp(probability * 0.5) },
    { geneId: state.geneId, copies: 0, probability: clamp(1 - probability * 0.5) },
  ];
}

function genotypeScenarios(parent: V3ParentGenetics, geneId: string): Array<{ state: V3GeneState; weight: number; uncertainZygosity: boolean }> {
  const state = getParentState(parent, geneId);
  const het = parent.hets.find((entry) => resolveSpeciesMorph(parent.speciesId, entry.gene)?.geneId === geneId);
  if (state.copies === "unknown") {
    return [
      { state: { ...state, copies: 1 }, weight: 1, uncertainZygosity: true },
      { state: { ...state, copies: 2 }, weight: 1, uncertainZygosity: true },
    ];
  }
  if (!het) return [{ state, weight: 1, uncertainZygosity: false }];
  const p = hetProbability(het.percentage);
  return [
    { state: { ...state, copies: 1 }, weight: p, uncertainZygosity: false },
    { state: { ...state, copies: 0, visual: false }, weight: 1 - p, uncertainZygosity: false },
  ];
}

function crossScenario(mother: V3GeneState, father: V3GeneState): Array<{ copies: 0 | 1 | 2; probability: number }> {
  const outcomes = new Map<number, number>();
  for (const mg of gametesForKnown(mother)) for (const fg of gametesForKnown(father)) {
    const copies = (mg.copies + fg.copies) as 0 | 1 | 2;
    outcomes.set(copies, (outcomes.get(copies) ?? 0) + mg.probability * fg.probability);
  }
  return [...outcomes.entries()].map(([copies, probability]) => ({ copies: copies as 0 | 1 | 2, probability }));
}

function resolvePhenotype(speciesId: string, geneId: string, copies: number): { visual?: string; het?: string } {
  const morph = getMorph(speciesId, geneId);
  if (!morph) return {};
  if (morph.inheritance === "Recessive") return copies === 2 ? { visual: morph.geneId } : copies === 1 && morph.hetPossible ? { het: morph.name } : {};
  if (morph.inheritance === "Dominant") return copies >= 1 ? { visual: morph.geneId } : {};
  if (morph.inheritance === "Incomplete Dominant") {
    if (copies === 2) return { visual: morph.superFormId ?? morph.geneId };
    if (copies === 1) return { visual: morph.geneId };
  }
  return {};
}

function combinationRequirements(morph: MorphDefinition): Map<string, number> {
  const result = new Map<string, number>();
  for (const component of morph.components ?? []) {
    const copies = component.copies ?? (component.type === "Super" ? 2 : 1);
    result.set(component.morphId, (result.get(component.morphId) ?? 0) + copies);
  }
  return result;
}

function resolveCombination(speciesId: string, states: Array<{ geneId: string; copies: number }>): string | undefined {
  if (speciesId !== HOGNOSE_ID) return undefined;
  const available = new Map(states.filter((state) => state.copies > 0).map((state) => [state.geneId, state.copies]));
  const candidates = calculatorNamedCombinations.filter((entry) => entry.kind === "Combination" && entry.isCombination === true).map((entry) => ({ entry, requirements: combinationRequirements(entry) })).filter(({ requirements }) => [...requirements.entries()].every(([geneId, copies]) => (available.get(geneId) ?? 0) >= copies));
  candidates.sort((a, b) => {
    const aSpecificity = [...a.requirements.values()].reduce((sum, value) => sum + value, 0);
    const bSpecificity = [...b.requirements.values()].reduce((sum, value) => sum + value, 0);
    if (bSpecificity !== aSpecificity) return bSpecificity - aSpecificity;
    return b.entry.geneId.localeCompare(a.entry.geneId);
  });
  return candidates[0]?.entry.geneId;
}

function diagnosticsFor(parent: V3ParentGenetics): string[] {
  const relevant = new Set<string>();
  for (const visual of parent.visualMorphs) for (const component of resolveSpeciesUnderlyingGenes(parent.speciesId, visual)) relevant.add(component.morphId);
  for (const het of parent.hets) {
    const resolved = resolveSpeciesMorph(parent.speciesId, het.gene);
    if (resolved?.isGene) relevant.add(resolved.geneId);
  }
  const loci = new Set<string>();
  for (const geneId of relevant) {
    const locus = getSpeciesGeneticsLocus(parent.speciesId, geneId);
    if (locus) loci.add(locus.locusId);
  }
  return [...loci].flatMap((locusId) => {
    const members = getSpeciesLocusMembers(parent.speciesId, locusId).filter((member) => relevant.has(member.geneId));
    return members.length > 1 ? [`Alleles at ${locusId} (${members.map((member) => member.geneId).join(" / ")}) require allele-state calculation; independent-gene treatment is disabled.`] : [];
  });
}

export function calculateGeneticsV3(mother: V3ParentGenetics, father: V3ParentGenetics): V3Calculation {
  if (mother.speciesId !== father.speciesId) return { outcomes: [], diagnostics: [`Species mismatch: ${mother.speciesId} × ${father.speciesId}.`] };
  const diagnostics = [...new Set([...diagnosticsFor(mother), ...diagnosticsFor(father)])];
  if (diagnostics.length) return { outcomes: [], diagnostics };

  const geneIds = new Set<string>();
  for (const parent of [mother, father]) {
    for (const visual of parent.visualMorphs) for (const component of resolveSpeciesUnderlyingGenes(parent.speciesId, visual)) geneIds.add(component.morphId);
    for (const het of parent.hets) {
      const resolved = resolveSpeciesMorph(parent.speciesId, het.gene);
      if (resolved?.isGene) geneIds.add(resolved.geneId);
    }
  }

  let scenarios: Array<{ states: Array<{ geneId: string; copies: 0 | 1 | 2 }>; probability: number; bounded: boolean }> = [{ states: [], probability: 1, bounded: false }];
  for (const geneId of geneIds) {
    const next: typeof scenarios = [];
    for (const base of scenarios) {
      for (const motherScenario of genotypeScenarios(mother, geneId)) for (const fatherScenario of genotypeScenarios(father, geneId)) {
        for (const child of crossScenario(motherScenario.state, fatherScenario.state)) {
          next.push({ states: [...base.states, { geneId, copies: child.copies }], probability: base.probability * motherScenario.weight * fatherScenario.weight * child.probability, bounded: base.bounded || motherScenario.uncertainZygosity || fatherScenario.uncertainZygosity });
        }
      }
    }
    scenarios = next;
  }

  const groups = new Map<string, V3Outcome>();
  for (const scenario of scenarios) {
    const visuals: string[] = [];
    const hets: string[] = [];
    for (const state of scenario.states) {
      const result = resolvePhenotype(mother.speciesId, state.geneId, state.copies);
      if (result.visual) visuals.push(result.visual);
      if (result.het) hets.push(`100% Het ${result.het}`);
    }
    const combo = resolveCombination(mother.speciesId, scenario.states);
    let finalVisuals = visuals;
    if (combo) {
      const comboEntry = calculatorNamedCombinations.find((entry) => entry.geneId === combo);
      const requirements = comboEntry ? combinationRequirements(comboEntry) : new Map<string, number>();
      finalVisuals = [combo, ...visuals.filter((geneId) => !requirements.has(geneId))];
    }
    const key = `${finalVisuals.slice().sort().join(",")}|${hets.slice().sort().join(",")}`;
    const current = groups.get(key);
    if (current) {
      if (!current.probability || scenario.bounded) current.probability = undefined;
      if (current.certainty === "bounded" || scenario.bounded) {
        current.certainty = "bounded";
        current.genotypeScenarios = current.genotypeScenarios ?? [];
        current.genotypeScenarios.push({ visualMorphs: finalVisuals, hets, probability: scenario.probability });
      } else current.probability = (current.probability ?? 0) + scenario.probability;
    } else {
      groups.set(key, { visualMorphs: finalVisuals, hets, geneStates: scenario.states, certainty: scenario.bounded ? "bounded" : "exact", probability: scenario.bounded ? undefined : scenario.probability, ...(scenario.bounded ? { genotypeScenarios: [{ visualMorphs: finalVisuals, hets, probability: scenario.probability }] } : {}) });
    }
  }

  return { outcomes: [...groups.values()], diagnostics: [] };
}

export function getSpeciesCalculatorCoverageV3(speciesId: string): { eligibleGenes: string[]; count: number } {
  const eligibleGenes = getSpeciesCalculatorMorphs(speciesId).map((morph) => morph.geneId);
  return { eligibleGenes, count: eligibleGenes.length };
}

export function isSpeciesCalculatorV3Ready(speciesId: string): boolean {
  return getSpeciesCalculatorMorphs(speciesId).length > 0;
}
