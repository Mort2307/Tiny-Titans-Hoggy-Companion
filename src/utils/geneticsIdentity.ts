// ============================================================
// TINY TITANS — GENETICS IDENTITY LAYER
// ============================================================
//
// SINGLE SOURCE OF TRUTH FOR GENETIC IDENTITY
//
// geneId = identity
// name   = presentation
// aliases = human-input resolution ONLY
//
// This layer sits between:
//
// • Morph database
// • Morph selector
// • Het selector
// • Snake data
// • Genetics calculator
// • Breeding planner
//
// IMPORTANT:
//
// DO NOT put genetics rules directly into UI components.
//
// ============================================================

import {
  getMorphByGeneId,
  getMorphByName,
  findMorph,
  resolveUnderlyingGenes,
  type MorphDefinition,
} from "../data/morphs";


// ============================================================
// TYPES
// ============================================================

export type GeneticIdentity = {
  geneId: string;
  name: string;
  morph: MorphDefinition;
};


export type UnderlyingGeneIdentity = {
  geneId: string;
  name: string;
  copies: number;
  morph: MorphDefinition;
};


export type HetPercentage =
  | "100%"
  | "66%"
  | "50%";


export type HetIdentity = {
  geneId: string;
  name: string;
  percentage: HetPercentage;
};


// ============================================================
// NORMALISATION
// ============================================================

/**
 * Deterministic comparison normalisation.
 *
 * IMPORTANT:
 *
 * This does NOT perform alias resolution.
 */
export function normaliseGeneticsValue(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}


// ============================================================
// STRICT MORPH RESOLUTION
// ============================================================

/**
 * Resolve a morph using ONLY:
 *
 * 1. geneId
 * 2. canonical database name
 *
 * Aliases are deliberately ignored.
 *
 * This function is safe for:
 *
 * • checkbox identity
 * • selected state
 * • saved-data migration
 * • genetics comparisons
 */
export function resolveStrictMorph(
  value: string,
  options?: MorphDefinition[]
): MorphDefinition | undefined {
  const normalised =
    normaliseGeneticsValue(value);


  if (options) {
    const byId =
      options.find(
        (morph) =>
          normaliseGeneticsValue(
            morph.geneId
          ) === normalised
      );


    if (byId) {
      return byId;
    }


    const byName =
      options.find(
        (morph) =>
          normaliseGeneticsValue(
            morph.name
          ) === normalised
      );


    if (byName) {
      return byName;
    }
  }


  return (
    getMorphByGeneId(value) ??
    getMorphByName(value)
  );
}


// ============================================================
// HUMAN INPUT RESOLUTION
// ============================================================

/**
 * Resolve human terminology.
 *
 * This MAY use aliases.
 *
 * Example:
 *
 * Arctic SuperConda
 *        ↓
 *     Platinum
 *
 * IMPORTANT:
 *
 * Never use this function to determine
 * checkbox identity.
 */
export function resolveMorphInput(
  value: string
): MorphDefinition | undefined {
  return findMorph(value);
}


// ============================================================
// GENETIC IDENTITY
// ============================================================

export function getGeneticIdentity(
  morph: MorphDefinition
): GeneticIdentity {
  return {
    geneId: morph.geneId,
    name: morph.name,
    morph,
  };
}


// ============================================================
// RESOLVE GENETIC IDENTITY
// ============================================================

export function resolveGeneticIdentity(
  value: string,
  options?: MorphDefinition[]
): GeneticIdentity | undefined {
  const morph =
    resolveStrictMorph(
      value,
      options
    );


  if (!morph) {
    return undefined;
  }


  return getGeneticIdentity(
    morph
  );
}


// ============================================================
// IDENTITY COMPARISON
// ============================================================

/**
 * Determine whether two values represent
 * the same database morph.
 *
 * Aliases are NOT considered equivalent.
 */
