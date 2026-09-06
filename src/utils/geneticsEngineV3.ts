import type { MorphDefinition } from "../data/morphs";
import { calculatorNamedCombinations } from "../data/geneticsComboRegistry";
import {
  getSpeciesCalculatorMorph,
  getSpeciesCalculatorMorphs,
  resolveSpeciesMorph,
  resolveSpeciesUnderlyingGenes,
} from "../data/species/speciesGeneticsResolver";
import {
  getSpeciesGeneticsLocus,
  getSpeciesLocus,
  getSpeciesLocusMembers,
  getSpeciesLocusPhenotypeRule,
  getSpeciesWildTypeAllele,
} from "../data/species/speciesGeneticsLoci";

export type CopyKnowledge = 0 | 1 | 2 | "unknown";
export type HetPercentage = "100%" | "66%" | "50%";
export type V3ParentGenetics = {
  visualMorphs: string[];
  hets: Array<{ gene: string; percentage: HetPercentage }>;
  speciesId: string;
  knownGeneCopies?: Record<string, 1 | 2>;
};
export type V3GeneState = { geneId: string; copies: CopyKnowledge; visual: boolean };
export type V3Gamete = { geneId: string; copies: 0 | 1; probability: number };
export type V3LocusState = { locusId: string; alleleA: string; alleleB: string };
export type V3Outcome = {
  visualMorphs: string[];
  phenotypes: string[];
  hets: string[];
  geneStates: Array<{ geneId: string; copies: 0 | 1 | 2 }>;
  locusStates: V3LocusState[];
  certainty: "exact" | "bounded";
  probability?: number;
  probabilityRange?: { min: number; max: number };
  genotypeScenarios?: Array<{ label: string; probability?: number; visualMorphs: string[]; phenotypes: string[]; hets: string[]; locusStates: V3LocusState[] }>;
};
export type V3Calculation = { outcomes: V3Outcome[]; diagnostics: string[] };

type Weighted<T> = { value: T; weight?: number; unknown: boolean; label: string };
type ParentAlleleState = { alleleA: string; alleleB: string };

function hetProbability(value: HetPercentage): number { return value === "100%" ? 1 : value === "66%" ? 2 / 3 : 0.5; }
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
  return { geneId, copies: 0, visual: false };
}

function genotypeScenarios(parent: V3ParentGenetics, geneId: string): Weighted<V3GeneState>[] {
  const state = getParentState(parent, geneId);
  if (state.copies === "unknown") {
    return [
      { value: { ...state, copies: 1 }, unknown: true, label: `${geneId}: 1 copy` },
      { value: { ...state, copies: 2 }, unknown: true, label: `${geneId}: 2 copies` },
    ];
  }
  const het = parent.hets.find((entry) => resolveSpeciesMorph(parent.speciesId, entry.gene)?.geneId === geneId);
  if (!het || state.copies === 2) return [{ value: state, weight: 1, unknown: false, label: `${geneId}: ${state.copies} copies` }];
  const p = hetProbability(het.percentage);
  return [
    { value: { ...state, copies: 1 }, weight: p, unknown: false, label: `${het.percentage} ${geneId} het present` },
    { value: { ...state, copies: 0, visual: false }, weight: 1 - p, unknown: false, label: `${Math.round((1 - p) * 100)}% ${geneId} not het` },
  ];
}

function gametesForKnown(state: V3GeneState): V3Gamete[] {
  if (state.copies === 0) return [{ geneId: state.geneId, copies: 0, probability: 1 }];
  if (state.copies === 2) return [{ geneId: state.geneId, copies: 1, probability: 1 }];
  return [
    { geneId: state.geneId, copies: 1, probability: 0.5 },
    { geneId: state.geneId, copies: 0, probability: 0.5 },
  ];
}

function crossGeneStates(mother: V3GeneState, father: V3GeneState): Array<{ copies: 0 | 1 | 2; probability: number }> {
  const result = new Map<number, number>();
  for (const mg of gametesForKnown(mother)) for (const fg of gametesForKnown(father)) {
    const copies = (mg.copies + fg.copies) as 0 | 1 | 2;
    result.set(copies, (result.get(copies) ?? 0) + mg.probability * fg.probability);
  }
  return [...result.entries()].map(([copies, probability]) => ({ copies: copies as 0 | 1 | 2, probability }));
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
  if (speciesId !== "heterodon-nasicus") return undefined;
  const available = new Map(states.filter((state) => state.copies > 0).map((state) => [state.geneId, state.copies]));
  return calculatorNamedCombinations
    .filter((entry) => entry.kind === "Combination" && entry.isCombination === true)
    .map((entry) => ({ entry, requirements: combinationRequirements(entry) }))
    .filter(({ requirements }) => [...requirements.entries()].every(([geneId, copies]) => (available.get(geneId) ?? 0) >= copies))
    .sort((a, b) => {
      const aScore = [...a.requirements.values()].reduce((sum, value) => sum + value, 0);
      const bScore = [...b.requirements.values()].reduce((sum, value) => sum + value, 0);
      if (aScore !== bScore) return bScore - aScore;
      return b.entry.geneId.localeCompare(a.entry.geneId);
    })[0]?.entry.geneId;
}

