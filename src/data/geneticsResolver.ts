// ============================================================
// TINY TITANS — GENETICS RESOLVER
// ============================================================
//
// Converts user-facing morph selections into genetics-aware data.
//
// IMPORTANT:
//
// This file does NOT replace Snake.morphs.
//
// Snake data can continue storing:
//
//     morphs: string[]
//
// This resolver translates those names into:
//
// • canonical morph IDs
// • underlying genes
// • copy counts
// • recognised combinations
// • super forms
// • aliases
//
// This keeps the Genetics Calculator independent from display names.
//
// ============================================================

import {
  findMorph,
  getMorphByGeneId,
  type MorphComponent,
  type MorphDefinition,
} from "./morphs";

// ============================================================
// TYPES
// ============================================================

export type ResolvedGene = {
  geneId: string;

  name: string;

  /**
   * Number of known copies.
   *
   * Examples:
   *
   * Albino -> 2 when visually Albino
   * Arctic -> 1
   * Super Arctic -> 2
   */
  copies: number;

  /**
   * Which selected morph produced this
   * genetic component.
   */
  sourceMorphId: string;

  /**
   * Name of the selected morph that produced it.
   */
  sourceMorphName: string;
};

export type ResolvedMorph = {
  /**
   * The original value supplied by the user.
   */
  input: string;

  /**
   * Canonical database entry.
   */
  morph: MorphDefinition;

  /**
   * Underlying genetic components.
   */
  components: MorphComponent[];

  /**
   * Whether this entry is a true gene.
   */
  isGene: boolean;

  /**
   * Whether this entry is a recognised combination.
   */
  isCombination: boolean;

  /**
   * Whether this entry is a super form.
   */
  isSuper: boolean;
};

