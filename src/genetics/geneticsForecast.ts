import type { GeneticsCalculatorInput, GeneticsCalculatorResult, HetPercentage, OffspringComponent, OffspringResult } from "../types/genetics";
import { GENETICS_DATABASE } from "./geneticsDatabase.ts";
import { calculateLocus, getLocusAllele, type AlleleDefinition, type GeneticState, type LocusDefinition, type CombinationDefinition } from "./geneticsModel.ts";

export type ForecastParent = GeneticsCalculatorInput["female"];
type ParentScenario = { state: GeneticState; weight?: number; label: string; unknown: boolean };
type ChildLocus = { locus: LocusDefinition; state: GeneticState; probability: number; label: string; phenotypeStatus: string; superForm: boolean; copiesByAllele: Record<string, number> };
type ForecastScenario = { probabilityKnown: boolean; probability: number; probabilityRange?: { min: number; max: number }; labels: string[]; loci: ChildLocus[] };

const normalise = (value: string) => value.trim().toLowerCase();

function hetProbability(value: HetPercentage): number {
  if (value === "66%" || value === 66) return 2 / 3;
  if (value === "50%" || value === 50) return 0.5;
  return 1;
}

function alleleMatches(allele: AlleleDefinition, value: string): boolean {
  const query = normalise(value);
  return [allele.id, allele.name, ...(allele.aliases ?? [])].some((candidate) => normalise(candidate) === query);
}

function findAllele(locus: LocusDefinition, value: string): AlleleDefinition | undefined {
  return locus.alleles.find((allele) => alleleMatches(allele, value));
}

function combinationMatchesParent(combination: CombinationDefinition, value: string): boolean {
  const query = normalise(value);
  return [combination.name, combination.id, ...(combination.aliases ?? [])].some((candidate) => normalise(candidate) === query);
}

function parentCombinationState(parent: ForecastParent, locus: LocusDefinition): ParentScenario | undefined {
  for (const morphValue of parent.morphs) {
    const combinations = GENETICS_DATABASE.combinations.filter((combination) => combination.species === locus.species && combinationMatchesParent(combination, morphValue));
    for (const combination of combinations) {
      const component = combination.components?.find((entry) => entry.locusId === locus.id);
      if (!component) continue;
      const allele = getLocusAllele(locus, component.alleleId);
      const wild = locus.alleles.find((entry) => entry.isWildType);
      if (!allele || !wild) continue;
      const copies = component.copies ?? 1;
      if (copies >= 2) return { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: allele.id }, weight: 1, label: `${combination.name}: ${allele.name} ×2`, unknown: false };
      return { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id }, weight: 1, label: `${combination.name}: ${allele.name} ×1`, unknown: false };
    }
  }
  return undefined;
}

function parentLocusScenarios(parent: ForecastParent, locus: LocusDefinition): ParentScenario[] {
  const wild = locus.alleles.find((entry) => entry.isWildType);
  if (!wild) return [];

  const combinationState = parentCombinationState(parent, locus);
  if (combinationState) return [combinationState];

  const visualAlleles = new Set<string>();
  for (const morphValue of parent.morphs) {
    const allele = findAllele(locus, morphValue);
    if (allele && !allele.isWildType) visualAlleles.add(allele.id);
  }
  if (visualAlleles.size > 1) return [];

  const visualAlleleId = [...visualAlleles][0];
  if (visualAlleleId) {
    const allele = getLocusAllele(locus, visualAlleleId)!;
    const knownCopy = parent.knownGeneCopies?.[allele.id] ?? parent.knownGeneCopies?.[visualAlleleId];
    if (locus.inheritance === "recessive" || knownCopy === 2) {
      return [{ state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: allele.id }, weight: 1, label: `${allele.name}: 2 copies`, unknown: false }];
    }
    if (knownCopy === 1) {
      return [{ state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id }, weight: 1, label: `${allele.name}: 1 copy`, unknown: false }];
    }
    return [
      { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id }, label: `${allele.name}: 1 copy`, unknown: true },
      { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: allele.id }, label: `${allele.name}: 2 copies`, unknown: true },
    ];
  }

  const hetEntry = parent.hets.find((entry) => {
    const allele = findAllele(locus, entry.gene);
    return Boolean(allele && !allele.isWildType);
  });
  if (hetEntry) {
    const allele = findAllele(locus, hetEntry.gene)!;
    const p = hetProbability(hetEntry.percentage);
    return [
      { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id }, weight: p, label: `${hetEntry.percentage} Het ${allele.name}`, unknown: false },
      { state: { locusId: locus.id, paternalAlleleId: wild.id, maternalAlleleId: wild.id }, weight: 1 - p, label: `${Math.round((1 - p) * 100)}% not Het ${allele.name}`, unknown: false },
    ];
  }

  return [{ state: { locusId: locus.id, paternalAlleleId: wild.id, maternalAlleleId: wild.id }, weight: 1, label: "Wild type", unknown: false }];
}

