// ============================================================
// TINY TITANS — GENETICS ENGINE
// ============================================================
//
// CORE INHERITANCE CALCULATION ENGINE
//
// IMPORTANT:
//
// This file contains GENETICS LOGIC only.
//
// UI components MUST NOT contain inheritance rules.
//
// Flow:
//
// Morph database
//      ↓
// geneticsIdentity
//      ↓
// geneticsEngine
//      ↓
// Calculator / Breeding Planner
//
// The engine works from underlying gene copies rather than
// display names.
//
// ============================================================

import {
  getMorphByGeneId,
  resolveUnderlyingGenes,
  type MorphDefinition,
} from "../data/morphs";

import {
  resolveStrictMorph,
  type HetPercentage,
} from "./geneticsIdentity";

// ============================================================
// TYPES
// ============================================================

export type ParentGeneState = {
  geneId: string;

  /**
   * Number of known copies.
   *
   * 0 = clear
   * 1 = single copy / het depending on inheritance
   * 2 = homozygous / super depending on inheritance
   */
  copies: number;

  /**
   * Whether the copy count is visually expressed.
   *
   * This is useful because recessive heterozygous animals
   * have one copy but do not display the trait.
   */
  visual: boolean;

  /**
   * Probability that this state is present.
   *
   * Normally 1 for known visual genetics.
   *
   * For 66% / 50% hets this represents uncertainty.
   */
  probability: number;
};

export type ParentGenetics = {
  visualMorphs: string[];

  hets: Array<{
    gene: string;
    percentage: HetPercentage;
  }>;
};

export type Gamete = {
  geneId: string;

  copies: number;

  probability: number;
};

export type OffspringGeneState = {
  geneId: string;

  copies: number;

  probability: number;
};

export type GeneticsOutcome = {
  probability: number;

  visualMorphs: string[];

  hets: Array<{
    geneId: string;
    name: string;
    percentage: HetPercentage;
  }>;

  geneStates: OffspringGeneState[];
};

export type GeneticsCalculation = {
  outcomes: GeneticsOutcome[];

  totalProbability: number;
};

// ============================================================
// CONSTANTS
// ============================================================



// ============================================================
// BASIC HELPERS
// ============================================================

function getMorph(
  geneId: string
): MorphDefinition | undefined {
  return getMorphByGeneId(geneId);
}

function roundProbability(
  value: number
): number {
  return Math.round(
    value * 1000000
  ) / 1000000;
}

function clampProbability(
  value: number
): number {
  return Math.max(
    0,
    Math.min(1, value)
  );
}

// ============================================================
// PERCENTAGE CONVERSION
// ============================================================

function hetPercentageToProbability(
  percentage: HetPercentage
): number {
  switch (percentage) {
    case "100%":
      return 1;

    case "66%":
      return 0.66;

    case "50%":
      return 0.5;

    default:
      return 0;
  }
}

// ============================================================
// RESOLVE GENE ID
// ============================================================

function resolveGeneId(
  value: string
): string | undefined {
  const morph =
    resolveStrictMorph(value);

  return morph?.geneId;
}

// ============================================================
// BUILD PARENT GENE STATES
// ============================================================

/**
 * Convert the UI representation of a parent into
 * underlying gene states.
 *
 * Visual genes and known hets are deliberately handled
 * separately.
 */