export function sameMorphIdentity(
  first: string,
  second: string,
  options?: MorphDefinition[]
): boolean {
  const firstMorph =
    resolveStrictMorph(
      first,
      options
    );


  const secondMorph =
    resolveStrictMorph(
      second,
      options
    );


  if (
    !firstMorph ||
    !secondMorph
  ) {
    return (
      normaliseGeneticsValue(
        first
      ) ===
      normaliseGeneticsValue(
        second
      )
    );
  }


  return (
    firstMorph.geneId ===
    secondMorph.geneId
  );
}


// ============================================================
// GENE ID HELPERS
// ============================================================

export function getGeneId(
  value: string,
  options?: MorphDefinition[]
): string | undefined {
  return resolveStrictMorph(
    value,
    options
  )?.geneId;
}


// ============================================================
// CANONICAL NAME
// ============================================================

export function getCanonicalMorphName(
  value: string,
  options?: MorphDefinition[]
): string {
  return (
    resolveStrictMorph(
      value,
      options
    )?.name ??
    value
  );
}


// ============================================================
// UNDERLYING GENETICS
// ============================================================

/**
 * Resolve a morph into its actual
 * underlying genetic components.
 *
 * Examples:
 *
 * Arctic
 * → Arctic × 1
 *
 * Super Arctic
 * → Arctic × 2
 *
 * Super Conda
 * → Conda × 2
 *
 * Platinum
 * → Arctic × 1
 * → Conda × 2
 *
 * The actual component relationships
 * come from morphs.ts.
 */
export function getUnderlyingGeneIdentities(
  value: string
): UnderlyingGeneIdentity[] {
  const components =
    resolveUnderlyingGenes(
      value
    );


  return components
    .map(
      (component) => {
        const morph =
          getMorphByGeneId(
            component.morphId
          );


        if (!morph) {
          return undefined;
        }


        return {
          geneId:
            morph.geneId,

          name:
            morph.name,

          copies:
            component.copies ??
            1,

          morph,
        };
      }
    )
    .filter(
      (
        item
      ): item is UnderlyingGeneIdentity =>
        Boolean(item)
    );
}


// ============================================================
// UNDERLYING GENE MAP
// ============================================================

/**
 * Return the underlying genes as:
 *
 * Map<geneId, copies>
 *
 * Example:
 *
 * Platinum
 *
 * arctic → 1
 * conda  → 2
 */
export function getUnderlyingGeneMap(
  value: string
): Map<string, number> {
  const identities =
    getUnderlyingGeneIdentities(
      value
    );


  const map =
    new Map<
      string,
      number
    >();


  for (
    const gene of identities
  ) {
    const existing =
      map.get(
        gene.geneId
      ) ?? 0;


    map.set(
      gene.geneId,
      existing +
        gene.copies
    );
  }


  return map;
}


// ============================================================
// GENE COPY COUNT
// ============================================================

export function getGeneCopies(
  morphValue: string,
  geneId: string
): number {
  return (
    getUnderlyingGeneMap(
      morphValue
    ).get(
      geneId
    ) ?? 0
  );
}


// ============================================================
// GENE CLASSIFICATION
// ============================================================

/**
 * Is this a genuine independent
 * Mendelian gene?
 */
export function isIndependentGene(
  value: string,
  options?: MorphDefinition[]
): boolean {
  const morph =
    resolveStrictMorph(
      value,
      options
    );


  return Boolean(
    morph?.isGene &&
    morph.kind === "Gene"
  );
}


// ============================================================
// SUPER FORM
// ============================================================

export function isSuperForm(
  value: string,
  options?: MorphDefinition[]
): boolean {
  const morph =
    resolveStrictMorph(
      value,
      options
    );


  return (
    morph?.kind ===
    "Super"
  );
}


// ============================================================
// COMBINATION
// ============================================================

export function isCombination(
  value: string,
  options?: MorphDefinition[]
): boolean {
  const morph =
    resolveStrictMorph(
      value,
      options
    );


  return (
    morph?.isCombination ===
    true
  );
}


// ============================================================
// HET GENE VALIDATION
// ============================================================

/**
 * Determine whether a morph definition
 * can legitimately exist as a het.
 */