function relevantLoci(species: string, parentA: ForecastParent, parentB: ForecastParent): LocusDefinition[] {
  const relevant = new Set<string>();
  const parents = [parentA, parentB];
  for (const parent of parents) {
    for (const morphValue of parent.morphs) {
      GENETICS_DATABASE.loci
        .filter((locus) => locus.species === species && Boolean(findAllele(locus, morphValue)) && !findAllele(locus, morphValue)?.isWildType)
        .forEach((locus) => relevant.add(locus.id));
      GENETICS_DATABASE.combinations
        .filter((combination) => combination.species === species && combinationMatchesParent(combination, morphValue))
        .forEach((combination) => (combination.componentLocusIds ?? []).forEach((id) => relevant.add(id)));
    }
    for (const het of parent.hets) {
      GENETICS_DATABASE.loci
        .filter((locus) => locus.species === species && Boolean(findAllele(locus, het.gene)) && !findAllele(locus, het.gene)?.isWildType)
        .forEach((locus) => relevant.add(locus.id));
    }
    for (const geneId of Object.keys(parent.knownGeneCopies ?? {})) {
      GENETICS_DATABASE.loci
        .filter((locus) => locus.species === species && locus.alleles.some((allele) => allele.id === geneId))
        .forEach((locus) => relevant.add(locus.id));
    }
  }
  return GENETICS_DATABASE.loci.filter((locus) => locus.species === species && relevant.has(locus.id));
}

function makeOutcome(species: string, scenario: ForecastScenario, index: number): OffspringResult {
  const visualComponents: OffspringComponent[] = [];
  const hetComponents: OffspringComponent[] = [];
  for (const child of scenario.loci) {
    const paternal = getLocusAllele(child.locus, child.state.paternalAlleleId);
    const maternal = getLocusAllele(child.locus, child.state.maternalAlleleId);
    if (!paternal || !maternal || (paternal.isWildType && maternal.isWildType)) continue;
    const nonWild = paternal.isWildType ? maternal : paternal;
    const copies = child.copiesByAllele[nonWild.id] ?? 0;
    if (child.locus.inheritance === "recessive" && copies === 1) {
      hetComponents.push({ geneId: nonWild.id, name: nonWild.name, copies: 1, state: "Het" });
    } else if (copies > 0) {
      visualComponents.push({ geneId: nonWild.id, name: nonWild.name, copies, state: child.superForm ? "Super" : "Visual" });
    }
  }

  const matching = GENETICS_DATABASE.combinations
    .filter((combination) => combination.species === species && combination.status === "recognised")
    .filter((combination) => (combination.components ?? []).every((component) => {
      const child = scenario.loci.find((entry) => entry.locus.id === component.locusId);
      return child ? (child.copiesByAllele[component.alleleId] ?? 0) >= (component.copies ?? 1) : false;
    }))
    .sort((a, b) => {
      const aScore = (a.components ?? []).reduce((sum, component) => sum + (component.copies ?? 1), 0);
      const bScore = (b.components ?? []).reduce((sum, component) => sum + (component.copies ?? 1), 0);
      return bScore - aScore || (b.components?.length ?? 0) - (a.components?.length ?? 0) || a.name.localeCompare(b.name);
    });

  const combination = matching[0];
  const name = combination?.name ?? (visualComponents.length ? visualComponents.map((component) => component.state === "Super" ? `Super ${component.name}` : component.name).sort().join(" + ") : "Normal");
  const exactProbability = scenario.probabilityKnown ? scenario.probability * 100 : undefined;
  const result: OffspringResult = {
    id: `${scenario.loci.map((child) => `${child.locus.id}:${child.state.paternalAlleleId}/${child.state.maternalAlleleId}`).sort().join("|")}|${index}`,
    name,
    ...(exactProbability === undefined ? {} : { percentage: exactProbability }),
    ...(scenario.probabilityRange ? { probabilityRange: { min: scenario.probabilityRange.min * 100, max: scenario.probabilityRange.max * 100 } } : {}),
    certainty: scenario.probabilityKnown ? "exact" : "bounded",
    ...(scenario.probabilityKnown ? {} : { genotypeScenarioLabels: scenario.labels.map((label) => `Conditional parent genotype: ${label}`) }),
    visualComponents,
    hetComponents,
    possibleHetComponents: [],
    recognisedCombination: Boolean(combination),
    hasUnresolvedGenetics: !scenario.probabilityKnown,
  };
  return result;
}