export function buildParentGeneStates(
  parent: ParentGenetics
): ParentGeneState[] {
  const states =
    new Map<
      string,
      ParentGeneState
    >();

  // ----------------------------------------------------------
  // VISUAL MORPHS
  // ----------------------------------------------------------

  for (
    const morphValue of
    parent.visualMorphs
  ) {
    const underlying =
      resolveUnderlyingGenes(
        morphValue
      );

    for (
      const component
      of underlying
    ) {
      const morph =
        getMorphByGeneId(
          component.morphId
        );

      if (!morph) {
        continue;
      }

      const copies =
        component.copies ?? 1;

      const existing =
        states.get(
          morph.geneId
        );

      if (!existing) {
        states.set(
          morph.geneId,
          {
            geneId:
              morph.geneId,

            copies,

            visual: true,

            probability: 1,
          }
        );

        continue;
      }

      existing.copies =
        Math.max(
          existing.copies,
          copies
        );

      existing.visual =
        true;
    }
  }

  // ----------------------------------------------------------
  // HETS
  // ----------------------------------------------------------

  for (
    const het of
    parent.hets
  ) {
    const geneId =
      resolveGeneId(
        het.gene
      );

    if (!geneId) {
      continue;
    }

    const probability =
      hetPercentageToProbability(
        het.percentage
      );

    const existing =
      states.get(
        geneId
      );

    if (!existing) {
      states.set(
        geneId,
        {
          geneId,

          copies: 1,

          visual: false,

          probability,
        }
      );

      continue;
    }

    /*
     * A visual recessive already implies two copies,
     * so a het entry for the same gene should not
     * reduce it back to one copy.
     */
    if (
      existing.copies >= 2
    ) {
      existing.probability =
        1;

      continue;
    }

    existing.copies =
      Math.max(
        existing.copies,
        1
      );

    existing.probability =
      Math.max(
        existing.probability,
        probability
      );
  }

  return Array.from(
    states.values()
  );
}

// ============================================================
// GET PARENT STATE
// ============================================================

export function getParentGeneState(
  parent: ParentGenetics,
  geneId: string
): ParentGeneState {
  const states =
    buildParentGeneStates(
      parent
    );

  return (
    states.find(
      (state) =>
        state.geneId ===
        geneId
    ) ?? {
      geneId,

      copies: 0,

      visual: false,

      probability: 1,
    }
  );
}

// ============================================================
// GAMETE GENERATION
// ============================================================

/**
 * Generate possible gametes for one gene.
 *
 * This deliberately models the common Western Hognose
 * Mendelian cases first.
 */
export function generateGametes(
  state: ParentGeneState
): Gamete[] {
  const morph =
    getMorph(
      state.geneId
    );

  if (!morph) {
    return [];
  }

  // ----------------------------------------------------------
  // CLEAR
  // ----------------------------------------------------------

  if (
    state.copies <= 0
  ) {
    return [
      {
        geneId:
          state.geneId,

        copies: 0,

        probability: 1,
      },
    ];
  }

  // ----------------------------------------------------------
  // TWO COPIES
  // ----------------------------------------------------------

  if (
    state.copies >= 2
  ) {
    return [
      {
        geneId:
          state.geneId,

        copies: 1,

        probability:
          clampProbability(
            state.probability
          ),
      },
    ];
  }

  // ----------------------------------------------------------
  // ONE COPY
  // ----------------------------------------------------------

  return [
    {
      geneId:
        state.geneId,

      copies: 1,

      probability:
        clampProbability(
          state.probability * 0.5
        ),
    },

    {
      geneId:
        state.geneId,

      copies: 0,

      probability:
        clampProbability(
          state.probability * 0.5
        ),
    },
  ];
}

// ============================================================
// COMBINE TWO GAMETES
// ============================================================

function combineGametes(
  mother: Gamete,
  father: Gamete
): OffspringGeneState {
  return {
    geneId:
      mother.geneId,

    copies:
      mother.copies +
      father.copies,

    probability:
      mother.probability *
      father.probability,
  };
}

// ============================================================
// INDEPENDENT GENE COLLECTION
// ============================================================

function collectRelevantGeneIds(
  mother: ParentGenetics,
  father: ParentGenetics
): string[] {
  const ids =
    new Set<string>();

  const parents = [
    mother,
    father,
  ];

  for (
    const parent
    of parents
  ) {
    for (
      const morph
      of parent.visualMorphs
    ) {
      const underlying =
        resolveUnderlyingGenes(
          morph
        );

      for (
        const component
        of underlying
      ) {
        ids.add(
          component.morphId
        );
      }
    }

    for (
      const het
      of parent.hets
    ) {
      const geneId =
        resolveGeneId(
          het.gene
        );

      if (geneId) {
        ids.add(
          geneId
        );
      }
    }
  }

  return Array.from(
    ids
  );
}

