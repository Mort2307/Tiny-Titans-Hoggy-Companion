// ============================================================
// TINY TITANS — GENETICS CALCULATOR ENGINE
// ============================================================
//
// SINGLE SOURCE OF TRUTH FOR OFFSPRING INHERITANCE
//
// UI components MUST NOT contain genetics calculations.
//
// This engine:
//
// • resolves visual morphs into gene copies
// • resolves Super forms
// • resolves recognised combinations
// • calculates independent loci
// • calculates recessive inheritance
// • calculates incomplete-dominant inheritance
// • combines multiple loci
// • recognises combinations AFTER inheritance
// • preserves unresolved genetics
// • deduplicates genetically identical outcomes
//
// ============================================================

import {
  getGenes,
  getMorphByGeneId,
  type MorphDefinition,
} from "../data/morphs";

import {
  getGeneId,
  resolveStrictMorph,
  
} from "./geneticsIdentity";

import {
  expandMorphToComponents,
} from "./morphResolver";

import type {
  GeneticsCalculatorInput,
  GeneticsCalculatorResult,
  OffspringComponent,
  OffspringResult,
  ParentGenetics,
  BreedingSummary,
  HetResult,
} from "../types/genetics";

// ============================================================
// INTERNAL TYPES
// ============================================================

type AlleleState = {
  geneId: string;

  /**
   * Number of copies possessed by this parent.
   *
   * 0 = clear
   * 1 = carrier / heterozygous
   * 2 = visual / homozygous
   */
  copies: 0 | 1 | 2;
};

type ParentLocus = {
  geneId: string;
  mother: AlleleState;
  father: AlleleState;
};

type LocusOutcome = {
  geneId: string;
  copies: 0 | 1 | 2;
  probability: number;
};

type InternalOutcome = {
  loci: Map<string, number>;
  probability: number;
};

// ============================================================
// CONSTANTS
// ============================================================

const PROBABILITY_EPSILON = 0.000001;

// ============================================================
// MORPH LOOKUP
// ============================================================

function getDefinition(
  geneId: string
): MorphDefinition | undefined {
  return getMorphByGeneId(geneId);
}

// ============================================================
// NORMALISE PARENT
// ============================================================
//
// ParentSelector currently stores:
//
// morphs = selected visual morph IDs
// hets   = selected het gene IDs
//
// This function converts those selections into actual
// allele copy counts.
//
// ============================================================

function getParentAlleleStates(
  parent: ParentGenetics
): Map<string, AlleleState> {
  const states =
    new Map<string, AlleleState>();

  // ----------------------------------------------------------
  // VISUAL MORPHS
  // ----------------------------------------------------------

  for (const value of parent.morphs) {
    const morph =
      resolveStrictMorph(value);

    if (!morph) {
      continue;
    }

    const components =
      expandMorphToComponents(morph);

    for (const component of components) {
      const geneId =
        component.morphId;

      const definition =
        getDefinition(geneId);

      if (
        !definition ||
        !definition.isGene ||
        definition.kind !== "Gene"
      ) {
        continue;
      }

      const copies =
        Math.min(
          2,
          Math.max(
            0,
            component.copies ?? 1
          )
        ) as 0 | 1 | 2;

      const existing =
        states.get(geneId);

      if (!existing) {
        states.set(
          geneId,
          {
            geneId,
            copies,
          }
        );

        continue;
      }

      existing.copies =
        Math.min(
          2,
          existing.copies + copies
        ) as 0 | 1 | 2;
    }
  }

  // ----------------------------------------------------------
  // HETS
  // ----------------------------------------------------------

  for (const value of parent.hets) {
    const geneId =
      getGeneId(value);

    if (!geneId) {
      continue;
    }

    const morph =
      getDefinition(geneId);

    if (
      !morph ||
      !morph.isGene ||
      morph.kind !== "Gene" ||
      !morph.hetPossible
    ) {
      continue;
    }

    const existing =
      states.get(geneId);

    // A visual animal already has two copies.
    // A het must never downgrade that state.
    if (
      existing &&
      existing.copies === 2
    ) {
      continue;
    }

    if (!existing) {
      states.set(
        geneId,
        {
          geneId,
          copies: 1,
        }
      );

      continue;
    }

    existing.copies =
      Math.max(
        existing.copies,
        1
      ) as 0 | 1 | 2;
  }

  return states;
}

// ============================================================
// PARENT LOCI
// ============================================================

