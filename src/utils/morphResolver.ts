import {
  findMorph,
  getMorphByGeneId,
  getCombinations,
  type MorphComponent,
  type MorphDefinition,
} from "../data/morphs";


// ============================================================
// TINY TITANS — MORPH RESOLVER
// ============================================================
//
// Converts selected morph names into:
//
// • recognised combinations
// • underlying components
// • display names
// • genetic components
//
// IMPORTANT:
//
// A combination is NEVER treated as an independent gene.
//
// Example:
//
// Arctic + Super Conda
//
// becomes:
//
// Platinum
//
// while the underlying genetics remain:
//
// Arctic
// Conda x2
//
// ============================================================


// ============================================================
// TYPES
// ============================================================

export type ResolvedMorph = {
  /**
   * Original user selections.
   */
  selected: string[];

  /**
   * Recognised combination, if one exists.
   */
  combination?: MorphDefinition;

  /**
   * Components that make up the recognised combination.
   */
  components: MorphComponent[];

  /**
   * Display name for the resolved result.
   *
   * Example:
   *
   * "Platinum"
   *
   * or:
   *
   * "Arctic + Conda"
   */
  displayName: string;

  /**
   * Whether a recognised combination was found.
   */
  recognisedCombination: boolean;

  /**
   * Whether the result has unresolved genetics.
   */
  hasUnresolvedComponents: boolean;
};


// ============================================================
// NORMALISATION
// ============================================================

/**
 * Normalise a morph name so comparisons are reliable.
 *
 * This deliberately handles:
 *
 * Arctic SuperConda
 * Arctic Super Conda
 *
 * as the same value when aliases exist.
 */