function getRelevantLoci(parent: V3ParentGenetics): Set<string> {
  const loci = new Set<string>();
  for (const visual of parent.visualMorphs) for (const component of resolveSpeciesUnderlyingGenes(parent.speciesId, visual)) {
    const locus = getSpeciesGeneticsLocus(parent.speciesId, component.morphId);
    if (locus) loci.add(locus.locusId);
  }
  for (const het of parent.hets) {
    const resolved = resolveSpeciesMorph(parent.speciesId, het.gene);
    const locus = resolved ? getSpeciesGeneticsLocus(parent.speciesId, resolved.geneId) : undefined;
    if (locus) loci.add(locus.locusId);
  }
  return loci;
}

function parentLocusScenarios(parent: V3ParentGenetics, locusId: string): Weighted<ParentAlleleState>[] {
  const locus = getSpeciesLocus(parent.speciesId, locusId);
  const wild = getSpeciesWildTypeAllele(parent.speciesId, locusId);
  if (!locus || !wild) return [];

  const visualGenes = parent.visualMorphs.flatMap((value) => resolveSpeciesUnderlyingGenes(parent.speciesId, value).map((component) => component.morphId));
  const locusVisualGenes = locus.alleles.map((allele) => allele.geneId).filter((geneId): geneId is string => Boolean(geneId) && visualGenes.includes(geneId));
  const distinctVisualGenes = [...new Set(locusVisualGenes)];
  if (distinctVisualGenes.length) {
    if (distinctVisualGenes.length > 1) return [];
    const allele = locus.alleles.find((candidate) => candidate.geneId === distinctVisualGenes[0]);
    if (!allele) return [];
    return [{ value: { alleleA: allele.alleleId, alleleB: allele.alleleId }, weight: 1, unknown: false, label: `${allele.label} homozygous` }];
  }

  const hets = parent.hets.map((entry) => {
    const resolved = resolveSpeciesMorph(parent.speciesId, entry.gene);
    const geneId = resolved?.geneId;
    return geneId ? { geneId, percentage: entry.percentage } : undefined;
  }).filter(Boolean) as Array<{ geneId: string; percentage: HetPercentage }>;
  const locusHets = hets.filter((entry) => locus.alleles.some((allele) => allele.geneId === entry.geneId));
  if (!locusHets.length) return [{ value: { alleleA: wild.alleleId, alleleB: wild.alleleId }, weight: 1, unknown: false, label: "Wild-type locus" }];
  if (locusHets.length > 1) return [];
  const allele = locus.alleles.find((candidate) => candidate.geneId === locusHets[0].geneId);
  if (!allele) return [];
  const p = hetProbability(locusHets[0].percentage);
  return [
    { value: { alleleA: wild.alleleId, alleleB: allele.alleleId }, weight: p, unknown: false, label: `${locusHets[0].percentage} ${allele.label} het` },
    { value: { alleleA: wild.alleleId, alleleB: wild.alleleId }, weight: 1 - p, unknown: false, label: `${Math.round((1 - p) * 100)}% ${allele.label} non-het` },
  ];
}

function crossLocusStates(mother: ParentAlleleState, father: ParentAlleleState): Array<{ state: ParentAlleleState; probability: number }> {
  const gameteA = [mother.alleleA, mother.alleleB];
  const gameteB = [father.alleleA, father.alleleB];
  const result = new Map<string, number>();
  for (const alleleA of gameteA) for (const alleleB of gameteB) {
    const key = [alleleA, alleleB].sort().join("|");
    result.set(key, (result.get(key) ?? 0) + 0.25);
  }
  return [...result.entries()].map(([key, probability]) => {
    const [alleleA, alleleB] = key.split("|");
    return { state: { alleleA, alleleB }, probability };
  });
}