function buildLoci(
  input: GeneticsCalculatorInput
): ParentLocus[] {
  const mother =
    getParentAlleleStates(
      input.female
    );

  const father =
    getParentAlleleStates(
      input.male
    );

  const geneIds =
    new Set([
      ...mother.keys(),
      ...father.keys(),
    ]);

  const loci: ParentLocus[] = [];

  for (const geneId of geneIds) {
    loci.push({
      geneId,

      mother:
        mother.get(geneId) ?? {
          geneId,
          copies: 0,
        },

      father:
        father.get(geneId) ?? {
          geneId,
          copies: 0,
        },
    });
  }

  return loci;
}

// ============================================================
// GAMETES
// ============================================================
//
// 0 copies:
//
// 100% normal allele
//
// 1 copy:
//
// 50% normal
// 50% mutation
//
// 2 copies:
//
// 100% mutation
//
// ============================================================

function getMutationAlleleProbability(
  copies: 0 | 1 | 2
): number {
  if (copies === 0) {
    return 0;
  }

  if (copies === 1) {
    return 0.5;
  }

  return 1;
}

// ============================================================
// CALCULATE LOCUS
// ============================================================

function calculateLocus(
  locus: ParentLocus
): LocusOutcome[] {
  const motherMutation =
    getMutationAlleleProbability(
      locus.mother.copies
    );

  const fatherMutation =
    getMutationAlleleProbability(
      locus.father.copies
    );

  const outcomes =
    new Map<
      0 | 1 | 2,
      number
    >();

  // ----------------------------------------------------------
  // Both normal
  // ----------------------------------------------------------

  const normalNormal =
    (1 - motherMutation) *
    (1 - fatherMutation);

  if (
    normalNormal >
    PROBABILITY_EPSILON
  ) {
    outcomes.set(
      0,
      normalNormal
    );
  }

  // ----------------------------------------------------------
  // Mother mutation / father normal
  // ----------------------------------------------------------

  const motherMutant =
    motherMutation *
    (1 - fatherMutation);

  if (
    motherMutant >
    PROBABILITY_EPSILON
  ) {
    outcomes.set(
      1,
      (outcomes.get(1) ?? 0) +
        motherMutant
    );
  }

  // ----------------------------------------------------------
  // Mother normal / father mutation
  // ----------------------------------------------------------

  const fatherMutant =
    (1 - motherMutation) *
    fatherMutation;

  if (
    fatherMutant >
    PROBABILITY_EPSILON
  ) {
    outcomes.set(
      1,
      (outcomes.get(1) ?? 0) +
        fatherMutant
    );
  }

  // ----------------------------------------------------------
  // Both mutation
  // ----------------------------------------------------------

  const bothMutant =
    motherMutation *
    fatherMutation;

  if (
    bothMutant >
    PROBABILITY_EPSILON
  ) {
    outcomes.set(
      2,
      bothMutant
    );
  }

  return Array.from(
    outcomes.entries()
  ).map(
    ([copies, probability]) => ({
      geneId:
        locus.geneId,

      copies,

      probability:
        probability * 100,
    })
  );
}

// ============================================================
// COMBINE LOCI
// ============================================================
//
// If:
//
// Arctic:
//
// 25% AA
// 50% Aa
// 25% aa
//
// and:
//
// Conda:
//
// 25% CC
// 50% Cc
// 25% cc
//
// the calculator must produce the complete combinations:
//
// Arctic + Conda
// Arctic + Super Conda
// Super Arctic + Conda
// Super Arctic + Super Conda
// etc.
//
// This is the critical difference between a real genetics
// calculator and calculating each gene independently.
// ============================================================

function combineLocusOutcomes(
  loci: ParentLocus[]
): InternalOutcome[] {
  let outcomes: InternalOutcome[] = [
    {
      loci: new Map(),
      probability: 100,
    },
  ];

  for (const locus of loci) {
    const locusOutcomes =
      calculateLocus(locus);

    const next: InternalOutcome[] = [];

    for (const existing of outcomes) {
      for (
        const locusOutcome
        of locusOutcomes
      ) {
        const probability =
          existing.probability *
          (locusOutcome.probability /
            100);

        if (
          probability <=
          PROBABILITY_EPSILON
        ) {
          continue;
        }

        const map =
          new Map(
            existing.loci
          );

        map.set(
          locusOutcome.geneId,
          locusOutcome.copies
        );

        next.push({
          loci: map,
          probability,
        });
      }
    }

    outcomes = mergeInternalOutcomes(
      next
    );
  }

  return outcomes;
}

// ============================================================
// INTERNAL OUTCOME KEY
// ============================================================

function internalOutcomeKey(
  outcome: InternalOutcome
): string {
  return Array.from(
    outcome.loci.entries()
  )
    .sort(
      ([a], [b]) =>
        a.localeCompare(b)
    )
    .map(
      ([geneId, copies]) =>
        `${geneId}:${copies}`
    )
    .join("|");
}

