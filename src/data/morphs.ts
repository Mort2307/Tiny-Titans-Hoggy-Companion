// ============================================================
// Tiny Titans Hoggy Companion
// Western Hognose Morph & Genetics Database
// ============================================================
//
// CENTRAL MORPH DATABASE
//
// RULES
// ------------------------------------------------------------
// Gene
//   = genuine genetic locus
//
// Super
//   = homozygous / two-copy form of a genuine gene
//
// Combination
//   = recognised phenotype/combo name made from confirmed
//     underlying components
//
// Line-bred
//   = selectively bred trait; NOT a Mendelian locus
//
// Polygenic
//   = polygenic trait; NOT a Mendelian locus
//
// Project
//   = breeding/project concept; NOT a confirmed locus
//
// Aliases
//   = lookup-only names
//
// Verification
//   = prevents uncertain information entering the calculator
//     as confirmed genetics
//
// ============================================================


// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type MorphKind =
  | "Gene"
  | "Super"
  | "Combination"
  | "Line-bred"
  | "Polygenic"
  | "Project";

export type InheritanceType =
  | "Recessive"
  | "Incomplete Dominant"
  | "Dominant"
  | "Polygenic"
  | "Line-bred"
  | "Project"
  | "Unknown";

export type VerificationStatus =
  | "Confirmed"
  | "Recognised"
  | "Unverified"
  | "Disputed";

export type MorphComponentType =
  | "Gene"
  | "Super"
  | "Line-bred"
  | "Polygenic"
  | "Project"
  | "Combination";

export interface MorphComponent {
  morphId: string;
  type: MorphComponentType;
  copies?: number;
}

export interface MorphDefinition {
  /**
   * Stable internal database identifier.
   *
   * NEVER use display names as genetic identifiers.
   */
  geneId: string;

  /**
   * Human-readable display name.
   */
  name: string;

  /**
   * Alternative recognised names.
   *
   * Lookup only.
   */
  aliases?: string[];

  /**
   * Biological/database classification.
   */
  kind: MorphKind;

  /**
   * True ONLY for an actual genetic locus.
   *
   * This is what the breeding selector uses.
   */
  isGene: boolean;

  /**
   * Stable identifier of the underlying gene for a Super.
   *
   * Example:
   *
   * Super Conda
   * -> conda
   *
   * Components remain the source of truth.
   */
  superFormId?: string;

  /**
   * Presentation/filtering category.
   */
  category?: string;

  /**
   * Recognised combination flag.
   */
  isCombination?: boolean;

  /**
   * Breeding/project flag.
   */
  isProject?: boolean;

  /**
   * Whether het notation is biologically applicable.
   */
  hetPossible?: boolean;

  /**
   * Inheritance mechanism.
   */
  inheritance: InheritanceType;

  /**
   * Explicit direct components.
   */
  components?: MorphComponent[];

  /**
   * Verification state.
   */
  verification: VerificationStatus;

  /**
   * Educational description.
   */
  description?: string;

  /**
   * Keeper-facing educational information.
   */
  educationalNotes?: string;
}

export interface RecognisedCombination {
  combinationId: string;
  name: string;
  components: MorphComponent[];
  aliases?: string[];
  verification: VerificationStatus;
  description?: string;
  educationalNotes?: string;
}


// ============================================================
// DATABASE
// ============================================================
//
// IMPORTANT
// ------------------------------------------------------------
// The entries below are the actual records used by:
//
// - Snake visual morph selector
// - Het selector
// - Genetics Calculator
// - Morph Library
// - Genetics engine
// - Search / lookup helpers
//
// ============================================================