function exactLocusChildren(locus: LocusDefinition, mother: ParentScenario, father: ParentScenario): ChildLocus[] {
  const calculated = calculateLocus(locus, mother.state, father.state);
  return calculated.outcomes.map((outcome) => ({
    locus,
    state: { locusId: locus.id, paternalAlleleId: outcome.paternalAlleleId, maternalAlleleId: outcome.maternalAlleleId },
    probability: outcome.probability,
    label: outcome.label,
    phenotypeStatus: outcome.phenotypeStatus,
    superForm: outcome.superForm,
    copiesByAllele: outcome.copiesByAllele,
  }));
}

export function calculateSpeciesGeneticsForecast(species: string, input: GeneticsCalculatorInput): GeneticsCalculatorResult {
  if (input.female.morphs.length === 0 && input.female.hets.length === 0 && input.male.morphs.length === 0 && input.male.hets.length === 0) {
    return { input, offspring: [], hasUnresolvedGenetics: false };
  }

  const loci = relevantLoci(species, input.female, input.male);
  const scenariosByLocus = loci.map((locus) => ({
    locus,
    mother: parentLocusScenarios(input.female, locus),
    father: parentLocusScenarios(input.male, locus),
  }));

  const invalid = scenariosByLocus.find((entry) => entry.mother.length === 0 || entry.father.length === 0);
  if (invalid) return { input, offspring: [], hasUnresolvedGenetics: true };

  let scenarios: ForecastScenario[] = [{ probabilityKnown: true, probability: 1, labels: [], loci: [] }];
  for (const locus of scenariosByLocus) {
    const next: ForecastScenario[] = [];
    for (const base of scenarios) {
      for (const mother of locus.mother) {
        for (const father of locus.father) {
          for (const child of exactLocusChildren(locus.locus, mother, father)) {
            const known = base.probabilityKnown && mother.weight !== undefined && father.weight !== undefined;
            const probability = base.probability * (mother.weight ?? 1) * (father.weight ?? 1) * child.probability;
            const baseRange = base.probabilityRange ?? { min: base.probability, max: base.probability };
            const branchWeight = (mother.weight ?? 1) * (father.weight ?? 1) * child.probability;
            next.push({
              probabilityKnown: known,
              probability,
              probabilityRange: known ? undefined : { min: baseRange.min * branchWeight, max: baseRange.max * branchWeight },
              labels: [...base.labels, mother.label, father.label],
              loci: [...base.loci, child],
            });
          }
        }
      }
    }
    scenarios = next;
  }

  const merged = new Map<string, { scenario: ForecastScenario; branches: string[]; probabilities: number[] }>();
  scenarios.forEach((scenario) => {
    const key = scenario.loci.map((child) => `${child.locus.id}:${child.state.paternalAlleleId}/${child.state.maternalAlleleId}`).sort().join("|");
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        scenario,
        branches: [scenario.labels.join("; ")],
        probabilities: [scenario.probabilityRange?.max ?? scenario.probability],
      });
      return;
    }
    existing.branches.push(scenario.labels.join("; "));
    existing.probabilities.push(scenario.probabilityRange?.max ?? scenario.probability);
    if (!scenario.probabilityKnown || !existing.scenario.probabilityKnown) {
      existing.scenario.probabilityKnown = false;
      existing.scenario.probability = 0;
      const mins = scenarios.filter((candidate) => candidate.loci.map((child) => `${child.locus.id}:${child.state.paternalAlleleId}/${child.state.maternalAlleleId}`).sort().join("|") === key).map((candidate) => candidate.probabilityRange?.min ?? candidate.probability);
      existing.scenario.probabilityRange = { min: Math.min(...mins), max: Math.max(...existing.probabilities) };
    } else {
      existing.scenario.probability += scenario.probability;
    }
  });

  let index = 0;
  const offspring = [...merged.values()].map((entry) => {
    const scenario = {
      ...entry.scenario,
      labels: entry.scenario.probabilityKnown ? entry.scenario.labels : entry.branches,
      probabilityRange: entry.scenario.probabilityKnown ? undefined : entry.scenario.probabilityRange,
    };
    return makeOutcome(species, scenario, index++);
  });
  return {
    input,
    offspring: offspring.sort((a, b) => (b.percentage ?? b.probabilityRange?.max ?? -1) - (a.percentage ?? a.probabilityRange?.max ?? -1) || a.name.localeCompare(b.name)),
    hasUnresolvedGenetics: offspring.some((result) => result.hasUnresolvedGenetics),
  };
}
