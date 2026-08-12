import {
  findMorph,
  getMorphByGeneId,
  type MorphComponent,
  type MorphDefinition,
} from "./morphs";

/**
 * ============================================================
 * TINY TITANS — MORPH RESOLVER
 * ============================================================
 *
 * Converts morph/combo names into their underlying components.
 *
 * Examples:
 *
 * Platinum
 *   -> Arctic
 *   -> Super Conda
 *
 * Super Conda
 *   -> Conda × 2
 *
 * Super Arctic
 *   -> Arctic × 2
 *
 * Arctic SuperConda
 *   -> Platinum
 *
 * IMPORTANT:
 * This resolver does NOT invent genetics.
 * It only follows confirmed information stored in morphs.ts.
 * ============================================================
 */

export type ResolvedMorphComponent = {
  morphId: string;
  name: string;
  type: MorphComponent["type"];
  copies: number;
};

export type ResolvedMorph = {
  input: string;
  morph: MorphDefinition;
  components: ResolvedMorphComponent[];
  recognisedCombination: boolean;
};

/**
 * Resolve a morph name or alias.
 */
export function resolveMorph(
  value: string
): MorphDefinition | undefined {
  return findMorph(value);
}

/**
 * Recursively resolve a morph into its underlying components.
 *
 * Example:
 *
 * Super Conda
 *
 * -> Conda x2
 */
export function resolveMorphComponents(
  morphId: string,
  visited: Set<string> = new Set()
): ResolvedMorphComponent[] {
  if (visited.has(morphId)) {
    return [];
  }

  visited.add(morphId);

  const morph = getMorphByGeneId(morphId);

  if (!morph) {
    return [];
  }

  /**
   * A true gene is already at the bottom
   * of the genetic tree.
   */
  if (morph.isGene && morph.kind === "Gene") {
    return [
      {
        morphId: morph.geneId,
        name: morph.name,
        type: "Gene",
        copies: 1,
      },
    ];
  }

  /**
   * No confirmed components means we
   * deliberately stop here.
   *
   * This is important for things such as
   * Yeti where the underlying genetics
   * have not yet been confirmed.
   */
  if (!morph.components?.length) {
    return [
      {
        morphId: morph.geneId,
        name: morph.name,
        type:
          morph.kind === "Project"
            ? "Line-bred"
            : morph.kind === "Super"
              ? "Super"
              : morph.kind === "Combination"
                ? "Combination"
                : "Line-bred",
        copies: 1,
      },
    ];
  }

  const resolved: ResolvedMorphComponent[] = [];

  for (const component of morph.components) {
    const componentMorph = getMorphByGeneId(
      component.morphId
    );

    if (!componentMorph) {
      continue;
    }

    /**
     * If this component is a true gene,
     * preserve its copy count.
     */
    if (
      componentMorph.isGene &&
      componentMorph.kind === "Gene"
    ) {
      resolved.push({
        morphId: componentMorph.geneId,
        name: componentMorph.name,
        type: component.type,
        copies: component.copies ?? 1,
      });

      continue;
    }

    /**
     * Otherwise recursively resolve it.
     *
     * Example:
     *
     * Platinum
     * -> Arctic
     * -> Super Conda
     * -> Conda x2
     */
    const nested = resolveMorphComponents(
      componentMorph.geneId,
      new Set(visited)
    );

    /**
     * Apply the component copy count
     * to the nested result.
     */
    const multiplier =
      component.copies ?? 1;

    for (const nestedComponent of nested) {
      resolved.push({
        ...nestedComponent,
        copies:
          nestedComponent.copies *
          multiplier,
      });
    }
  }

  return resolved;
}

/**
 * Resolve a user-entered morph name into
 * a complete genetic representation.
 */
export function resolveMorphDefinition(
  value: string
): ResolvedMorph | undefined {
  const morph = findMorph(value);

  if (!morph) {
    return undefined;
  }

  return {
    input: value,
    morph,
    components: resolveMorphComponents(
      morph.geneId
    ),
    recognisedCombination:
      morph.isCombination === true,
  };
}

/**
 * Get the underlying gene IDs.
 *
 * Example:
 *
 * Platinum
 * -> ["arctic", "conda"]
 */
export function getUnderlyingGeneIds(
  value: string
): string[] {
  const resolved =
    resolveMorphDefinition(value);

  if (!resolved) {
    return [];
  }

  return [
    ...new Set(
      resolved.components
        .filter(
          (component) =>
            component.type === "Gene" ||
            component.type === "Super"
        )
        .map(
          (component) =>
            component.morphId
        )
    ),
  ];
}

/**
 * Get a human-readable explanation of
 * what makes a combination.
 *
 * Example:
 *
 * Platinum
 *
 * Arctic
 * +
 * Conda × 2
 */
export function getMorphBreakdown(
  value: string
): string[] {
  const resolved =
    resolveMorphDefinition(value);

  if (!resolved) {
    return [];
  }

  return resolved.components.map(
    (component) => {
      if (component.copies > 1) {
        return `${component.name} × ${component.copies}`;
      }

      return component.name;
    }
  );
}

/**
 * Determine whether the supplied name is
 * a recognised combination.
 */
export function isRecognisedCombination(
  value: string
): boolean {
  const morph = findMorph(value);

  return Boolean(
    morph?.isCombination === true &&
      morph.verification === "Recognised"
  );
}

/**
 * Return the recognised combination name
 * for a supplied alias.
 *
 * Example:
 *
 * Arctic SuperConda
 * -> Platinum
 */
export function getRecognisedCombinationName(
  value: string
): string | undefined {
  const morph = findMorph(value);

  if (!morph) {
    return undefined;
  }

  if (
    morph.isCombination &&
    morph.verification === "Recognised"
  ) {
    return morph.name;
  }

  return undefined;
}

/**
 * Check whether two morph names represent
 * the same recognised combination.
 *
 * Example:
 *
 * Platinum
 * Arctic SuperConda
 *
 * -> true
 */
export function areSameMorph(
  first: string,
  second: string
): boolean {
  const firstMorph = findMorph(first);
  const secondMorph = findMorph(second);

  if (!firstMorph || !secondMorph) {
    return false;
  }

  return (
    firstMorph.geneId ===
    secondMorph.geneId
  );
}