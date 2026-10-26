import type { GeneticsCalculatorInput, GeneticsCalculatorResult, HetPercentage, OffspringComponent, OffspringResult } from "../types/genetics";
import { GENETICS_DATABASE } from "./geneticsDatabase.ts";
import { morphs as hognoseMorphs } from "../data/morphs.ts";
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


/** Expand a keeper's named Super or combination into the underlying loci.
 * Multiple names describing the same allele (Arctic + Platinum, for instance)
 * are merged by highest proven copy count, never summed as independent genes.
 * Unsupported labels are kept out of the model and explicitly reported.
 */
function expandRecordedParent(species: string, parent: ForecastParent): { parent: ForecastParent; unsupported: string[] } {
  const loci = GENETICS_DATABASE.loci.filter((locus) => locus.species === species);
  const copies: Record<string, 1 | 2> = { ...(parent.knownGeneCopies ?? {}) };
  const resolved = new Set<string>();
  const unsupported: string[] = [];
  const add = (alleleId: string, copyCount?: number) => {
    resolved.add(alleleId);
    if (copyCount === 1 || copyCount === 2) {
      copies[alleleId] = Math.max(copies[alleleId] ?? 0, copyCount) as 1 | 2;
    }
  };
  for (const recorded of parent.morphs) {
    const direct = loci.flatMap((locus) => locus.alleles.filter((allele) => !allele.isWildType && alleleMatches(allele, recorded)));
    if (direct.length) {
      direct.forEach((allele) => add(allele.id));
      continue;
    }
    const named = GENETICS_DATABASE.combinations.find((combination) =>
      combination.species === species && combinationMatchesParent(combination, recorded) && (combination.components?.length ?? 0) > 0);
    const label = normalise(recorded);
    const catalogueMorph = species === "Heterodon nasicus"
      ? hognoseMorphs.find((morph) => [morph.geneId, morph.name, ...(morph.aliases ?? [])].some((value) => normalise(value) === label))
      : undefined;
    const components = named?.components?.map((part) => ({ alleleId: part.alleleId, copies: part.copies ?? 1 }))
      ?? catalogueMorph?.components?.map((part) => ({ alleleId: part.morphId, copies: part.copies ?? 1 }));
    // A catalogue composition must fully resolve in the chosen species. Never
    // import a Hognose trait into an unrelated species with similarly named genes.
    if (components?.length && components.every((part) => loci.some((locus) =>
      locus.alleles.some((allele) => !allele.isWildType && allele.id === part.alleleId)))) {
      components.forEach((part) => add(part.alleleId, part.copies));
    } else {
      unsupported.push(recorded);
    }
  }
  return {
    parent: { ...parent, morphs: [...resolved], knownGeneCopies: Object.keys(copies).length ? copies : undefined },
    unsupported,
  };
}