function diagnosticsForLoci(mother: V3ParentGenetics, father: V3ParentGenetics): { loci: string[]; diagnostics: string[] } {
  const relevant = new Set([...getRelevantLoci(mother), ...getRelevantLoci(father)]);
  const diagnostics: string[] = [];
  const calculable: string[] = [];
  for (const locusId of relevant) {
    const members = getSpeciesLocusMembers(mother.speciesId, locusId);
    if (members.length > 1) calculable.push(locusId);
  }
  return { loci: calculable, diagnostics };
}

function resolveLocusPhenotype(speciesId: string, locusId: string, state: ParentAlleleState): { visual?: string; phenotype?: string; het?: string } {
  const rule = getSpeciesLocusPhenotypeRule(speciesId, locusId, state.alleleA, state.alleleB);
  if (!rule) return {};
  if (rule.visualGeneId) return { visual: rule.visualGeneId };
  if (rule.phenotypeLabel) return { phenotype: rule.phenotypeLabel };
  return {};
}

function buildIndependentGeneIds(parent: V3ParentGenetics, excludedLoci: Set<string>): Set<string> {
  const ids = new Set<string>();
  for (const visual of parent.visualMorphs) for (const component of resolveSpeciesUnderlyingGenes(parent.speciesId, visual)) {
    const locus = getSpeciesGeneticsLocus(parent.speciesId, component.morphId);
    if (locus && excludedLoci.has(locus.locusId)) continue;
    ids.add(component.morphId);
  }
  for (const het of parent.hets) {
    const resolved = resolveSpeciesMorph(parent.speciesId, het.gene);
    if (!resolved?.isGene) continue;
    const locus = getSpeciesGeneticsLocus(parent.speciesId, resolved.geneId);
    if (locus && excludedLoci.has(locus.locusId)) continue;
    ids.add(resolved.geneId);
  }
  return ids;
}