// ============================================================
// GENE CROSS
// ============================================================

type GeneCrossOutcome = {
  copies: number;

  probability: number;
};

/**
 * Calculate a single gene cross.
 */
export function calculateGeneCross(
  motherState: ParentGeneState,
  fatherState: ParentGeneState
): GeneCrossOutcome[] {
  const motherGametes =
    generateGametes(
      motherState
    );

  const fatherGametes =
    generateGametes(
      fatherState
    );

  const outcomes =
    new Map<
      number,
      number
    >();

  for (
    const motherGamete
    of motherGametes
  ) {
    for (
      const fatherGamete
      of fatherGametes
    ) {
      const combined =
  combineGametes(
    motherGamete,
    fatherGamete
  );

outcomes.set(
  combined.copies,
  (
    outcomes.get(
      combined.copies
    ) ?? 0
  ) + combined.probability
);
    }
  }

  return Array.from(
    outcomes.entries()
  )
    .map(
      ([
        copies,
        probability,
      ]) => ({
        copies,

        probability:
          roundProbability(
            probability
          ),
      })
    )
    .sort(
      (a, b) =>
        a.copies -
        b.copies
    );
}

// ============================================================
// RECESSIVE PHENOTYPE
// ============================================================

function isRecessiveVisual(
  morph: MorphDefinition,
  copies: number
): boolean {
  return (
    morph.inheritance ===
      "Recessive" &&
    copies >= 2
  );
}

// ============================================================
// INCOMPLETE DOMINANT PHENOTYPE
// ============================================================

function getIncompleteDominantVisual(
  morph: MorphDefinition,
  copies: number
): string | undefined {
  if (
    morph.inheritance !==
    "Incomplete Dominant"
  ) {
    return undefined;
  }

  if (
    copies >= 2
  ) {
    return (
      morph.superFormId ??
      morph.geneId
    );
  }

  if (
    copies === 1
  ) {
    return morph.geneId;
  }

  return undefined;
}

// ============================================================
// PHENOTYPE RESOLUTION
// ============================================================

/**
 * Resolve one gene state's visual expression.
 */
export function resolveGenePhenotype(
  geneId: string,
  copies: number
): string | undefined {
  const morph =
    getMorph(
      geneId
    );

  if (!morph) {
    return undefined;
  }

  if (
    morph.inheritance ===
    "Recessive"
  ) {
    return isRecessiveVisual(
      morph,
      copies
    )
      ? morph.geneId
      : undefined;
  }

  if (
    morph.inheritance ===
    "Incomplete Dominant"
  ) {
    return getIncompleteDominantVisual(
      morph,
      copies
    );
  }

  return undefined;
}

// ============================================================
// HET RESOLUTION
// ============================================================

function getHetProbabilityFromCopies(
  morph: MorphDefinition,
  copies: number
): HetPercentage | undefined {
  if (
    !morph.hetPossible
  ) {
    return undefined;
  }

  if (
    morph.inheritance !==
    "Recessive"
  ) {
    return undefined;
  }

  if (
    copies !== 1
  ) {
    return undefined;
  }

  return "100%";
}

// ============================================================
// SINGLE GENE OUTCOME
// ============================================================

export function resolveSingleGeneOutcome(
  geneId: string,
  copies: number
): {
  visual?: string;
  het?: HetPercentage;
} {
  const morph =
    getMorph(
      geneId
    );

  if (!morph) {
    return {};
  }

  const visual =
    resolveGenePhenotype(
      geneId,
      copies
    );

  if (visual) {
    return {
      visual,
    };
  }

  const het =
    getHetProbabilityFromCopies(
      morph,
      copies
    );

  if (het) {
    return {
      het,
    };
  }

  return {};
}

// ============================================================
// MULTI-GENE COMBINATION
// ============================================================