function parentLocusScenarios(parent: ForecastParent, locus: LocusDefinition): ParentScenario[] {
  const wild = locus.alleles.find((entry) => entry.isWildType);
  if (!wild) return [];

  // A keeper's recorded "clear" claim cannot coexist with a visual or carrier
  // entry at this same locus. Treat conflicting source records as unresolved.
  if (parent.confirmedClearLoci?.includes(locus.id) && (
    parent.morphs.some((morph) => Boolean(findAllele(locus, morph)) ||
      GENETICS_DATABASE.combinations.some((combination) => combination.species === locus.species &&
        combinationMatchesParent(combination, morph) && combination.componentLocusIds.includes(locus.id))) ||
    parent.hets.some((het) => Boolean(findAllele(locus, het)))
  )) return [];

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
    const allele = findAllele(locus, entry);
    return Boolean(allele && !allele.isWildType);
  });
  if (hetEntry) {
    const allele = findAllele(locus, hetEntry)!;
    const hetPercentage: HetPercentage = parent.hetPercentages?.[hetEntry] ?? "100%";
    const p = hetProbability(hetPercentage);
    return [
      { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id }, weight: p, label: `${hetPercentage} Het ${allele.name}`, unknown: false },
      { state: { locusId: locus.id, paternalAlleleId: wild.id, maternalAlleleId: wild.id }, weight: 1 - p, label: `${Math.round((1 - p) * 100)}% not Het ${allele.name}`, unknown: false },
    ];
  }

  if (parent.confirmedClearLoci?.includes(locus.id)) {
    return [{ state: { locusId: locus.id, paternalAlleleId: wild.id, maternalAlleleId: wild.id }, weight: 1, label: `${locus.name}: documented clear`, unknown: false }];
  }

  // An unrecorded genotype is NOT a documented clear. Model explicit
  // conditional scenarios, rather than suppressing the whole known-gene cross.
  // Unrecorded recessive traits can be clear or nonvisual carriers; do not
  // imply either is confirmed. Other traits use a conditional wild-type
  // baseline only, not an exhaustive claim about the undocumented parent.
  const wildState: GeneticState = { locusId: locus.id, paternalAlleleId: wild.id, maternalAlleleId: wild.id };
  const baseline: ParentScenario = { state: wildState, label: `${locus.name}: if undocumented parent is wild type`, unknown: true };
  if (locus.inheritance === "recessive") {
    const allele = locus.alleles.find((entry) => !entry.isWildType);
    if (allele) {
      return [
        baseline,
        { state: { locusId: locus.id, paternalAlleleId: allele.id, maternalAlleleId: wild.id }, label: `${locus.name}: if undocumented parent is a carrier`, unknown: true },
      ];
    }
  }
  return [baseline];
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
        .filter((locus) => locus.species === species && Boolean(findAllele(locus, het)) && !findAllele(locus, het)?.isWildType)
        .forEach((locus) => relevant.add(locus.id));
    }
    for (const locusId of parent.confirmedClearLoci ?? []) {
      if (GENETICS_DATABASE.loci.some((locus) => locus.species === species && locus.id === locusId)) relevant.add(locusId);
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
    // A named combination requires an exact species-specific visible allele/copy
    // signature. Subset matches (or empty component arrays) must not rename offspring.
    .filter((combination) => Boolean(combination.components?.length) &&
      combination.components!.length === visualComponents.length &&
      combination.components!.every((component) => {
        const child = scenario.loci.find((entry) => entry.locus.id === component.locusId);
        return Boolean(child &&
          child.phenotypeStatus !== "mixed_allelic" &&
          child.phenotypeStatus !== "unresolved" &&
          (child.copiesByAllele[component.alleleId] ?? 0) === (component.copies ?? 1) &&
          visualComponents.some((visual) => visual.geneId === component.alleleId && visual.copies === (component.copies ?? 1)));
      }))
    .sort((a, b) => {
      const aScore = (a.components ?? []).reduce((sum, component) => sum + (component.copies ?? 1), 0);
      const bScore = (b.components ?? []).reduce((sum, component) => sum + (component.copies ?? 1), 0);
      return bScore - aScore || (b.components?.length ?? 0) - (a.components?.length ?? 0) || a.name.localeCompare(b.name);
    });

  const combination = matching[0];
  const name = combination?.name ?? (visualComponents.length ? visualComponents.map((component) => component.state === "Super" ? `Super ${component.name}` : component.name).sort().join(" + ") : "No tracked visual traits");
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
  if (input.female.morphs.length === 0 && input.female.hets.length === 0 && input.male.morphs.length === 0 && input.male.hets.length === 0 && !(input.female.confirmedClearLoci?.length) && !(input.male.confirmedClearLoci?.length)) {
    return { input, offspring: [], hasUnresolvedGenetics: false };
  }

  const mother = expandRecordedParent(species, input.female);
  const father = expandRecordedParent(species, input.male);
  const workingInput: GeneticsCalculatorInput = { female: mother.parent, male: father.parent };
  const unsupportedTraits = [...mother.unsupported, ...father.unsupported];
  const loci = relevantLoci(species, workingInput.female, workingInput.male);
  // A keeper can select a visual variation for which no Mendelian model exists.
  // Never turn an unrecognised trait into a fictitious 100% Normal outcome.
  const selectedNames = [workingInput.female, workingInput.male].flatMap((parent) => [...parent.morphs, ...parent.hets]);
  const knownNames = selectedNames.every((name) =>
    loci.some((locus) => Boolean(findAllele(locus, name))) ||
    GENETICS_DATABASE.combinations.some((combination) => combination.species === species &&
      combinationMatchesParent(combination, name) && Boolean(combination.components?.length)));
  // Unsupported labels are reported as unresolved, but documented component
  // genetics still get a conditional forecast when their loci are calculable.
  if (loci.length === 0) return { input, offspring: [], hasUnresolvedGenetics: true };
  if (!knownNames) return { input, offspring: [], hasUnresolvedGenetics: true };
  const scenariosByLocus = loci.map((locus) => ({
    locus,
    mother: parentLocusScenarios(workingInput.female, locus),
    father: parentLocusScenarios(workingInput.male, locus),
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
            const known = base.probabilityKnown && mother.weight !== undefined && father.weight !== undefined && unsupportedTraits.length === 0;
            const probability = base.probability * (mother.weight ?? 1) * (father.weight ?? 1) * child.probability;
            const baseRange = base.probabilityRange ?? { min: base.probability, max: base.probability };
            const branchWeight = (mother.weight ?? 1) * (father.weight ?? 1) * child.probability;
            next.push({
              probabilityKnown: known,
              probability,
              probabilityRange: known ? undefined : { min: 0, max: baseRange.max * branchWeight },
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
    hasUnresolvedGenetics: unsupportedTraits.length > 0 || offspring.some((result) => result.hasUnresolvedGenetics),
  };
}
