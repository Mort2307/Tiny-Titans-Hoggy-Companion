import type { MorphReferenceEntry } from "./hognoseMorphCatalog";

/**
 * Reference-only community identities. These are deliberately separate from
 * canonical Mendelian loci: a keeper-facing name can be searchable without
 * inventing a new gene.
 */
export const morphReferenceAdditions: MorphReferenceEntry[] = [
  {
    geneId: "super-arctic-albino-anaconda",
    name: "Super Arctic Albino Anaconda",
    aliases: ["Super Arctic Albino Conda", "Pink Subzero", "Subzero Conda", "Bubz Daddy", "Bub's Daddy", "Super Arctic Albino Anaconda Western Hognose"],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Community-documented Combination",
    inheritance: "Unknown",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "arctic", type: "Gene", copies: 2 },
      { morphId: "albino", type: "Gene", copies: 2 },
      { morphId: "conda", type: "Gene", copies: 1 },
    ],
    contains: ["Super Arctic", "Albino", "Anaconda"],
    description: "A community-documented Western Hognose combination described from a Super Arctic Albino Anaconda individual. The contributor describes this particular example as part of a polygenically pink lineage selected for pink colour expression. Subzeros are described as occurring across a range of colour expressions, similar to Super Arctic.",
    educationalNotes: "Contributor description retained with the identity: \"Pictured is a super arctic albino anaconda western hognose also known as a subzero conda or bubz daddy. This particular example is from polygenically pink lineage meaning it is a descendant of line breeding for pink colors. Subzeros come in a wide range of colors just like super Arctic.\" Treat Pink Subzero, Subzero Conda and Bubz Daddy as recorded community names for this composition, not as separate genetic loci. The stated submission described both parents as carrying albino; the pictured animal was identified by the contributor as a Super Arctic Albino Anaconda.",
    sourceLabel: "Tiny Titans community submission",
  },
];