function resolveRecognisedCombination(
  visualGeneIds: string[]
): string | undefined {
  const visualSet =
    new Set(
      visualGeneIds
    );

  for (
    const morph
    of getAllCombinations()
  ) {
    if (
      !morph.isCombination ||
      !morph.components ||
      morph.components.length === 0
    ) {
      continue;
    }

    const required =
      resolveUnderlyingGenes(
        morph.name
      );

    if (
      required.length === 0
    ) {
      continue;
    }

    const requiredVisual =
      new Set(
        required
          .filter(
            (component) => {
              const componentMorph =
                getMorphByGeneId(
                  component.morphId
                );

              return Boolean(
                componentMorph
              );
            }
          )
          .map(
            (component) =>
              component.morphId
          )
      );

    let matches = true;

    for (
      const requiredGene
      of requiredVisual
    ) {
      if (
        !visualSet.has(
          requiredGene
        )
      ) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return morph.geneId;
    }
  }

  return undefined;
}

// ============================================================
// GET COMBINATIONS
// ============================================================

function getAllCombinations():
  MorphDefinition[] {
  /*
   * There is intentionally no separate combination database.
   * morphs.ts remains the source of truth.
   */

  const possibleIds =
    new Set<string>();

  for (
    const id of [
      "platinum",
      "arctic-conda",
      "super-arctic-conda",
      "super-arctic-super-conda",
      "crystal-diamond-super-conda",
      "pastel-sunset",
      "moondust",
      "yeti",
    ]
  ) {
    possibleIds.add(
      id
    );
  }

  return Array.from(
    possibleIds
  )
    .map(
      (id) =>
        getMorphByGeneId(
          id
        )
    )
    .filter(
      (
        morph
      ): morph is MorphDefinition =>
        Boolean(morph)
    );
}

// ============================================================
// OUTCOME KEY
// ============================================================

function getOutcomeKey(
  outcome: GeneticsOutcome
): string {
  const visuals =
    outcome.visualMorphs
      .slice()
      .sort()
      .join(",");

  const hets =
    outcome.hets
      .map(
        (het) =>
          `${het.geneId}:${het.percentage}`
      )
      .sort()
      .join(",");

  return `${visuals}|${hets}`;
}

// ============================================================
// COMBINE OUTCOMES
// ============================================================

function mergeOutcomes(
  outcomes: GeneticsOutcome[]
): GeneticsOutcome[] {
  const map =
    new Map<
      string,
      GeneticsOutcome
    >();

  for (
    const outcome
    of outcomes
  ) {
    const key =
      getOutcomeKey(
        outcome
      );

    const existing =
      map.get(
        key
      );

    if (!existing) {
      map.set(
        key,
        {
          ...outcome,

          visualMorphs:
            [
              ...outcome.visualMorphs,
            ],

          hets:
            [
              ...outcome.hets,
            ],

          geneStates:
            [
              ...outcome.geneStates,
            ],
        }
      );

      continue;
    }

    existing.probability +=
      outcome.probability;
  }

  return Array.from(
    map.values()
  )
    .map(
      (outcome) => ({
        ...outcome,

        probability:
          roundProbability(
            outcome.probability
          ),
      })
    )
    .sort(
      (a, b) =>
        b.probability -
        a.probability
    );
}

// ============================================================
// CALCULATE MULTI-GENE CROSS
// ============================================================

/**
 * Calculate all known independent genes.
 *
 * Each gene is calculated independently and then
 * combined into the final phenotype space.
 */