export type ResolvedGenetics = {
  /**
   * Successfully resolved user selections.
   */
  morphs: ResolvedMorph[];

  /**
   * Flattened genetic genes.
   *
   * This is what the Genetics Calculator should
   * eventually consume.
   */
  genes: ResolvedGene[];

  /**
   * Values that could not be resolved.
   *
   * These should NEVER be silently discarded.
   */
  unresolved: string[];
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Determine how many copies a component represents.
 *
 * Explicit component copies always win.
 *
 * Otherwise:
 *
 * Gene -> 1
 * Super -> 2
 *
 * Combination -> 1 unless the database specifies otherwise.
 */
function getComponentCopies(
  component: MorphComponent
): number {
  if (
    typeof component.copies ===
    "number"
  ) {
    return component.copies;
  }

  switch (component.type) {
    case "Super":
      return 2;

    case "Gene":
      return 1;

    case "Combination":
    case "Line-bred":
    default:
      return 1;
  }
}

/**
 * Resolve a component into its database definition.
 */
function resolveComponent(
  component: MorphComponent
): MorphDefinition | undefined {
  return getMorphByGeneId(
    component.morphId
  );
}

/**
 * Add a resolved gene while merging duplicate
 * components.
 */
function addGene(
  genes: ResolvedGene[],
  definition: MorphDefinition,
  copies: number,
  sourceMorph: MorphDefinition
): void {
  /**
   * Only actual genes belong in the flattened
   * genetics representation.
   */
  if (!definition.isGene) {
    return;
  }

  const existing =
    genes.find(
      (gene) =>
        gene.geneId ===
        definition.geneId
    );

  if (existing) {
    existing.copies += copies;
    return;
  }

  genes.push({
    geneId:
      definition.geneId,

    name:
      definition.name,

    copies,

    sourceMorphId:
      sourceMorph.geneId,

    sourceMorphName:
      sourceMorph.name,
  });
}

// ============================================================
// MORPH RESOLUTION
// ============================================================

/**
 * Resolve one user-facing morph value.
 *
 * Examples:
 *
 * "Albino"
 * "Super Arctic"
 * "Platinum"
 * "Arctic SuperConda"
 *
 * aliases are supported.
 */
export function resolveMorph(
  value: string
): ResolvedMorph | undefined {
  const morph =
    findMorph(value);

  if (!morph) {
    return undefined;
  }

  const components =
    morph.components ?? [];

  return {
    input: value,

    morph,

    components,

    isGene:
      morph.isGene &&
      morph.kind === "Gene",

    isCombination:
      morph.isCombination === true,

    isSuper:
      morph.kind === "Super",
  };
}

// ============================================================
// GENE RESOLUTION
// ============================================================

/**
 * Resolve a morph into its underlying genes.
 *
 * This is the important part of the system.
 *
 * Examples:
 *
 * Albino
 *     -> Albino × 2
 *
 * Arctic
 *     -> Arctic × 1
 *
 * Super Arctic
 *     -> Arctic × 2
 *
 * Super Conda
 *     -> Conda × 2
 *
 * Platinum
 *     -> Arctic × 1
 *     -> Conda × 2
 */
export function resolveMorphGenes(
  value: string
): ResolvedGene[] {
  const resolved =
    resolveMorph(value);

  if (!resolved) {
    return [];
  }

  const genes: ResolvedGene[] = [];

  /**
   * Standalone genetic gene.
   *
   * A visual recessive morph represents two copies.
   *
   * Dominant / incomplete-dominant visual morphs
   * represent one copy unless they are explicitly
   * represented as a Super.
   */
  if (
    resolved.isGene
  ) {
    const copies =
      resolved.morph.inheritance ===
      "Recessive"
        ? 2
        : 1;

    addGene(
      genes,
      resolved.morph,
      copies,
      resolved.morph
    );

    return genes;
  }

  /**
   * Combination / Super.
   *
   * Walk through every component and flatten it.
   */
  for (
    const component of
      resolved.components
  ) {
    const definition =
      resolveComponent(
        component
      );

    if (!definition) {
      continue;
    }

    const copies =
      getComponentCopies(
        component
      );

    addGene(
      genes,
      definition,
      copies,
      resolved.morph
    );
  }

  return genes;
}

// ============================================================
// FULL GENETICS RESOLUTION
// ============================================================

/**
 * Resolve an entire morph selection.
 *
 * Example:
 *
 * [
 *   "Platinum",
 *   "Albino"
 * ]
 *
 * becomes:
 *
 * Arctic × 1
 * Conda × 2
 * Albino × 2
 */
export function resolveGenetics(
  values: string[]
): ResolvedGenetics {
  const resolvedMorphs: ResolvedMorph[] = [];

  const genes: ResolvedGene[] = [];

  const unresolved: string[] = [];

  for (
    const value of values
  ) {
    const resolved =
      resolveMorph(value);

    if (!resolved) {
      unresolved.push(value);
      continue;
    }

    resolvedMorphs.push(
      resolved
    );

    const resolvedGenes =
      resolveMorphGenes(
        value
      );

    for (
      const gene of resolvedGenes
    ) {
      const existing =
        genes.find(
          (existingGene) =>
            existingGene.geneId ===
            gene.geneId
        );

      if (existing) {
        existing.copies +=
          gene.copies;
      } else {
        genes.push({
          ...gene,
        });
      }
    }
  }

  return {
    morphs:
      resolvedMorphs,

    genes,

    unresolved,
  };
}

// ============================================================
// SIMPLE LOOKUPS
// ============================================================

/**
 * Return the underlying gene IDs for a morph.
 *
 * Example:
 *
 * Platinum
 * -> ["arctic", "conda"]
 */
export function getUnderlyingGeneIds(
  value: string
): string[] {
  return resolveMorphGenes(
    value
  ).map(
    (gene) =>
      gene.geneId
  );
}

/**
 * Return the underlying gene names.
 */
export function getUnderlyingGeneNames(
  value: string
): string[] {
  return resolveMorphGenes(
    value
  ).map(
    (gene) =>
      gene.name
  );
}

/**
 * Return the total known copy count
 * for a particular gene within a morph.
 */
export function getGeneCopyCount(
  value: string,
  geneId: string
): number {
  return resolveMorphGenes(
    value
  )
    .filter(
      (gene) =>
        gene.geneId ===
        geneId
    )
    .reduce(
      (
        total,
        gene
      ) =>
        total +
        gene.copies,
      0
    );
}

/**
 * Determine whether a selected morph
 * contains a particular gene.
 */
export function morphContainsGene(
  value: string,
  geneId: string
): boolean {
  return getGeneCopyCount(
    value,
    geneId
  ) > 0;
}

/**
 * Determine whether a selected morph
 * contains two copies of a gene.
 */
export function morphIsHomozygousForGene(
  value: string,
  geneId: string
): boolean {
  return (
    getGeneCopyCount(
      value,
      geneId
    ) >= 2
  );
}

// ============================================================
// COMBINATION INFORMATION
// ============================================================

/**
 * Return the recognised components of a morph.
 *
 * This is useful for the Morph Library UI.
 *
 * Example:
 *
 * Platinum
 *
 * Components:
 *
 * Arctic
 * Super Conda
 */
export function getRecognisedComponents(
  value: string
): MorphDefinition[] {
  const resolved =
    resolveMorph(value);

  if (!resolved) {
    return [];
  }

  return resolved.components
    .map(
      (
        component
      ) =>
        resolveComponent(
          component
        )
    )
    .filter(
      (
        morph
      ): morph is MorphDefinition =>
        Boolean(morph)
    );
}

/**
 * Return a human-readable genetic breakdown.
 *
 * Example:
 *
 * Platinum
 *
 * "Arctic + Super Conda"
 */
export function getMorphBreakdown(
  value: string
): string {
  const resolved =
    resolveMorph(value);

  if (!resolved) {
    return value;
  }

  if (
    resolved.components.length ===
    0
  ) {
    return resolved.morph.name;
  }

  return resolved.components
    .map(
      (component) => {
        const definition =
          resolveComponent(
            component
          );

        if (!definition) {
          return component.morphId;
        }

        if (
          component.copies ===
          2 &&
          definition.isGene
        ) {
          return `2× ${definition.name}`;
        }

        return definition.name;
      }
    )
    .join(" + ");
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Check whether every supplied morph
 * exists in the database.
 */
export function allMorphsResolved(
  values: string[]
): boolean {
  return values.every(
    (value) =>
      Boolean(
        findMorph(value)
      )
  );
}

/**
 * Return only values that the database
 * cannot resolve.
 */
export function getUnresolvedMorphs(
  values: string[]
): string[] {
  return values.filter(
    (value) =>
      !findMorph(value)
  );
}

// ============================================================
// DEBUG / DEVELOPMENT
// ============================================================

/**
 * Useful during development.
 *
 * Example:
 *
 * debugResolveMorph("Platinum")
 *
 * Produces:
 *
 * {
 *   morph: "Platinum",
 *   genes: [
 *     {
 *       name: "Arctic",
 *       copies: 1
 *     },
 *     {
 *       name: "Conda",
 *       copies: 2
 *     }
 *   ]
 * }
 */
export function debugResolveMorph(
  value: string
) {
  const resolved =
    resolveMorph(value);

  const genes =
    resolveMorphGenes(
      value
    );

  return {
    input: value,

    morph:
      resolved?.morph.name ??
      null,

    components:
      resolved?.components ??
      [],

    genes,

    unresolved:
      !resolved,
  };
}