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

export type CopyKnowledge = 1 | 2 | "unknown";

export type V3ParentGenetics = {
  visualMorphs: string[];
  hets: Array<{ gene: string; percentage: "100%" | "66%" | "50%" }>;
  speciesId: string;
  knownGeneCopies?: Record<string, CopyKnowledge>;
};

export type V3GeneState = {
  geneId: string;
  copies: CopyKnowledge;
  visual: boolean;
};

export type V3Gamete = {
  geneId: string;
  copies: 0 | 1;
  probability: number;
};

export type V3Outcome = {
  visualMorphs: string[];
  hets: string[];
  geneStates: Array<{ geneId: string; copies: 0 | 1 | 2 }>;
  certainty: "exact" | "bounded";
  probability?: number;
  genotypeScenarios?: Array<{
    visualMorphs: string[];
    hets: string[];
    probability: number;
  }>;
};

export type V3Calculation = {
  outcomes: V3Outcome[];
  diagnostics: string[];
};

const HOGNOSE_ID = "heterodon-nasicus";

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hetProbability(value: V3ParentGenetics["hets"][number]["percentage"]): number {
  if (value === "100%") return 1;
  if (value === "66%") return 0.66;
  return 0.5;
}

function getMorph(speciesId: string, geneId: string): MorphDefinition | undefined {
  return speciesId === HOGNOSE_ID ? getSpeciesCalculatorMorph(speciesId, geneId) : getSpeciesCalculatorMorph(speciesId, geneId);
}

function getParentState(parent: V3ParentGenetics, geneId: string): V3GeneState {
  const explicit = parent.knownGeneCopies?.[geneId];
  if (explicit) return { geneId, copies: explicit, visual: true };
  for (const visual of parent.visualMorphs) {
    const components = resolveSpeciesUnderlyingGenes(parent.speciesId, visual);
    const component = components.find((part) => part.morphId === geneId);
    if (component) {
      const morph = getMorph(parent.speciesId, geneId);
      if (morph && (morph.inheritance === "Dominant" || morph.inheritance === "Incomplete Dominant")) {
        return { geneId, copies: "unknown", visual: true };
      }
      return { geneId, copies: Math.min(2, component.copies) as 1 | 2, visual: true };
    }
  }
  for (const het of parent.hets) {
    const resolved = resolveSpeciesMorph(parent.speciesId, het.gene);
    if (resolved?.geneId === geneId) return { geneId, copies: 1, visual: false };
  }
  return { geneId, copies: 0 as 1, visual: false };
}

function gametesForKnown(state: V3GeneState, probability = 1): V3Gamete[] {
  if (state.copies === 0) return [{ geneId: state.geneId, copies: 0, probability: 1 }];
  if (state.copies === 2) return [{ geneId: state.geneId, copies: 1, probability: clamp(probability) }];
  return [
    { geneId: state.geneId, copies: 1, probability: clamp(probability * 0.5) },
    { geneId: state.geneId, copies: 0, probability: clamp(1 - probability * 0.5) },
  ];
}

function genotypeScenarios(parent: V3ParentGenetics, geneId: string): Array<{ state: V3GeneState; weight: number }> {
  const state = getParentState(parent, geneId);
  if (state.copies !== "unknown") {
    const het = parent.hets.find((entry) => resolveSpeciesMorph(parent.speciesId, entry.gene)?.geneId === geneId);
    return [{ state, weight: het ? hetProbability(het.percentage) : 1 }];
  }
  // Unknown visual zygosity is a set of possible genotypes, not a 50/50 claim.
  return [
    { state: { ...state, copies: 1 }, weight: 1 },
    { state: { ...state, copies: 2 }, weight: 1 },
  ];
}

function crossScenario(
  mother: V3GeneState,
  father: V3GeneState,
  geneId: string,
): Array<{ copies: 0 | 1 | 2; probability: number }> {
  const outcomes = new Map<number, number>();
  for (const mg of gametesForKnown(mother)) {
    for (const fg of gametesForKnown(father)) {
      const copies = (mg.copies + fg.copies) as 0 | 1 | 2;
      outcomes.set(copies, (outcomes.get(copies) ?? 0) + mg.probability * fg.probability);
    }
  }
  return [...outcomes.entries()].map(([copies, probability]) => ({ geneId, copies: copies as 0 | 1 | 2, probability }));
}