export function calculateGenetics(
  mother: ParentGenetics,
  father: ParentGenetics
): GeneticsCalculation {
  const geneIds =
    collectRelevantGeneIds(
      mother,
      father
    );

  if (
    geneIds.length === 0
  ) {
    return {
      outcomes: [],

      totalProbability: 0,
    };
  }

  let outcomes:
    GeneticsOutcome[] = [
      {
        probability: 1,

        visualMorphs: [],

        hets: [],

        geneStates: [],
      },
    ];

  // ----------------------------------------------------------
  // EACH GENE
  // ----------------------------------------------------------

  for (
    const geneId
    of geneIds
  ) {
    const motherState =
      getParentGeneState(
        mother,
        geneId
      );

    const fatherState =
      getParentGeneState(
        father,
        geneId
      );

    const geneCross =
      calculateGeneCross(
        motherState,
        fatherState
      );

    const next:
      GeneticsOutcome[] = [];

    for (
      const existing
      of outcomes
    ) {
      for (
        const geneOutcome
        of geneCross
      ) {
        const geneResult =
          resolveSingleGeneOutcome(
            geneId,
            geneOutcome.copies
          );

        const geneState:
          OffspringGeneState = {
            geneId,

            copies:
              geneOutcome.copies,

            probability:
              geneOutcome.probability,
          };

        next.push({
          probability:
            existing.probability *
            geneOutcome.probability,

          visualMorphs:
            [
              ...existing.visualMorphs,

              ...(geneResult.visual
                ? [
                    geneResult.visual,
                  ]
                : []),
            ],

          hets:
            [
              ...existing.hets,

              ...(geneResult.het
                ? [
                    {
                      geneId,

                      name:
                        getMorph(
                          geneId
                        )?.name ??
                        geneId,

                      percentage:
                        geneResult.het,
                    },
                  ]
                : []),
            ],

          geneStates:
            [
              ...existing.geneStates,

              geneState,
            ],
        });
      }
    }

    outcomes =
      mergeOutcomes(
        next
      );
  }

  // ----------------------------------------------------------
  // RECOGNISED COMBINATIONS
  // ----------------------------------------------------------

  outcomes =
    outcomes.map(
      (outcome) => {
        const combination =
          resolveRecognisedCombination(
            outcome.visualMorphs
          );

        if (
          !combination
        ) {
          return outcome;
        }

        return {
          ...outcome,

          visualMorphs: [
            combination,
          ],
        };
      }
    );

  outcomes =
    mergeOutcomes(
      outcomes
    );

  const totalProbability =
    outcomes.reduce(
      (
        total,
        outcome
      ) =>
        total +
        outcome.probability,
      0
    );

  return {
    outcomes,

    totalProbability:
      roundProbability(
        totalProbability
      ),
  };
}

// ============================================================
// CALCULATOR-FRIENDLY RESULTS
// ============================================================

export type CalculatorResult = {
  name: string;

  percentage: number;

  visualMorphs: string[];

  hets: string[];

  geneStates: OffspringGeneState[];
};

/**
 * Convert the engine result into the structure
 * currently expected by ResultCard.
 */
export function calculateCalculatorResults(
  mother: ParentGenetics,
  father: ParentGenetics
): CalculatorResult[] {
  const calculation =
    calculateGenetics(
      mother,
      father
    );

  return calculation.outcomes.map(
    (outcome) => {
      const visualNames =
        outcome.visualMorphs.map(
          (geneId) =>
            getMorph(
              geneId
            )?.name ??
            geneId
        );

      const hetNames =
        outcome.hets.map(
          (het) =>
            `${het.percentage} Het ${het.name}`
        );

      let name =
        visualNames.join(
          " + "
        );

      if (
        !name
      ) {
        name =
          hetNames.join(
            " + "
          );
      }

      if (
        !name
      ) {
        name =
          "No visual copy";
      }

      return {
        name,

        percentage:
          Math.round(
            outcome.probability *
              10000
          ) / 100,

        visualMorphs:
          outcome.visualMorphs,

        hets:
          hetNames,

        geneStates:
          outcome.geneStates,
      };
    }
  );
}

// ============================================================
// DEBUGGING
// ============================================================

export function debugGeneticsCross(
  mother: ParentGenetics,
  father: ParentGenetics
) {
  const calculation =
    calculateGenetics(
      mother,
      father
    );

  return {
    mother,

    father,

    outcomes:
      calculation.outcomes.map(
        (outcome) => ({
          probability:
            outcome.probability,

          percentage:
            outcome.probability *
            100,

          visualMorphs:
            outcome.visualMorphs.map(
              (geneId) =>
                getMorph(
                  geneId
                )?.name ??
                geneId
            ),

          hets:
            outcome.hets,

          geneStates:
            outcome.geneStates,
        })
      ),

    totalProbability:
      calculation.totalProbability,

    totalPercentage:
      calculation.totalProbability *
      100,
  };
}