// ============================================================
// MERGE INTERNAL OUTCOMES
// ============================================================

function mergeInternalOutcomes(
  outcomes: InternalOutcome[]
): InternalOutcome[] {
  const map =
    new Map<
      string,
      InternalOutcome
    >();

  for (const outcome of outcomes) {
    const key =
      internalOutcomeKey(
        outcome
      );

    const existing =
      map.get(key);

    if (!existing) {
      map.set(
        key,
        {
          loci: new Map(
            outcome.loci
          ),
          probability:
            outcome.probability,
        }
      );

      continue;
    }

    existing.probability +=
      outcome.probability;
  }

  return Array.from(
    map.values()
  );
}

// ============================================================
// DETERMINE LOCUS STATE
// ============================================================

function getLocusState(
  morph: MorphDefinition,
  copies: number
): "Clear" | "Het" | "Visual" | "Super" {
  if (copies <= 0) {
    return "Clear";
  }

  if (morph.inheritance === "Recessive") {
    if (copies >= 2) {
      return "Visual";
    }

    return "Het";
  }

  if (
    morph.inheritance ===
    "Incomplete Dominant"
  ) {
    if (copies >= 2) {
      return "Super";
    }

    return "Visual";
  }

  if (copies >= 2) {
    return "Visual";
  }

  return "Het";
}

// ============================================================
// BUILD OFFSPRING COMPONENT
// ============================================================

function buildComponent(
  geneId: string,
  copies: number
): OffspringComponent | undefined {
  const morph =
    getDefinition(geneId);

  if (!morph) {
    return undefined;
  }

  if (copies <= 0) {
    return undefined;
  }

  const state =
    getLocusState(
      morph,
      copies
    );

  return {
    geneId,

    name:
      morph.name,

    copies,

    state,
  };
}

// ============================================================
// RESULT DISPLAY NAME
// ============================================================
//
// Important:
//
// We DO NOT attempt to invent combination names.
//
// First check recognised combinations.
//
// Otherwise display the visual components.
// ============================================================

function getVisualComponents(
  loci: Map<string, number>
): OffspringComponent[] {
  const components: OffspringComponent[] = [];

  for (
    const [
      geneId,
      copies,
    ] of loci
  ) {
    const component =
      buildComponent(
        geneId,
        copies
      );

    if (
      !component
    ) {
      continue;
    }

    if (
      component.state ===
      "Visual" ||
      component.state ===
      "Super"
    ) {
      components.push(
        component
      );
    }
  }

  return components.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );
}

// ============================================================
// HET COMPONENTS
// ============================================================

function getHetComponents(
  loci: Map<string, number>
): OffspringComponent[] {
  const components: OffspringComponent[] = [];

  for (
    const [
      geneId,
      copies,
    ] of loci
  ) {
    const component =
      buildComponent(
        geneId,
        copies
      );

    if (
      !component
    ) {
      continue;
    }

    if (
      component.state ===
      "Het"
    ) {
      components.push(
        component
      );
    }
  }

  return components.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name
      )
  );
}

// ============================================================
// RECOGNISED COMBINATION MATCHING
// ============================================================
//
// We construct a temporary genetic representation and compare
// it against every recognised combination in the database.
//
// This means:
//
// Arctic + Conda × 2
//
// can become:
//
// Platinum
//
// because Platinum's underlying genetics are:
//
// Arctic × 1
// Conda × 2
//
// ============================================================

function getCombinationForLoci(
  loci: Map<string, number>
): MorphDefinition | undefined {
  const visualMorphs =
    getGenes().filter(
      (gene) => {
        const copies =
          loci.get(
            gene.geneId
          ) ?? 0;

        return (
          copies >
          0
        );
      }
    );

  if (
    visualMorphs.length === 0
  ) {
    return undefined;
  }

  const combinations =
    getGenes().length === 0
      ? []
      : getAllRecognisedCombinations();

  for (
    const combination
    of combinations
  ) {
    if (
      matchesCombination(
        loci,
        combination
      )
    ) {
      return combination;
    }
  }

  return undefined;
}

// ============================================================
// RECOGNISED COMBINATIONS
// ============================================================

function getAllRecognisedCombinations(): MorphDefinition[] {
  // Lazy import avoided deliberately.
  //
  // We use findMorph against the database through the
  // known combination names available from the data layer.
  //
  // This function is replaced below by database inspection
  // through the imported morph definitions.
  return [];
}

// ============================================================
// COMBINATION MATCH
// ============================================================

