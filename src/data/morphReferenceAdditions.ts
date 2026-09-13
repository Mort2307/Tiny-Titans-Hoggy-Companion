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
  {
    geneId: "arctic-albino-anaconda-sunburst",
    name: "Arctic Albino Anaconda Sunburst",
    aliases: [
      "Arctic, Albino, Anaconda, Sunburst",
      "Arctic Albino Anaconda",
      "Arctic Sunburst Anaconda",
      "Arctic Sunburst Conda",
      "Red Rocket",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Recognised Sunburst-family Combination",
    inheritance: "Unknown",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "albino", type: "Gene", copies: 2 },
      { morphId: "sable", type: "Gene", copies: 2 },
      { morphId: "arctic", type: "Gene", copies: 1 },
      { morphId: "conda", type: "Gene", copies: 1 },
    ],
    contains: ["Arctic", "Albino", "Anaconda", "Sunburst", "Sable"],
    description: "Keeper-facing identity for the Sunburst family combination consisting of visual Sunburst (Albino + Sable) with Arctic and one-copy Anaconda/Conda.",
    educationalNotes: "Sunburst itself is the Albino + Sable combination. When Arctic and one-copy Anaconda/Conda are added, Hognose Hub documents the resulting combination as Red Rocket, also called Arctic Sunburst Conda. The submitted text \"Arctic, Albino, Anaconda, Sunburst\" is retained as an exact searchable identity, while the underlying genetic components are stored without double-counting Albino.",
    sourceUrl: "https://hognosehub.com/genetics-lab/arctic-sunburst-conda",
    sourceLabel: "Hognose Hub",
  },
  {
    geneId: "super-arctic-super-conda-sable-extreme-red",
    name: "Super Arctic Super Conda Sable Extreme Red",
    aliases: [
      "Super Artic, Super Conda, Sable, Extreme Red",
      "Super Arctic, Super Conda, Sable, Extreme Red",
      "Superarctic Superconda Sable Extreme Red",
      "Extreme Red Super Arctic Sable Super Conda",
    ],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Recognised Multi-trait Combination",
    inheritance: "Unknown",
    hetPossible: false,
    verification: "Recognised",
    components: [
      { morphId: "arctic", type: "Gene", copies: 2 },
      { morphId: "conda", type: "Gene", copies: 2 },
      { morphId: "sable", type: "Gene", copies: 2 },
      { morphId: "extreme-red", type: "Polygenic", copies: 1 },
    ],
    contains: ["Super Arctic", "Super Conda", "Sable", "Extreme Red"],
    description: "Keeper-facing multi-trait identity for Super Arctic + Super Conda + visual Sable with the polygenic Extreme Red trait.",
    educationalNotes: "Super Arctic represents two copies of Arctic and Super Conda represents two copies of Conda/Anaconda. Sable is recessive and Extreme Red is polygenic, so Extreme Red is retained as a modifier rather than treated as a Mendelian locus. This exact comma-separated identity is preserved for Morph Library lookup and community submissions.",
    sourceUrl: "https://hognose.fandom.com/wiki/Extreme_Red",
    sourceLabel: "Hognose Wiki — Extreme Red genetics reference",
  },
];