export const morphs: MorphDefinition[] = [

  // ==========================================================
  // CORE MENDelian GENES
  // ==========================================================

  {
    geneId: "albino",
    name: "Albino",
    aliases: [
      "Amelanistic",
      "Amel",
    ],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Recessive",
    hetPossible: true,
    verification: "Confirmed",
    description:
      "A recessive amelanistic mutation that removes melanin, producing the familiar yellow, orange, cream and red-eyed Albino appearance.",
    educationalNotes:
      "Albino requires two copies to be visually expressed. A single copy is represented as het Albino.",
  },

  {
    geneId: "arctic",
    name: "Arctic",
    aliases: [],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Confirmed",
    description:
      "An incomplete-dominant pattern and colour mutation producing increased contrast, cleaner patterning and characteristic Arctic head markings.",
    educationalNotes:
      "One copy produces Arctic. Two copies produce Super Arctic.",
  },

  {
    geneId: "conda",
    name: "Conda",
    aliases: [
      "Anaconda",
    ],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Confirmed",
    description:
      "The pattern-reducing Anaconda/Conda mutation.",
    educationalNotes:
      "One copy produces Conda. Two copies produce Super Conda.",
  },

  {
    geneId: "axanthic",
    name: "Axanthic",
    aliases: [
      "Anery",
      "Anerythristic",
    ],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Recessive",
    hetPossible: true,
    verification: "Confirmed",
    description:
      "A recessive colour mutation reducing or removing yellow and red pigment, producing cooler grey, silver and black tones.",
    educationalNotes:
      "Axanthic is recessive. A single copy is represented as het Axanthic.",
  },

  {
    geneId: "lavender",
    name: "Lavender",
    aliases: [
      "Lav",
    ],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Recessive",
    hetPossible: true,
    verification: "Confirmed",
    description:
      "A recessive colour mutation producing lavender, lilac and grey-purple coloration.",
    educationalNotes:
      "Lavender requires two copies to be visual. A single copy is represented as het Lavender.",
  },

  {
    geneId: "caramel",
    name: "Caramel",
    aliases: [],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Recessive",
    hetPossible: true,
    verification: "Recognised",
    description:
      "A recognised recessive Western Hognose colour mutation.",
    educationalNotes:
      "Use only where the animal's lineage supports confirmed Caramel genetics.",
  },

  {
    geneId: "cinnamon",
    name: "Cinnamon",
    aliases: [],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Dominant",
    hetPossible: true,
    verification: "Recognised",
    description:
      "A recognised Western Hognose colour mutation.",
    educationalNotes:
      "Keep separate from visual line-bred colour traits. Current breeder/reference evidence describes Cinnamon as dominant with variable expression; do not infer it from appearance alone.",
  },

  {
    geneId: "toffeebelly",
    name: "Toffeebelly",
    aliases: [
      "Toffee",
      "Toffee Belly",
    ],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Recessive",
    hetPossible: true,
    verification: "Recognised",
    description:
      "A recognised recessive Western Hognose mutation associated with the Toffeebelly phenotype.",
    educationalNotes:
      "Treat Toffeebelly as recessive for confirmed genetic calculations.",
  },

  {
    geneId: "sable",
    name: "Sable",
    aliases: [],
    kind: "Gene",
    isGene: true,
    category: "Morph",
    inheritance: "Recessive",
    hetPossible: true,
    verification: "Recognised",
    description:
      "A recognised Western Hognose colour/pattern mutation.",
    educationalNotes:
      "Do not infer Sable from appearance alone unless the animal's genetics are confirmed.",
  },


  // ==========================================================
  // SUPER FORMS
  // ==========================================================

  {
    geneId: "super-arctic",
    name: "Super Arctic",
    aliases: [
      "Superarctic",
    ],
    kind: "Super",
    isGene: false,
    superFormId: "arctic",
    category: "Super",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Confirmed",
    components: [
      {
        morphId: "arctic",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "The two-copy form of Arctic.",
    educationalNotes:
      "Super Arctic is NOT a separate gene. It represents two copies of Arctic.",
  },

  {
    geneId: "super-conda",
    name: "Super Conda",
    aliases: [
      "Superconda",
    ],
    kind: "Super",
    isGene: false,
    superFormId: "conda",
    category: "Super",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Confirmed",
    components: [
      {
        morphId: "conda",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "The two-copy form of Conda/Anaconda.",
    educationalNotes:
      "Super Conda is NOT a separate gene. It represents two copies of Conda.",
  },


  // ==========================================================
  // RECOGNISED COMBINATIONS
  // ==========================================================

  {
    geneId: "platinum",
    name: "Platinum",
    aliases: [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "arctic",
        type: "Gene",
        copies: 1,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "A recognised Arctic and Super Conda combination.",
    educationalNotes:
      "The name Platinum does not become an independent gene. The calculator resolves it as Arctic ×1 + Conda ×2.",
  },

  {
    geneId: "snow",
    name: "Snow",
    aliases: [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "albino",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "axanthic",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "A recognised Albino and Axanthic combination.",
    educationalNotes:
      "Snow is a combination of two recessive mutations rather than a separate gene.",
  },

  {
    geneId: "super-arctic-conda",
    name: "Super Arctic Conda",
    aliases: [
      "Super Arctic Anaconda",
      "Superarctic Conda",
      "Superarctic Anaconda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "arctic",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 1,
      },
    ],
    description:
      "Super Arctic combined with one copy of Conda.",
    educationalNotes:
      "This is not a new locus. It resolves to Arctic ×2 + Conda ×1.",
  },

  {
    geneId: "arctic-super-conda",
    name: "Arctic Super Conda",
    aliases: [
      "Arctic Superconda",
      "Arctic Super Anaconda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "arctic",
        type: "Gene",
        copies: 1,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "Arctic combined with Super Conda.",
    educationalNotes:
      "This is the genetic structure represented by Arctic + Super Conda.",
  },

  {
    geneId: "albino-arctic",
    name: "Albino Arctic",
    aliases: [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "albino",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "arctic",
        type: "Gene",
        copies: 1,
      },
    ],
    description:
      "Albino combined with Arctic.",
    educationalNotes:
      "Albino remains recessive while Arctic is incompletely dominant.",
  },

  {
    geneId: "albino-conda",
    name: "Albino Conda",
    aliases: [
      "Albino Anaconda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "albino",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 1,
      },
    ],
    description:
      "Albino combined with Conda.",
    educationalNotes:
      "Albino requires two copies; Conda is expressed with one copy.",
  },

  {
    geneId: "albino-super-conda",
    name: "Albino Super Conda",
    aliases: [
      "Albino Superconda",
      "Albino Super Anaconda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "albino",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "Albino combined with Super Conda.",
    educationalNotes:
      "Resolves to Albino ×2 + Conda ×2.",
  },

  {
    geneId: "lavender-arctic",
    name: "Lavender Arctic",
    aliases: [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "lavender",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "arctic",
        type: "Gene",
        copies: 1,
      },
    ],
    description:
      "Lavender combined with Arctic.",
    educationalNotes:
      "Lavender is recessive; Arctic is incomplete dominant.",
  },

  {
    geneId: "lavender-conda",
    name: "Lavender Conda",
    aliases: [
      "Lavender Anaconda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "lavender",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 1,
      },
    ],
    description:
      "Lavender combined with Conda.",
    educationalNotes:
      "Resolves to Lavender ×2 + Conda ×1.",
  },

  {
    geneId: "lavender-super-conda",
    name: "Lavender Super Conda",
    aliases: [
      "Lavender Superconda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "lavender",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "conda",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "Lavender combined with Super Conda.",
    educationalNotes:
      "Resolves to Lavender ×2 + Conda ×2.",
  },

  {
    geneId: "lavender-super-arctic",
    name: "Lavender Super Arctic",
    aliases: [
      "Lavender Superarctic",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "lavender",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "arctic",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "Lavender combined with Super Arctic.",
    educationalNotes:
      "Resolves to Lavender ×2 + Arctic ×2.",
  },

  {
    geneId: "albino-lavender",
    name: "Albino Lavender",
    aliases: [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "albino",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "lavender",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "A recognised combination of Albino and Lavender.",
    educationalNotes:
      "Keep Albino and Lavender as independent recessive loci in the calculator.",
  },

  {
    geneId: "albino-axanthic",
    name: "Albino Axanthic",
    aliases: [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      {
        morphId: "albino",
        type: "Gene",
        copies: 2,
      },
      {
        morphId: "axanthic",
        type: "Gene",
        copies: 2,
      },
    ],
    description:
      "Albino and Axanthic expressed together.",
    educationalNotes:
      "This is the genetic structure commonly associated with Snow.",
  },


  // ==========================================================
  // LINE-BRED / POLYGENIC / PROJECT PLACEHOLDERS
  // ==========================================================
  //
  // These are deliberately NOT returned by getGenes().
  //
  // They can still exist in the database for the Morph Library
  // and future keeper-facing features.
  //
  // ==========================================================

  {
    geneId: "pastel",
    name: "Pastel",
    aliases: [],
    kind: "Line-bred",
    isGene: false,
    category: "Line-bred",
    inheritance: "Line-bred",
    hetPossible: false,
    verification: "Recognised",
    description:
      "A selectively bred colour/appearance trait rather than a confirmed single Mendelian locus.",
    educationalNotes:
      "Pastel should not be treated as a standard single-gene Mendelian mutation in the breeding engine.",
  },

  {
    geneId: "pink-pastel",
    name: "Pink Pastel",
    aliases: [
      "Pink Pastel Albino",
    ],
    kind: "Line-bred",
    isGene: false,
    category: "Line-bred",
    inheritance: "Line-bred",
    hetPossible: false,
    verification: "Recognised",
    description:
      "A selectively bred colour trait used in Western Hognose projects.",
    educationalNotes:
      "Do not create a fake Mendelian gene for Pink Pastel.",
  },

  {
    geneId: "extreme-red",
    name: "Extreme Red",
    aliases: [
      "RBE",
    ],
    kind: "Line-bred",
    isGene: false,
    category: "Line-bred",
    inheritance: "Line-bred",
    hetPossible: false,
    verification: "Recognised",
    description:
      "A selectively bred red-colour trait.",
    educationalNotes:
      "Treat as line-bred rather than automatically assigning Mendelian inheritance.",
  },

  {
    geneId: "savannah",
    name: "Savannah",
    aliases: [
      "Savanna",
    ],
    kind: "Project",
    isGene: false,
    isProject: true,
    category: "Project",
    inheritance: "Project",
    hetPossible: false,
    verification: "Unverified",
    description:
      "A breeding/project designation requiring cautious treatment until its underlying inheritance is sufficiently established.",
    educationalNotes:
      "Do not allow Savannah to become a confirmed Mendelian locus automatically.",
  },

];


// ============================================================
// INTERNAL LOOKUP HELPERS
// ============================================================

function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase();
}


// ============================================================
// BASIC LOOKUPS
// ============================================================

export function getMorphByGeneId(
  geneId: string
): MorphDefinition | undefined {
  const id = normalise(geneId);

  return morphs.find(
    (morph) =>
      normalise(morph.geneId) === id
  );
}


export function getMorphByName(
  name: string
): MorphDefinition | undefined {
  const target = normalise(name);

  return morphs.find(
    (morph) =>
      normalise(morph.name) === target
  );
}


export function findMorph(
  value: string
): MorphDefinition | undefined {
  const target = normalise(value);

  return morphs.find(
    (morph) =>
      normalise(morph.geneId) === target ||
      normalise(morph.name) === target ||
      (morph.aliases ?? []).some(
        (alias) =>
          normalise(alias) === target
      )
  );
}


export function resolveMorph(
  value: string
): MorphDefinition | undefined {
  return findMorph(value);
}


// ============================================================
// GENE FILTERS
// ============================================================

export function getGenes(): MorphDefinition[] {
  return morphs.filter(
    (morph) =>
      morph.isGene === true &&
      morph.kind === "Gene"
  );
}


export function getHetPossibleGenes(): MorphDefinition[] {
  return getGenes().filter(
    (morph) =>
      morph.hetPossible === true
  );
}


export function getSelectableGenes(): MorphDefinition[] {
  return getGenes();
}


export function isGeneticGene(
  value: string
): boolean {
  const morph = findMorph(value);

  return Boolean(
    morph?.isGene === true &&
    morph.kind === "Gene"
  );
}


// ============================================================
// CLASSIFICATION FILTERS
// ============================================================

export function getCombinations(): MorphDefinition[] {
  return morphs.filter(
    (morph) =>
      morph.isCombination === true ||
      morph.kind === "Combination"
  );
}


export function getProjects(): MorphDefinition[] {
  return morphs.filter(
    (morph) =>
      morph.isProject === true ||
      morph.kind === "Project"
  );
}


export function getLineBredTraits(): MorphDefinition[] {
  return morphs.filter(
    (morph) =>
      morph.kind === "Line-bred"
  );
}


export function getPolygenicTraits(): MorphDefinition[] {
  return morphs.filter(
    (morph) =>
      morph.kind === "Polygenic"
  );
}


export function getSuperForms(): MorphDefinition[] {
  return morphs.filter(
    (morph) =>
      morph.kind === "Super"
  );
}


// ============================================================
// CATEGORY FILTERS
// ============================================================

export function getMorphsByCategory(
  category: string
): MorphDefinition[] {
  const target = normalise(category);

  return morphs.filter(
    (morph) =>
      normalise(morph.category ?? "") === target
  );
}


export function getCategories(): string[] {
  return Array.from(
    new Set(
      morphs
        .map(
          (morph) =>
            morph.category
        )
        .filter(
          (
            category
          ): category is string =>
            Boolean(category)
        )
    )
  ).sort(
    (a, b) =>
      a.localeCompare(b)
  );
}


// ============================================================
// NAME HELPERS
// ============================================================

export function getMorphNames(): string[] {
  return morphs
    .map(
      (morph) =>
        morph.name
    )
    .sort(
      (a, b) =>
        a.localeCompare(b)
    );
}


export function getMorphSearchNames(): string[] {
  const names =
    new Set<string>();

  for (
    const morph of morphs
  ) {
    names.add(
      morph.name
    );

    names.add(
      morph.geneId
    );

    for (
      const alias of
        morph.aliases ?? []
    ) {
      names.add(alias);
    }
  }

  return Array.from(
    names
  ).sort(
    (a, b) =>
      a.localeCompare(b)
  );
}


// ============================================================
// DIRECT COMPONENT LOOKUP
// ============================================================

export function getMorphComponents(
  morphId: string
): MorphComponent[] {
  return (
    getMorphByGeneId(
      morphId
    )
      ?.components
      ?.map(
        (
          component
        ) => ({
          ...component,
          copies:
            component.copies ??
            1,
        })
      ) ?? []
  );
}


export function resolveMorphComponents(
  value: string
): MorphComponent[] {
  const morph =
    findMorph(value);

  if (!morph) {
    return [];
  }

  return getMorphComponents(
    morph.geneId
  );
}


// ============================================================
// SAFE GENETIC COMPONENT RESOLUTION
// ============================================================

export function resolveUnderlyingComponents(
  value: string
): MorphComponent[] {
  const morph =
    findMorph(value);

  if (!morph) {
    return [];
  }

  // Genuine genetic locus
  if (
    morph.kind === "Gene" &&
    morph.isGene === true
  ) {
    return [
      {
        morphId:
          morph.geneId,
        type:
          "Gene",
        copies:
          1,
      },
    ];
  }

  // No confirmed components
  if (
    !morph.components ||
    morph.components.length === 0
  ) {
    return [];
  }

  const resolved:
    MorphComponent[] = [];

  for (
    const component
    of morph.components
  ) {
    const componentMorph =
      getMorphByGeneId(
        component.morphId
      );

    if (!componentMorph) {
      continue;
    }

    const copies =
      component.copies ?? 1;

    // Genuine gene
    if (
      componentMorph.kind === "Gene" &&
      componentMorph.isGene === true
    ) {
      resolved.push({
        morphId:
          componentMorph.geneId,
        type:
          "Gene",
        copies,
      });

      continue;
    }

    // Super
    if (
      componentMorph.kind === "Super"
    ) {
      const nested =
        resolveUnderlyingComponents(
          componentMorph.geneId
        );

      for (
        const nestedComponent
        of nested
      ) {
        resolved.push({
          morphId:
            nestedComponent.morphId,
          type:
            nestedComponent.type,
          copies:
            (
              nestedComponent.copies ??
              1
            ) * copies,
        });
      }

      continue;
    }

    // Combination
    if (
      componentMorph.kind ===
        "Combination" ||
      componentMorph.isCombination ===
        true
    ) {
      const nested =
        resolveUnderlyingComponents(
          componentMorph.geneId
        );

      for (
        const nestedComponent
        of nested
      ) {
        resolved.push({
          morphId:
            nestedComponent.morphId,
          type:
            nestedComponent.type,
          copies:
            (
              nestedComponent.copies ??
              1
            ) * copies,
        });
      }

      continue;
    }

    // Non-Mendelian component
    resolved.push({
      morphId:
        componentMorph.geneId,
      type:
        component.type,
      copies,
    });
  }

  return mergeComponents(
    resolved
  );
}


// ============================================================
// STRICT GENETIC LOCUS RESOLUTION
// ============================================================

export function resolveUnderlyingGenes(
  value: string
): MorphComponent[] {
  return resolveUnderlyingComponents(
    value
  ).filter(
    (component) =>
      component.type === "Gene"
  );
}


// ============================================================
// COMPONENT MERGING
// ============================================================

export function mergeComponents(
  components: MorphComponent[]
): MorphComponent[] {
  const merged =
    new Map<
      string,
      MorphComponent
    >();

  for (
    const component
    of components
  ) {
    const copies =
      component.copies ?? 1;

    const existing =
      merged.get(
        component.morphId
      );

    if (!existing) {
      merged.set(
        component.morphId,
        {
          ...component,
          copies,
        }
      );

      continue;
    }

    existing.copies =
      (
        existing.copies ??
        1
      ) + copies;
  }

  return Array.from(
    merged.values()
  ).sort(
    (a, b) =>
      a.morphId.localeCompare(
        b.morphId
      )
  );
}


// ============================================================
// CANONICAL GENETIC SIGNATURE
// ============================================================

export function getComponentSignature(
  components: MorphComponent[]
): string {
  return mergeComponents(
    components
  )
    .filter(
      (component) =>
        component.type === "Gene"
    )
    .map(
      (component) =>
        `${component.morphId}:${component.copies ?? 1}`
    )
    .join("|");
}


export function getMorphSignature(
  value: string
): string {
  return getComponentSignature(
    resolveUnderlyingComponents(
      value
    )
  );
}


// ============================================================
// HUMAN-READABLE COMPOSITION
// ============================================================

export function getMorphComposition(
  value: string
): string {
  const components =
    resolveUnderlyingComponents(
      value
    );

  if (
    components.length === 0
  ) {
    return "";
  }

  return components
    .map(
      (component) => {
        const morph =
          getMorphByGeneId(
            component.morphId
          );

        if (!morph) {
          return component.morphId;
        }

        const copies =
          component.copies ?? 1;

        return copies === 1
          ? morph.name
          : `${morph.name} × ${copies}`;
      }
    )
    .join(" + ");
}


export function getDirectComposition(
  value: string
): string {
  const components =
    resolveMorphComponents(
      value
    );

  if (
    components.length === 0
  ) {
    return "";
  }

  return components
    .map(
      (component) => {
        const morph =
          getMorphByGeneId(
            component.morphId
          );

        if (!morph) {
          return component.morphId;
        }

        const copies =
          component.copies ?? 1;

        return copies === 1
          ? morph.name
          : `${morph.name} × ${copies}`;
      }
    )
    .join(" + ");
}


// ============================================================
// RECOGNISED COMBINATION MATCHING
// ============================================================

export function findRecognisedCombination(
  values: string[]
): MorphDefinition | undefined {
  const matches =
    findRecognisedCombinationsForValues(
      values
    );

  return matches.length > 0
    ? matches[0]
    : undefined;
}


export function findRecognisedCombinationsForValues(
  values: string[]
): MorphDefinition[] {
  const cleaned =
    values
      .map(normalise)
      .filter(Boolean);

  if (
    cleaned.length === 0
  ) {
    return [];
  }

  const selectedComponents:
    MorphComponent[] = [];

  for (
    const value
    of cleaned
  ) {
    selectedComponents.push(
      ...resolveUnderlyingComponents(
        value
      )
    );
  }

  const selectedSignature =
    getComponentSignature(
      selectedComponents
    );

  if (
    !selectedSignature
  ) {
    return [];
  }

  return morphs.filter(
    (morph) => {
      if (
        morph.kind !==
          "Combination" &&
        morph.isCombination !==
          true
      ) {
        return false;
      }

      if (
        morph.verification ===
        "Disputed"
      ) {
        return false;
      }

      const signature =
        getComponentSignature(
          resolveUnderlyingComponents(
            morph.geneId
          )
        );

      if (!signature) {
        return false;
      }

      return (
        signature ===
        selectedSignature
      );
    }
  );
}


// ============================================================
// COMBINATION INFORMATION
// ============================================================

export function getRecognisedCombinationInfo(
  values: string[]
):
  | {
      combination: MorphDefinition;
      selectedComposition: string;
      recognisedComposition: string;
    }
  | undefined {
  const combination =
    findRecognisedCombination(
      values
    );

  if (!combination) {
    return undefined;
  }

  return {
    combination,

    selectedComposition:
      values
        .map(
          (value) =>
            findMorph(value)?.name ??
            value
        )
        .join(" + "),

    recognisedComposition:
      getMorphComposition(
        combination.geneId
      ),
  };
}


// ============================================================
// VERIFICATION HELPERS
// ============================================================

export function getMorphVerification(
  value: string
): VerificationStatus | undefined {
  return findMorph(
    value
  )?.verification;
}


export function hasConfirmedComponents(
  value: string
): boolean {
  const morph =
    findMorph(value);

  if (!morph) {
    return false;
  }

  if (
    morph.kind === "Gene" &&
    morph.isGene === true
  ) {
    return (
      morph.verification ===
        "Confirmed" ||
      morph.verification ===
        "Recognised"
    );
  }

  return Boolean(
    morph.components &&
    morph.components.length > 0
  );
}


export function hasKnownGenetics(
  value: string
): boolean {
  return (
    resolveUnderlyingGenes(
      value
    ).length > 0
  );
}


// ============================================================
// MORPH INFORMATION
// ============================================================

export function getMorphInfo(
  value: string
):
  | {
      morph: MorphDefinition;
      directComposition: MorphComponent[];
      underlyingGenes: MorphComponent[];
      directCompositionText: string;
      underlyingGenesText: string;
      hasKnownGenetics: boolean;
    }
  | undefined {
  const morph =
    findMorph(value);

  if (!morph) {
    return undefined;
  }

  const directComposition =
    resolveMorphComponents(
      value
    );

  const underlyingGenes =
    resolveUnderlyingGenes(
      value
    );

  return {
    morph,
    directComposition,
    underlyingGenes,

    directCompositionText:
      getDirectComposition(
        value
      ),

    underlyingGenesText:
      getMorphComposition(
        value
      ),

    hasKnownGenetics:
      underlyingGenes.length > 0,
  };
}


// ============================================================
// RECOGNISED COMBINATIONS
// ============================================================

export function getRecognisedCombinations():
  RecognisedCombination[] {
  return morphs
    .filter(
      (morph) =>
        morph.kind ===
          "Combination" ||
        morph.isCombination ===
          true
    )
    .map(
      (morph) => ({
        combinationId:
          morph.geneId,

        name:
          morph.name,

        components:
          morph.components ??
          [],

        aliases:
          morph.aliases,

        verification:
          morph.verification,

        description:
          morph.description,

        educationalNotes:
          morph.educationalNotes,
      })
    );
}


// ============================================================
// SELECTOR SAFETY
// ============================================================

export function isRecognisedMorph(
  value: string
): boolean {
  return Boolean(
    findMorph(value)
  );
}


export function isMorphAlias(
  value: string
): boolean {
  const target =
    normalise(value);

  return morphs.some(
    (morph) =>
      (
        morph.aliases ??
        []
      ).some(
        (alias) =>
          normalise(alias) ===
          target
      )
  );
}


// ============================================================
// DEBUG
// ============================================================

export function debugMorph(
  value: string
): {
  input: string;
  resolvedName?: string;
  geneId?: string;
  kind?: MorphKind;
  inheritance?: InheritanceType;
  verification?: VerificationStatus;
  directComponents: MorphComponent[];
  underlyingGenes: MorphComponent[];
  composition: string;
} {
  const morph =
    findMorph(value);

  return {
    input:
      value,

    resolvedName:
      morph?.name,

    geneId:
      morph?.geneId,

    kind:
      morph?.kind,

    inheritance:
      morph?.inheritance,

    verification:
      morph?.verification,

    directComponents:
      resolveMorphComponents(
        value
      ),

    underlyingGenes:
      resolveUnderlyingGenes(
        value
      ),

    composition:
      getMorphComposition(
        value
      ),
  };
}