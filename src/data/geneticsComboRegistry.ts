import type { MorphComponent, MorphDefinition } from "./morphs";

/**
 * Calculator-only recognised names whose genetic signatures are useful to
 * presentation/reversal but are not yet represented as dedicated records in
 * the central morph array.
 *
 * IMPORTANT: these are names for combinations, never new loci.
 */
export const calculatorNamedCombinations: MorphDefinition[] = [
  {
    geneId: "bubs-daddy",
    name: "Bub's Daddy",
    aliases: ["Bubs Daddy", "Bub’s Daddy"],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "albino", type: "Gene", copies: 2 },
      { morphId: "arctic", type: "Gene", copies: 2 },
      { morphId: "conda", type: "Gene", copies: 1 },
    ],
    description: "Albino combined with Super Arctic and Conda.",
    educationalNotes: "Bub's Daddy is not a separate gene: Albino ×2 + Arctic ×2 + Conda ×1.",
  },
  {
    geneId: "super-daddy",
    name: "Super Daddy",
    aliases: ["Super AAA"],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "albino", type: "Gene", copies: 2 },
      { morphId: "arctic", type: "Gene", copies: 2 },
      { morphId: "conda", type: "Gene", copies: 2 },
    ],
    description: "Albino combined with Super Arctic and Super Conda.",
    educationalNotes: "Super Daddy is not a separate gene: Albino ×2 + Arctic ×2 + Conda ×2.",
  },
  {
    geneId: "super-arctic-super-conda",
    name: "Super Arctic Super Conda",
    aliases: ["Superarctic Superconda"],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Incomplete Dominant",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "arctic", type: "Gene", copies: 2 },
      { morphId: "conda", type: "Gene", copies: 2 },
    ],
    description: "Super Arctic combined with Super Conda.",
    educationalNotes: "This is the direct two-copy/two-copy combination; it is not Super Daddy without Albino.",
  },
  {
    geneId: "aaa",
    name: "AAA",
    aliases: ["Albino Arctic Anaconda", "Albino Arctic Conda"],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Combination",
    inheritance: "Recessive",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "albino", type: "Gene", copies: 2 },
      { morphId: "arctic", type: "Gene", copies: 1 },
      { morphId: "conda", type: "Gene", copies: 1 },
    ],
    description: "Albino combined with Arctic and Conda.",
    educationalNotes: "AAA is a combination name, not an independent locus.",
  },
];

export function normaliseComboName(value: string): string {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
}

export function findCalculatorNamedCombination(value: string): MorphDefinition | undefined {
  const query = normaliseComboName(value);
  return calculatorNamedCombinations.find((morph) =>
    normaliseComboName(morph.name) === query ||
    morph.aliases?.some((alias) => normaliseComboName(alias) === query),
  );
}

export function componentSignature(components: MorphComponent[]): string {
  const totals = new Map<string, number>();
  for (const component of components) {
    totals.set(component.morphId, (totals.get(component.morphId) ?? 0) + (component.copies ?? 1));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([geneId, copies]) => `${geneId}:${copies}`)
    .join("|");
}