export function isHetCapableGene(
  value: string,
  options?: MorphDefinition[]
): boolean {
  const morph =
    resolveStrictMorph(
      value,
      options
    );


  return Boolean(
    morph?.isGene &&
    morph.kind === "Gene" &&
    morph.hetPossible
  );
}


// ============================================================
// HET IDENTITY
// ============================================================

/**
 * Het percentage is separate from
 * gene identity.
 *
 * Therefore:
 *
 * Albino 100%
 * Albino 66%
 * Albino 50%
 *
 * are the same underlying gene
 * but different probability states.
 */
export function resolveHetIdentity(
  gene: string,
  percentage: HetPercentage,
  options?: MorphDefinition[]
): HetIdentity | undefined {
  const morph =
    resolveStrictMorph(
      gene,
      options
    );


  if (
    !morph ||
    !morph.isGene ||
    morph.kind !== "Gene" ||
    !morph.hetPossible
  ) {
    return undefined;
  }


  return {
    geneId:
      morph.geneId,

    name:
      morph.name,

    percentage,
  };
}


// ============================================================
// HET COMPARISON
// ============================================================

export function sameHetIdentity(
  firstGene: string,
  firstPercentage: HetPercentage,
  secondGene: string,
  secondPercentage: HetPercentage,
  options?: MorphDefinition[]
): boolean {
  const first =
    resolveHetIdentity(
      firstGene,
      firstPercentage,
      options
    );


  const second =
    resolveHetIdentity(
      secondGene,
      secondPercentage,
      options
    );


  if (
    !first ||
    !second
  ) {
    return (
      normaliseGeneticsValue(
        firstGene
      ) ===
      normaliseGeneticsValue(
        secondGene
      ) &&
      firstPercentage ===
        secondPercentage
    );
  }


  return (
    first.geneId ===
      second.geneId &&
    first.percentage ===
      second.percentage
  );
}


// ============================================================
// HET STATE CONFLICT
// ============================================================

/**
 * Determine whether a new het state conflicts
 * with an existing het state.
 *
 * IMPORTANT:
 *
 * Conflict exists ONLY when the underlying
 * gene is the same.
 *
 * Therefore:
 *
 * 50% Hypo
 * + 66% Hypo
 *
 * = conflict
 *
 * But:
 *
 * 50% Hypo
 * + 50% Albino
 *
 * = valid
 */
export function hetStatesConflict(
  firstGene: string,
  firstPercentage: HetPercentage,
  secondGene: string,
  secondPercentage: HetPercentage,
  options?: MorphDefinition[]
): boolean {
  const first =
    resolveHetIdentity(
      firstGene,
      firstPercentage,
      options
    );


  const second =
    resolveHetIdentity(
      secondGene,
      secondPercentage,
      options
    );


  if (
    !first ||
    !second
  ) {
    return (
      normaliseGeneticsValue(
        firstGene
      ) ===
      normaliseGeneticsValue(
        secondGene
      )
    );
  }


  return (
    first.geneId ===
    second.geneId
  );
}


// ============================================================
// HET SELECTION CHECK
// ============================================================

export type HetSelectionConflict = {
  geneId: string;
  name: string;
  percentage: HetPercentage;
};


/**
 * Find the existing het state that prevents
 * a new state from being selected.
 */
export function getHetSelectionConflict(
  gene: string,
  percentage: HetPercentage,
  selected: Array<{
    gene: string;
    percentage: HetPercentage;
  }>,
  options?: MorphDefinition[]
): HetSelectionConflict | undefined {
  const candidate =
    resolveHetIdentity(
      gene,
      percentage,
      options
    );


  if (!candidate) {
    return undefined;
  }


  for (
    const existing of selected
  ) {
    const existingIdentity =
      resolveHetIdentity(
        existing.gene,
        existing.percentage,
        options
      );


    if (
      !existingIdentity
    ) {
      continue;
    }


    if (
      existingIdentity.geneId ===
      candidate.geneId
    ) {
      return {
        geneId:
          existingIdentity.geneId,

        name:
          existingIdentity.name,

        percentage:
          existingIdentity.percentage,
      };
    }
  }


  return undefined;
}