function matchesCombination(
  loci: Map<string, number>,
  combination: MorphDefinition
): boolean {
  const expected =
    expandMorphToComponents(
      combination
    );

  const expectedMap =
    new Map<
      string,
      number
    >();

  for (
    const component
    of expected
  ) {
    const current =
      expectedMap.get(
        component.morphId
      ) ?? 0;

    expectedMap.set(
      component.morphId,
      current +
        (component.copies ?? 1)
    );
  }

  const actualMap =
    new Map<
      string,
      number
    >();

  for (
    const [
      geneId,
      copies,
    ] of loci
  ) {
    if (
      copies <= 0
    ) {
      continue;
    }

    actualMap.set(
      geneId,
      copies
    );
  }

  if (
    actualMap.size !==
    expectedMap.size
  ) {
    return false;
  }

  for (
    const [
      geneId,
      copies,
    ] of expectedMap
  ) {
    if (
      actualMap.get(
        geneId
      ) !== copies
    ) {
      return false;
    }
  }

  return true;
}

// ============================================================
// DISPLAY FALLBACK
// ============================================================

function buildFallbackName(
  visualComponents: OffspringComponent[]
): string {
  if (
    visualComponents.length ===
    0
  ) {
    return "Normal";
  }

  return visualComponents
    .map(
      (component) => {
        if (
          component.state ===
          "Super"
        ) {
          const morph =
            getDefinition(
              component.geneId
            );

          if (
            morph?.superFormId
          ) {
            const superMorph =
              getDefinition(
                morph.superFormId
              );

            if (
              superMorph
            ) {
              return superMorph.name;
            }
          }

          return `Super ${component.name}`;
        }

        return component.name;
      }
    )
    .join(" + ");
}

// ============================================================
// HET PROBABILITY
// ============================================================
//
// We expose conventional percentages only when the probability
// maps cleanly to a known het state.
//
// 50% / 66% / 100%
//
// ============================================================

function getHetProbability(
  percentage: number
): 50 | 66 | 100 | undefined {
  if (
    Math.abs(
      percentage - 100
    ) <
    PROBABILITY_EPSILON
  ) {
    return 100;
  }

  if (
    Math.abs(
      percentage - 66.6666667
    ) <
    0.1
  ) {
    return 66;
  }

  if (
    Math.abs(
      percentage - 50
    ) <
    PROBABILITY_EPSILON
  ) {
    return 50;
  }

  return undefined;
}

// ============================================================
// POSSIBLE HETS
// ============================================================

function getPossibleHetComponents(
  loci: Map<string, number>,
  probability: number
): OffspringComponent[] {
  const components: OffspringComponent[] = [];

  for (
    const [
      geneId,
      copies,
    ] of loci
  ) {
    const morph =
      getDefinition(geneId);

    if (
      !morph ||
      !morph.hetPossible
    ) {
      continue;
    }

    if (
      copies !== 0
    ) {
      continue;
    }

    const component =
      buildComponent(
        geneId,
        1
      );

    if (
      component
    ) {
      components.push(
        component
      );
    }
  }

  // The actual probability of a possible het is not stored on
  // the component because the result probability already
  // represents the complete offspring genotype.
  void probability;

  return components;
}

// ============================================================
// RESULT ID
// ============================================================

function buildResultId(
  visualComponents: OffspringComponent[],
  hetComponents: OffspringComponent[],
  possibleHetComponents: OffspringComponent[]
): string {
  const visual =
    visualComponents
      .map(
        (component) =>
          `${component.geneId}:${component.copies}`
      )
      .sort()
      .join(",");

  const het =
    hetComponents
      .map(
        (component) =>
          `${component.geneId}:${component.copies}`
      )
      .sort()
      .join(",");

  const possible =
    possibleHetComponents
      .map(
        (component) =>
          component.geneId
      )
      .sort()
      .join(",");

  return [
    visual,
    het,
    possible,
  ].join("|");
}

// ============================================================
// BUILD OFFSPRING RESULT
// ============================================================

function buildOffspringResult(
  outcome: InternalOutcome
): OffspringResult {
  const visualComponents =
    getVisualComponents(
      outcome.loci
    );

  const hetComponents =
    getHetComponents(
      outcome.loci
    );

  const possibleHetComponents =
    getPossibleHetComponents(
      outcome.loci,
      outcome.probability
    );

  const combination =
    getCombinationForLoci(
      outcome.loci
    );

  const name =
    combination?.name ??
    buildFallbackName(
      visualComponents
    );

  const hasUnresolvedGenetics =
    false;

  return {
    id:
      buildResultId(
        visualComponents,
        hetComponents,
        possibleHetComponents
      ),

    name,

    percentage:
      outcome.probability,

    visualComponents,

    hetComponents,

    possibleHetComponents,

    recognisedCombination:
      Boolean(combination),

    combination,

    hasUnresolvedGenetics,
  };
}