function normaliseMorphName(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


// ============================================================
// FIND MORPH
// ============================================================

function resolveDefinition(
  value: string
): MorphDefinition | undefined {
  return findMorph(value);
}


// ============================================================
// COMPONENT KEY
// ============================================================
//
// Used to compare component sets regardless of
// ordering.
//
// Arctic + Super Conda
//
// is equivalent to:
//
// Super Conda + Arctic
//
// ============================================================

function componentKey(
  component: MorphComponent
): string {
  return [
    component.morphId,
    component.type,
    component.copies ?? 1,
  ].join(":");
}


function sortedComponentKeys(
  components: MorphComponent[]
): string[] {
  return components
    .map(componentKey)
    .sort();
}


// ============================================================
// COMPONENT MATCH
// ============================================================

function componentsMatch(
  selected: MorphComponent[],
  expected: MorphComponent[]
): boolean {
  const selectedKeys =
    sortedComponentKeys(selected);

  const expectedKeys =
    sortedComponentKeys(expected);

  if (
    selectedKeys.length !==
    expectedKeys.length
  ) {
    return false;
  }

  return selectedKeys.every(
    (value, index) =>
      value === expectedKeys[index]
  );
}


// ============================================================
// EXPAND MORPH
// ============================================================
//
// Converts:
//
// Super Conda
//
// into:
//
// Conda x2
//
// This is critical for genetics calculations.
//
// ============================================================

export function expandMorphToComponents(
  morph: MorphDefinition
): MorphComponent[] {
  if (
    morph.components &&
    morph.components.length > 0
  ) {
    return morph.components.flatMap(
      (component) => {

        const referenced =
          getMorphByGeneId(
            component.morphId
          );

        if (
          referenced &&
          referenced.components &&
          referenced.components.length > 0
        ) {
          return expandMorphToComponents(
            referenced
          ).map(
            (nested) => ({
              ...nested,

              copies:
                (nested.copies ?? 1) *
                (component.copies ?? 1),
            })
          );
        }

        return [
          {
            ...component,
            copies:
              component.copies ?? 1,
          },
        ];
      }
    );
  }

  return [
    {
      morphId: morph.geneId,
      type: morph.isGene
        ? "Gene"
        : "Line-bred",
      copies: 1,
    },
  ];
}


// ============================================================
// EXPAND SELECTED MORPHS
// ============================================================

export function expandSelectedMorphs(
  selectedMorphs: string[]
): MorphComponent[] {
  const expanded: MorphComponent[] = [];

  for (
    const selected of selectedMorphs
  ) {
    const morph =
      resolveDefinition(selected);

    if (!morph) {
      continue;
    }

    expanded.push(
      ...expandMorphToComponents(
        morph
      )
    );
  }

  return expanded;
}


// ============================================================
// REMOVE DUPLICATES
// ============================================================

function deduplicateComponents(
  components: MorphComponent[]
): MorphComponent[] {
  const map =
    new Map<string, MorphComponent>();

  for (
    const component of components
  ) {
    const key =
      componentKey(component);

    const existing =
      map.get(key);

    if (!existing) {
      map.set(
        key,
        {
          ...component,
          copies:
            component.copies ?? 1,
        }
      );

      continue;
    }

    existing.copies =
      (existing.copies ?? 1) +
      (component.copies ?? 1);
  }

  return Array.from(
    map.values()
  );
}


// ============================================================
// FIND RECOGNISED COMBINATION
// ============================================================
//
// This compares the underlying genetics.
//
// That means:
//
// Arctic + Super Conda
//
// can resolve to:
//
// Platinum
//
// even though Platinum itself isn't a gene.
//
// ============================================================

export function findRecognisedCombination(
  selectedMorphs: string[]
): MorphDefinition | undefined {

  const selectedDefinitions =
    selectedMorphs
      .map(resolveDefinition)
      .filter(
        (
          morph
        ): morph is MorphDefinition =>
          Boolean(morph)
      );

  if (
    selectedDefinitions.length === 0
  ) {
    return undefined;
  }


  // ----------------------------------------------------------
  // First try exact named combination matching.
  // ----------------------------------------------------------

  const combinationCandidates =
    getCombinations();


  for (
    const combination
      of combinationCandidates
  ) {

    if (
      !combination.components ||
      combination.components.length === 0
    ) {
      continue;
    }


    const candidateComponents =
      selectedDefinitions.flatMap(
        (morph) =>
          expandMorphToComponents(
            morph
          )
      );


    const expectedComponents =
      expandMorphToComponents(
        combination
      );


    const candidateDeduped =
      deduplicateComponents(
        candidateComponents
      );


    const expectedDeduped =
      deduplicateComponents(
        expectedComponents
      );


    if (
      componentsMatch(
        candidateDeduped,
        expectedDeduped
      )
    ) {
      return combination;
    }
  }


  return undefined;
}


// ============================================================
// RESOLVE MORPH SELECTION
// ============================================================

export function resolveMorphSelection(
  selectedMorphs: string[]
): ResolvedMorph {

  const cleaned =
    selectedMorphs
      .map(normaliseMorphName)
      .filter(Boolean);


  if (
    cleaned.length === 0
  ) {
    return {
      selected: [],
      components: [],
      displayName: "",
      recognisedCombination: false,
      hasUnresolvedComponents: false,
    };
  }


  // ----------------------------------------------------------
  // Resolve names against database.
  // ----------------------------------------------------------

  const definitions =
    cleaned
      .map(resolveDefinition)
      .filter(
        (
          morph
        ): morph is MorphDefinition =>
          Boolean(morph)
      );


  // ----------------------------------------------------------
  // Find recognised combination.
  // ----------------------------------------------------------

  const combination =
    findRecognisedCombination(
      cleaned
    );


  // ----------------------------------------------------------
  // Expand underlying genetics.
  // ----------------------------------------------------------

  const components =
    deduplicateComponents(
      definitions.flatMap(
        (morph) =>
          expandMorphToComponents(
            morph
          )
      )
    );


  // ----------------------------------------------------------
  // Determine unresolved data.
  // ----------------------------------------------------------

  const hasUnresolvedComponents =
    definitions.some(
      (morph) =>
        morph.isCombination &&
        (!morph.components ||
          morph.components.length === 0)
    );


  // ----------------------------------------------------------
  // Display name.
  // ----------------------------------------------------------

  let displayName = cleaned
    .map((value) => {
      const definition =
        resolveDefinition(value);

      return (
        definition?.name ??
        value
      );
    })
    .join(" + ");


  if (combination) {
    displayName =
      combination.name;
  }


  return {
    selected: cleaned,
    combination,
    components,
    displayName,
    recognisedCombination:
      Boolean(combination),
    hasUnresolvedComponents,
  };
}


// ============================================================
// GET RECOGNISED COMBO NAME
// ============================================================

export function getRecognisedCombinationName(
  selectedMorphs: string[]
): string | undefined {
  return findRecognisedCombination(
    selectedMorphs
  )?.name;
}


// ============================================================
// GET UNDERLYING GENETICS
// ============================================================

export function getUnderlyingGenetics(
  selectedMorphs: string[]
): MorphComponent[] {
  return resolveMorphSelection(
    selectedMorphs
  ).components;
}


// ============================================================
// CHECK WHETHER SELECTION IS A COMBINATION
// ============================================================

export function isRecognisedCombination(
  selectedMorphs: string[]
): boolean {
  return Boolean(
    findRecognisedCombination(
      selectedMorphs
    )
  );
}


// ============================================================
// DISPLAY COMPONENT DESCRIPTION
// ============================================================

export function getCombinationExplanation(
  selectedMorphs: string[]
): string | undefined {

  const result =
    resolveMorphSelection(
      selectedMorphs
    );

  if (
    !result.combination
  ) {
    return undefined;
  }

  const components =
    result.combination.components
      ?.map(
        (component) => {

          const morph =
            getMorphByGeneId(
              component.morphId
            );

          if (!morph) {
            return component.morphId;
          }

          return morph.name;
        }
      )
      .join(" + ");

  if (!components) {
    return result.combination.description;
  }

  return `${result.combination.name} = ${components}`;
}