export function calculateGeneticsV3(mother: V3ParentGenetics, father: V3ParentGenetics): V3Calculation {
  if (mother.speciesId !== father.speciesId) return { outcomes: [], diagnostics: [`Species mismatch: ${mother.speciesId} × ${father.speciesId}.`] };
  const { loci, diagnostics } = diagnosticsForLoci(mother, father);
  const hardDiagnostics = [...diagnostics];
  const locusModels = loci.map((locusId) => ({ locusId, mother: parentLocusScenarios(mother, locusId), father: parentLocusScenarios(father, locusId) }));
  for (const model of locusModels) if (!model.mother.length || !model.father.length) hardDiagnostics.push(`Locus ${model.locusId} has an unsupported or conflicting parent allele state; calculation stopped rather than guessing.`);
  if (hardDiagnostics.length) return { outcomes: [], diagnostics: [...new Set(hardDiagnostics)] };

  const excludedLoci = new Set(loci);
  const independentGeneIds = new Set([...buildIndependentGeneIds(mother, excludedLoci), ...buildIndependentGeneIds(father, excludedLoci)]);

  type Scenario = { probabilityKnown: boolean; probability: number; labels: string[]; geneStates: Array<{ geneId: string; copies: 0 | 1 | 2 }>; locusStates: V3LocusState[] };
  let scenarios: Scenario[] = [{ probabilityKnown: true, probability: 1, labels: [], geneStates: [], locusStates: [] }];

  for (const locus of locusModels) {
    const next: Scenario[] = [];
    for (const base of scenarios) for (const ms of locus.mother) for (const fs of locus.father) for (const child of crossLocusStates(ms.value, fs.value)) {
      next.push({
        probabilityKnown: base.probabilityKnown && ms.weight !== undefined && fs.weight !== undefined,
        probability: base.probability * (ms.weight ?? 1) * (fs.weight ?? 1) * child.probability,
        labels: [...base.labels, `${locus.locusId}: ${ms.label} × ${fs.label}`],
        geneStates: [...base.geneStates],
        locusStates: [...base.locusStates, { locusId: locus.locusId, alleleA: child.state.alleleA, alleleB: child.state.alleleB }],
      });
    }
    scenarios = next;
  }

  for (const geneId of independentGeneIds) {
    const motherStates = genotypeScenarios(mother, geneId);
    const fatherStates = genotypeScenarios(father, geneId);
    const next: Scenario[] = [];
    for (const base of scenarios) for (const ms of motherStates) for (const fs of fatherStates) for (const child of crossGeneStates(ms.value, fs.value)) {
      next.push({
        probabilityKnown: base.probabilityKnown && ms.weight !== undefined && fs.weight !== undefined,
        probability: base.probability * (ms.weight ?? 1) * (fs.weight ?? 1) * child.probability,
        labels: [...base.labels, ms.label, fs.label],
        geneStates: [...base.geneStates, { geneId, copies: child.copies }],
        locusStates: [...base.locusStates],
      });
    }
    scenarios = next;
  }

  const groups = new Map<string, V3Outcome>();
  for (const scenario of scenarios) {
    const visuals: string[] = [];
    const phenotypes: string[] = [];
    const hets: string[] = [];
    for (const state of scenario.geneStates) {
      const result = resolvePhenotype(mother.speciesId, state.geneId, state.copies);
      if (result.visual) visuals.push(result.visual);
      if (result.het) hets.push(`100% Het ${result.het}`);
    }
    for (const locusState of scenario.locusStates) {
      const result = resolveLocusPhenotype(mother.speciesId, locusState.locusId, { alleleA: locusState.alleleA, alleleB: locusState.alleleB });
      if (result.visual) visuals.push(result.visual);
      if (result.phenotype) phenotypes.push(result.phenotype);
    }
    const combo = resolveCombination(mother.speciesId, scenario.geneStates);
    let finalVisuals = visuals;
    if (combo) {
      const entry = calculatorNamedCombinations.find((candidate) => candidate.geneId === combo);
      const requirements = entry ? combinationRequirements(entry) : new Map<string, number>();
      finalVisuals = [combo, ...visuals.filter((geneId) => !requirements.has(geneId))];
    }
    const key = `${finalVisuals.slice().sort().join(",")}|${phenotypes.slice().sort().join(",")}|${hets.slice().sort().join(",")}`;
    const existing = groups.get(key);
    const genotypeScenario = {
      label: scenario.labels.join("; "),
      ...(scenario.probabilityKnown ? { probability: scenario.probability } : {}),
      visualMorphs: finalVisuals,
      phenotypes,
      hets,
      locusStates: scenario.locusStates,
    };
    if (!existing) {
      groups.set(key, {
        visualMorphs: finalVisuals,
        phenotypes,
        hets,
        geneStates: scenario.geneStates,
        locusStates: scenario.locusStates,
        certainty: scenario.probabilityKnown ? "exact" : "bounded",
        ...(scenario.probabilityKnown ? { probability: scenario.probability } : { genotypeScenarios: [genotypeScenario] }),
      });
      continue;
    }
    if (!scenario.probabilityKnown || existing.certainty === "bounded") {
      existing.certainty = "bounded";
      existing.probability = undefined;
      existing.genotypeScenarios = existing.genotypeScenarios ?? [];
      if (!existing.genotypeScenarios.some((candidate) => candidate.label === genotypeScenario.label)) existing.genotypeScenarios.push(genotypeScenario);
    } else {
      existing.probability = (existing.probability ?? 0) + scenario.probability;
    }
  }

  for (const outcome of groups.values()) {
    if (outcome.certainty !== "bounded") continue;
    const knownBranchProbabilities = outcome.genotypeScenarios?.map((scenario) => scenario.probability).filter((value): value is number => typeof value === "number");
    if (knownBranchProbabilities?.length) outcome.probabilityRange = { min: Math.min(...knownBranchProbabilities), max: Math.max(...knownBranchProbabilities) };
  }

  return { outcomes: [...groups.values()], diagnostics: [] };
}

function resolvePhenotype(speciesId: string, geneId: string, copies: number): { visual?: string; het?: string } {
  const morph = getMorph(speciesId, geneId);
  if (!morph) return {};
  if (morph.inheritance === "Recessive") return copies === 2 ? { visual: morph.geneId } : copies === 1 && morph.hetPossible ? { het: morph.name } : {};
  if (morph.inheritance === "Dominant") return copies >= 1 ? { visual: morph.geneId } : {};
  if (morph.inheritance === "Incomplete Dominant") return copies === 2 ? { visual: morph.superFormId ?? morph.geneId } : copies === 1 ? { visual: morph.geneId } : {};
  return {};
}

export function getSpeciesCalculatorCoverageV3(speciesId: string): { eligibleGenes: string[]; count: number } {
  const eligibleGenes = getSpeciesCalculatorMorphs(speciesId).map((morph) => morph.geneId);
  return { eligibleGenes, count: eligibleGenes.length };
}

export function isSpeciesCalculatorV3Ready(speciesId: string): boolean { return getSpeciesCalculatorMorphs(speciesId).length > 0; }