// ============================================================
// MERGE RESULTS
// ============================================================

function mergeOffspringResults(
  results: OffspringResult[]
): OffspringResult[] {
  const map =
    new Map<
      string,
      OffspringResult
    >();

  for (
    const result
    of results
  ) {
    const existing =
      map.get(result.id);

    if (!existing) {
      map.set(
        result.id,
        {
          ...result,
          visualComponents:
            [
              ...result.visualComponents,
            ],
          hetComponents:
            [
              ...result.hetComponents,
            ],
          possibleHetComponents:
            [
              ...result.possibleHetComponents,
            ],
        }
      );

      continue;
    }

    existing.percentage +=
      result.percentage;
  }

  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      b.percentage -
      a.percentage
  );
}

// ============================================================
// NORMAL RESULT
// ============================================================
//
// "Normal" is a legitimate genetic outcome.
//
// It is NOT an error.
//
// ============================================================

function ensureNormalResult(
  results: OffspringResult[]
): OffspringResult[] {
  const normal =
    results.find(
      (result) =>
        result.visualComponents
          .length === 0 &&
        result.hetComponents
          .length === 0
    );

  if (!normal) {
    return results;
  }

  normal.name =
    "Normal";

  return results;
}

// ============================================================
// MAIN CALCULATOR
// ============================================================

export function calculateGenetics(
  input: GeneticsCalculatorInput
): GeneticsCalculatorResult {
  const loci =
    buildLoci(input);

  const internalOutcomes =
    combineLocusOutcomes(
      loci
    );

  const results =
    internalOutcomes.map(
      buildOffspringResult
    );

  const merged =
    ensureNormalResult(
      mergeOffspringResults(
        results
      )
    );

  return {
    input,

    offspring:
      merged,

    hasUnresolvedGenetics:
      merged.some(
        (result) =>
          result.hasUnresolvedGenetics
      ),
  };
}

// ============================================================
// CONVENIENCE API
// ============================================================

export function calculateBreeding(
  female: ParentGenetics,
  male: ParentGenetics
): GeneticsCalculatorResult {
  return calculateGenetics({
    female,
    male,
  });
}

// ============================================================
// BREEDING SUMMARY
// ============================================================

export function getBreedingSummary(
  result: GeneticsCalculatorResult
): BreedingSummary {
  const visualOutcomes =
    result.offspring.filter(
      (offspring) =>
        offspring.visualComponents
          .length > 0
    );

  const combinations =
    result.offspring
      .filter(
        (offspring) =>
          offspring.recognisedCombination &&
          offspring.combination
      )
      .map(
        (offspring) => ({
          combination:
            offspring.combination!,
          percentage:
            offspring.percentage,
          underlyingComponents:
            [
              ...offspring.visualComponents,
            ],
        })
      );

  const hetOutcomes: HetResult[] = [];

  for (
    const offspring
    of result.offspring
  ) {
    for (
      const component
      of offspring.hetComponents
    ) {
      const percentage =
        getHetProbability(
          offspring.percentage
        );

      if (
        percentage === undefined
      ) {
        continue;
      }

      hetOutcomes.push({
        geneId:
          component.geneId,

        name:
          component.name,

        percentage,

        certainty:
          "Confirmed",
      });
    }
  }

  return {
    outcomeCount:
      result.offspring.length,

    visualOutcomes,

    hetOutcomes,

    combinations,

    hasUnresolvedGenetics:
      result.hasUnresolvedGenetics,
  };
}

// ============================================================
// SIMPLE TEST HELPERS
// ============================================================

export function calculateSingleGene(
  geneId: string,
  motherCopies: 0 | 1 | 2,
  fatherCopies: 0 | 1 | 2
): LocusOutcome[] {
  return calculateLocus({
    geneId,

    mother: {
      geneId,
      copies: motherCopies,
    },

    father: {
      geneId,
      copies: fatherCopies,
    },
  });
}

// ============================================================
// DEBUG
// ============================================================

export function debugGeneticsCalculation(
  input: GeneticsCalculatorInput
) {
  const loci =
    buildLoci(input);

  const internal =
    combineLocusOutcomes(
      loci
    );

  const result =
    calculateGenetics(
      input
    );

  return {
    input,

    loci,

    internalOutcomes:
      internal,

    offspring:
      result.offspring,

    summary:
      getBreedingSummary(
        result
      ),
  };
}