import type { MorphReferenceEntry } from "./hognoseMorphCatalog";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Reference-only line-bred identities which must be selectable in the Morph Library
 * without being promoted to confirmed Mendelian loci.
 */
export const morphReferenceAdditions: MorphReferenceEntry[] = [
  {
    geneId: slug("Red Line"),
    name: "Red Line",
    aliases: ["Red line", "Red Line Hognose"],
    kind: "Line-bred",
    isGene: false,
    category: "Line-bred",
    inheritance: "Line-bred",
    hetPossible: false,
    verification: "Recognised",
    description: "A recognised selectively bred red-colour line in Western Hognoses. Red Line is a line-bred identity, not a standalone Mendelian locus.",
    educationalNotes: "Keep Red Line separate from Extreme Red. The line describes a breeding lineage/colour expression and should not be entered as a simple gene in the genetics calculator.",
    sourceUrl: "https://hognose.ca/",
    sourceLabel: "Hognose Morphs",
  },
  {
    geneId: slug("Red Line Conda"),
    name: "Red Line Conda",
    aliases: ["Red Line Anaconda", "Red Line + Conda", "Red Line + Anaconda"],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Line-bred Combination",
    inheritance: "Line-bred",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: slug("Red Line"), type: "Line-bred" },
      { morphId: "conda", type: "Gene", copies: 1 },
    ],
    contains: ["Red Line", "Anaconda"],
    description: "A named Western Hognose combination describing the Red Line colour lineage expressed with one copy of Conda/Anaconda.",
    educationalNotes: "Red Line remains line-bred while Conda/Anaconda remains the underlying genetic pattern mutation. This entry is a library identity, not a new genetic locus.",
    sourceUrl: "https://hognose.ca/",
    sourceLabel: "Hognose Morphs",
  },
  {
    geneId: slug("Red Purple Line"),
    name: "Red Purple Line",
    aliases: ["Red & Purple Line", "Red Purple"],
    kind: "Line-bred",
    isGene: false,
    category: "Line-bred",
    inheritance: "Line-bred",
    hetPossible: false,
    verification: "Recognised",
    description: "A recognised line-bred colour identity associated with selectively bred red and purple expression.",
    educationalNotes: "This is a reference-line identity rather than a simple Mendelian mutation.",
    sourceUrl: "https://hognose.ca/",
    sourceLabel: "Hognose Morphs",
  },
];