// ============================================================
// CAN SELECT HET
// ============================================================

export function canSelectHet(
  gene: string,
  percentage: HetPercentage,
  selected: Array<{
    gene: string;
    percentage: HetPercentage;
  }>,
  options?: MorphDefinition[]
): boolean {
  return !getHetSelectionConflict(
    gene,
    percentage,
    selected,
    options
  );
}


// ============================================================
// SAFE GENE LISTS
// ============================================================

/**
 * Only genuine independent genes.
 */
export function getIndependentGenes(
  options: MorphDefinition[]
): MorphDefinition[] {
  return options.filter(
    (morph) =>
      morph.isGene &&
      morph.kind === "Gene"
  );
}


/**
 * Only genuine het-capable genes.
 */
export function getHetGenes(
  options: MorphDefinition[]
): MorphDefinition[] {
  return options.filter(
    (morph) =>
      morph.isGene &&
      morph.kind === "Gene" &&
      morph.hetPossible
  );
}


// ============================================================
// COMBINATION COMPONENT DISPLAY
// ============================================================

/**
 * Get the direct components used to
 * create a recognised combination.
 *
 * This is intentionally separate from
 * underlying genes.
 *
 * Example:
 *
 * Platinum
 *
 * Direct:
 * Arctic + Super Conda
 *
 * Underlying:
 * Arctic × 1
 * Conda × 2
 */
export function getCombinationComponents(
  value: string
): MorphDefinition[] {
  const morph =
    resolveMorphInput(
      value
    );


  if (
    !morph ||
    !morph.isCombination
  ) {
    return [];
  }


  const components =
    resolveUnderlyingGenes(
      value
    );


  return components
    .map(
      (component) =>
        getMorphByGeneId(
          component.morphId
        )
    )
    .filter(
      (
        item
      ): item is MorphDefinition =>
        Boolean(item)
    );
}


// ============================================================
// GENETIC SUMMARY
// ============================================================

export type GeneticSummary = {
  identity: GeneticIdentity;

  isGene: boolean;

  isSuper: boolean;

  isCombination: boolean;

  underlyingGenes:
    UnderlyingGeneIdentity[];

  directComponents:
    MorphDefinition[];
};


/**
 * Produce one complete genetic summary.
 *
 * This will become the basis for
 * the Morph Information panel.
 */
export function getGeneticSummary(
  value: string,
  options?: MorphDefinition[]
): GeneticSummary | undefined {
  const morph =
    resolveStrictMorph(
      value,
      options
    );


  if (!morph) {
    return undefined;
  }


  return {
    identity:
      getGeneticIdentity(
        morph
      ),

    isGene:
      Boolean(
        morph.isGene &&
        morph.kind === "Gene"
      ),

    isSuper:
      morph.kind ===
      "Super",

    isCombination:
      morph.isCombination ===
      true,

    underlyingGenes:
      getUnderlyingGeneIdentities(
        morph.name
      ),

    directComponents:
      getCombinationComponents(
        morph.name
      ),
  };
}


// ============================================================
// DEBUGGING
// ============================================================

/**
 * Development helper.
 */
export function debugGeneticIdentity(
  value: string
) {
  const strict =
    resolveStrictMorph(
      value
    );


  const resolved =
    resolveMorphInput(
      value
    );


  const underlying =
    getUnderlyingGeneIdentities(
      value
    );


  return {
    input:
      value,

    strict:
      strict
        ? {
            geneId:
              strict.geneId,

            name:
              strict.name,

            kind:
              strict.kind,
          }
        : undefined,

    aliasAware:
      resolved
        ? {
            geneId:
              resolved.geneId,

            name:
              resolved.name,

            kind:
              resolved.kind,
          }
        : undefined,

    underlyingGenes:
      underlying.map(
        (gene) => ({
          geneId:
            gene.geneId,

          name:
            gene.name,

          copies:
            gene.copies,
        })
      ),
  };
}