function resolvePhenotype(speciesId: string, geneId: string, copies: number): { visual?: string; het?: string } {
  const morph = getMorph(speciesId, geneId);
  if (!morph) return {};
  if (morph.inheritance === "Recessive") {
    if (copies === 2) return { visual: morph.geneId };
    if (copies === 1 && morph.hetPossible) return { het: morph.name };
  }
  if (morph.inheritance === "Dominant" && copies >= 1) return { visual: morph.geneId };
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

function resolveCombination(speciesId: string, geneStates: Array<{ geneId: string; copies: number }>): string | undefined {
  if (speciesId !== HOGNOSE_ID) return undefined;
  const available = new Map(geneStates.filter((state) => state.copies > 0).map((state) => [state.geneId, state.copies]));
  return calculatorNamedCombinations
    .filter((entry) => entry.kind === "Combination" && entry.isCombination === true)
    .map((entry) => ({ entry, requirements: combinationRequirements(entry) }))
    .filter(({ requirements }) => [...requirements.entries()].every(([geneId, copies]) => (available.get(geneId) ?? 0) >= copies))
    .sort((a, b) => {
      const ac = [...a.requirements.values()].reduce((sum, value) => sum + value, 0);
      const bc = [...b.requirements.values()].reduce((sum, value) => sum + value, 0);
      return bc - ac;
    })[0]?.entry.geneId;
}

function diagnosticsFor(parent: V3ParentGenetics): string[] {
  const diagnostics: string[] = [];
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
  for (const locusId of loci) {
    const members = getSpeciesLocusMembers(parent.speciesId, locusId).filter((member) => relevant.has(member.geneId));
    if (members.length > 1) diagnostics.push(`Alleles at ${locusId} (${members.map((member) => member.geneId).join(" / ")}) require allele-state calculation; independent-gene treatment is disabled.`);
  }
  return diagnostics;
}

export function calculateGeneticsV3(mother: V3ParentGenetics, father: V3ParentGenetics): V3Calculation {
  const diagnostics = [...new Set([...diagnosticsFor(mother), ...diagnosticsFor(father)])];
  if (mother.speciesId !== father.speciesId) return { outcomes: [], diagnostics: [`Species mismatch: ${mother.speciesId} × ${father.speciesId}.`] };
  if (diagnostics.length) return { outcomes: [], diagnostics };

  const geneIds = new Set<string>();
  for (const parent of [mother, father]) {
    for (const visual of parent.visualMorphs) for (const component of resolveSpeciesUnderlyingGenes(parent.speciesId, visual)) geneIds.add(component.morphId);
    for (const het of parent.hets) {
      const resolved = resolveSpeciesMorph(parent.speciesId, het.gene);
      if (resolved?.isGene) geneIds.add(resolved.geneId);
    }
  }

  let scenarios: Array<{ states: Array<{ geneId: string; copies: 0 | 1 | 2 }>; probability: number; exact: boolean }> = [{ states: [], probability: 1, exact: true }];

  for (const geneId of geneIds) {
    const motherScenarios = genotypeScenarios(mother, geneId);
    const fatherScenarios = genotypeScenarios(father, geneId);
    const next: typeof scenarios = [];
    for (const base of scenarios) {
      for (const ms of motherScenarios) for (const fs of fatherScenarios) {
        for (const child of crossScenario(ms.state, fs.state, geneId)) {
          next.push({
            states: [...base.states, { geneId, copies: child.copies }],
            probability: base.probability * ms.weight * fs.weight * child.probability,
            exact: base.exact && ms.state.copies !== "unknown" && fs.state.copies !== "unknown",
          });
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
    const finalVisuals = combo ? [combo, ...visuals.filter((geneId) => !combinationRequirements(calculatorNamedCombinations.find((entry) => entry.geneId === combo) as MorphDefinition).has(geneId))] : visuals;
    const key = `${finalVisuals.slice().sort().join(",")}|${hets.slice().sort().join(",")}`;
    const current = groups.get(key);
    if (current) {
      current.probability = (current.probability ?? 0) + scenario.probability;
      current.genotypeScenarios?.push({ visualMorphs: finalVisuals, hets, probability: scenario.probability });
    } else {
      groups.set(key, {
        visualMorphs: finalVisuals,
        hets,
        geneStates: scenario.states,
        certainty: scenario.exact ? "exact" : "bounded",
        probability: scenario.exact ? scenario.probability : undefined,
        genotypeScenarios: scenario.exact ? undefined : [{ visualMorphs: finalVisuals, hets, probability: scenario.probability }],
      });
    }
  }

  const outcomes = [...groups.values()].map((outcome) => {
    const bounded = outcome.certainty === "bounded";
    if (bounded) delete outcome.probability;
    return outcome;
  });
  return { outcomes, diagnostics: [] };
}

export function getSpeciesCalculatorCoverageV3(speciesId: string): {
  eligibleGenes: string[];
  count: number;
} {
  const eligibleGenes = getSpeciesCalculatorMorphs(speciesId).map((morph) => morph.geneId);
  return { eligibleGenes, count: eligibleGenes.length };
}
