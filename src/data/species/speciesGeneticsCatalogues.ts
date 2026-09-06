import type { MasterMorphDefinition } from "../masterMorphDatabase";
import type { MorphEvidenceSourceDefinition } from "../morphEvidenceSources";

type InheritanceType = MasterMorphDefinition["inheritance"];

const morphMarket = "https://www.morphmarket.com/morphpedia/";

const source = (
  id: string,
  label: string,
  url: string,
  type: MorphEvidenceSourceDefinition["type"],
  authority: MorphEvidenceSourceDefinition["authority"],
  notes: string,
): MorphEvidenceSourceDefinition => ({ id, label, url, type, authority, notes });

function trait(
  name: string,
  inheritance: InheritanceType,
  sourcePath: string,
  options: {
    aliases?: string[];
    hetPossible?: boolean;
    kind?: MasterMorphDefinition["kind"];
    description?: string;
    evidenceStatus?: MasterMorphDefinition["evidenceStatus"];
    evidenceNote?: string;
    sourceLinks?: MorphEvidenceSourceDefinition[];
  } = {},
): MasterMorphDefinition {
  const kind = options.kind ?? (
    inheritance === "Polygenic" ? "Polygenic" :
    inheritance === "Line-bred" ? "Line-bred" :
    "Gene"
  );
  const fallbackSource = source(
    `morphmarket-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    "MorphMarket Morphpedia",
    `${morphMarket}${sourcePath}`,
    "morphology-database",
    "secondary",
    "Community-driven trait reference used for identity, terminology and reported inheritance; not treated as scientific confirmation on its own.",
  );
  return {
    geneId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aliases: options.aliases ?? [],
    kind,
    isGene: kind === "Gene",
    category: kind === "Gene" ? "Species gene" : kind,
    inheritance,
    hetPossible: kind === "Gene" ? (options.hetPossible ?? inheritance === "Recessive") : false,
    verification: options.evidenceStatus === "confirmed" ? "Confirmed" : "Recognised",
    evidenceStatus: options.evidenceStatus,
    evidenceNote: options.evidenceNote,
    description: options.description ?? `Species-specific ${name} trait documented for this species in the available genetics evidence base.`,
    educationalNotes: "Species-scoped reference entry. Individual lineage and breeder documentation still determine whether a particular animal is proven for the trait.",
    sourceUrl: options.sourceLinks?.[0]?.url ?? fallbackSource.url,
    sourceLabel: options.sourceLinks?.[0]?.label ?? fallbackSource.label,
    sourceLinks: options.sourceLinks ?? [fallbackSource],
  };
}

const bySource = (sourcePath: string, rows: Array<[string, InheritanceType, string[]?, boolean?, MasterMorphDefinition["kind"]?]>): MasterMorphDefinition[] =>
  rows.map(([name, inheritance, aliases, hetPossible, kind]) => trait(name, inheritance, sourcePath, { aliases, hetPossible, kind }));

const cornOca2 = source(
  "omia-pantherophis-guttatus-oca2",
  "OMIA: OCA2-related amelanism in Pantherophis guttatus",
  "https://omia.org/OMIA002130/94885/",
  "scientific-literature",
  "primary",
  "Species-specific OMIA record linking the amelanistic phenotype to an OCA2 insertion and reporting recessive inheritance.",
);
const cornAmelanismPaper = source(
  "saenko-2015-corn-amelanism",
  "Saenko et al. (2015) — Amelanism in the corn snake",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC4657000/",
  "scientific-literature",
  "primary",
  "Peer-reviewed genomic study identifying an LTR-retrotransposon insertion in OCA2 as the causal mutation associated with corn-snake amelanism.",
);
const cornClcn2Omia = source(
  "omia-pantherophis-guttatus-clcn2",
  "OMIA: CLCN2-related pattern phenotype in Pantherophis guttatus",
  "https://www.omia.org/OMIA002927/94885/",
  "scientific-literature",
  "primary",
  "Species-specific OMIA record for the CLCN2 mono-locus containing the recessive Motley and Stripe alleles.",
);
const cornClcn2Paper = source(
  "montandon-2025-corn-clcn2",
  "Montandon et al. (2025) — CLCN2 and corn-snake colour pattern",
  "https://pubmed.ncbi.nlm.nih.gov/40140900/",
  "scientific-literature",
  "Peer-reviewed mapping, transcriptomic and functional study identifying CLCN2 involvement in the recessive Motley and Stripe alleles.",
);
const ballPiebaldOmia = source(
  "omia-python-regius-piebald-tfec",
  "OMIA: TFEC-related piebald in Python regius",
  "https://omia.org/OMIA002761/51751/",
  "scientific-literature",
  "primary",
  "Species-specific OMIA record classifying piebald as a recessive single-gene trait with a known TFEC variant.",
);
const ballPiebaldPaper = source(
  "garcia-elfring-2023-ball-piebald",
  "Garcia-Elfring et al. (2023) — Piebaldism and TFEC",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC10712277/",
  "scientific-literature",
  "Peer-reviewed whole-genome and segregation study linking the recessive ball-python piebald phenotype to a TFEC stop-gain variant.",
);

export const SPECIES_GENETICS_CATALOGUES: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    ...bySource("corn-snakes/", [
      ["Amelanistic / Albino", "Recessive", ["Amel", "Albino"]],
      ["Anerythristic", "Recessive", ["Anery", "Anery A"]],
      ["Charcoal", "Recessive", ["Anery B"]],
      ["Caramel", "Recessive"],
      ["Cinder", "Recessive"],
      ["Diffused", "Recessive", ["Bloodred"]],
      ["Hypomelanistic", "Recessive", ["Hypo"]],
      ["Lava", "Recessive", ["Hypo C", "Trans Hypo"]],
      ["Motley", "Recessive"],
      ["Stripe", "Recessive"],
      ["Scaleless", "Recessive"],
      ["Sunkissed", "Recessive"],
      ["Palmetto", "Incomplete Dominant"],
      ["Tessera", "Dominant"],
      ["Masque", "Incomplete Dominant"],
      ["Halo", "Incomplete Dominant"],
      ["Tequila Sunrise", "Polygenic", ["TS"], false, "Polygenic"],
    ]).map((entry) => {
      if (entry.name === "Amelanistic / Albino") {
        return {
          ...entry,
          evidenceStatus: "confirmed",
          verification: "Confirmed",
          evidenceNote: "Molecular evidence identifies an OCA2 retrotransposon insertion as the causal mutation associated with corn-snake amelanism; OMIA records the trait as recessive.",
          sourceUrl: cornOca2.url,
          sourceLabel: cornOca2.label,
          sourceLinks: [cornOca2, cornAmelanismPaper],
        };
      }
      if (entry.name === "Motley") {
        return {
          ...entry,
          evidenceStatus: "confirmed",
          verification: "Confirmed",
          evidenceNote: "2025 mapping and functional work identifies Motley as a recessive allele at a CLCN2-containing mono-locus.",
          sourceUrl: cornClcn2Omia.url,
          sourceLabel: cornClcn2Omia.label,
          sourceLinks: [cornClcn2Omia, cornClcn2Paper],
        };
      }
      if (entry.name === "Stripe") {
        return {
          ...entry,
          evidenceStatus: "confirmed",
          verification: "Confirmed",
          evidenceNote: "2025 mapping and functional work identifies Stripe as a recessive CLCN2-disrupting allele within the same mono-locus as Motley.",
          sourceUrl: cornClcn2Omia.url,
          sourceLabel: cornClcn2Omia.label,
          sourceLinks: [cornClcn2Omia, cornClcn2Paper],
        };
      }
      return entry;
    }),
  ],

  "Boa constrictor": [
    ...bySource("boa-constrictors/", [
      ["Kahl Albino", "Recessive", ["Albino", "Kahl"]],
      ["Anery Type 1", "Recessive", ["Anery"]],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Leopard", "Recessive"],
      ["IMG", "Dominant", ["Increased Melanism Gene", "Azabache"]],
      ["Inca", "Dominant"],
      ["Fire", "Incomplete Dominant"],
      ["Jungle", "Incomplete Dominant"],
      ["Motley", "Recessive"],
    ]),
  ],

  "Boa imperator": [
    ...bySource("boa-constrictors/", [
      ["Kahl Albino", "Recessive", ["Albino", "Kahl"]],
      ["Anery Type 1", "Recessive", ["Anery"]],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Leopard", "Recessive"],
      ["IMG", "Dominant", ["Increased Melanism Gene", "Azabache"]],
      ["Inca", "Dominant"],
      ["Fire", "Incomplete Dominant"],
      ["Jungle", "Incomplete Dominant"],
    ]),
  ],

  "Python bivittatus": [
    ...bySource("burmese-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Patternless", "Recessive", ["Green"]],
      ["Granite", "Recessive"],
      ["Labyrinth", "Recessive"],
      ["Caramel", "Recessive"],
    ]),
  ],

  "Morelia spilota": [
    ...bySource("carpet-pythons/", [
      ["Jaguar", "Incomplete Dominant", ["Jag"]],
      ["Zebra", "Incomplete Dominant"],
      ["Granite", "Recessive"],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Axanthic", "Recessive"],
      ["Tiger", "Polygenic", [], false, "Polygenic"],
      ["Genetic Stripe", "Recessive"],
      ["Stonewashed", "Polygenic", [], false, "Polygenic"],
    ]),
  ],

  "Eryx colubrinus": [
    ...bySource("sand-boas/", [
      ["Albino", "Recessive"],
      ["Blonde Albino", "Recessive"],
      ["Anerythristic", "Recessive", ["Anery", "Axanthic"]],
      ["Hypomelanistic", "Recessive", ["Hypo"]],
      ["Splash", "Recessive"],
      ["Paint", "Recessive"],
      ["Gene X", "Recessive", ["GX"]],
      ["Stripe", "Dominant"],
      ["Granite", "Incomplete Dominant"],
      ["Patternless", "Incomplete Dominant"],
      ["Splatter", "Recessive"],
      ["Holloway Reduced Pattern", "Line-bred", ["HRP"], false, "Line-bred"],
      ["Stockwell Nuclear", "Line-bred", [], false, "Line-bred"],
      ["Thermo Nuclear", "Line-bred", [], false, "Line-bred"],
      ["Cal Flame", "Line-bred", [], false, "Line-bred"],
      ["Extreme Red Dodoma Flame", "Line-bred", [], false, "Line-bred"],
      ["P3 Anery", "Line-bred", [], false, "Line-bred"],
    ]),
  ],

  "Gongylophis colubrinus": [
    ...bySource("sand-boas/", [
      ["Albino", "Recessive"],
      ["Anerythristic", "Recessive", ["Anery", "Axanthic"]],
      ["Hypomelanistic", "Recessive", ["Hypo"]],
      ["Splash", "Recessive"],
      ["Paint", "Recessive"],
      ["Gene X", "Recessive", ["GX"]],
      ["Stripe", "Dominant"],
      ["Granite", "Incomplete Dominant"],
      ["Patternless", "Incomplete Dominant"],
    ]),
  ],

  "Epicrates cenchria": [
    ...bySource("rainbow-boas/", [
      ["Anery (Sharp)", "Recessive", ["Anerythristic"]],
      ["Anery (VPI)", "Recessive"],
      ["Anery (T+)", "Recessive"],
      ["Piebald", "Recessive"],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Motley", "Dominant"],
      ["Leopard", "Incomplete Dominant"],
    ]),
  ],

  "Malayopython reticulatus": [
    ...bySource("reticulated-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Anery", "Recessive", ["Anerythristic"]],
      ["Tiger", "Recessive"],
      ["Motley", "Incomplete Dominant"],
      ["Golden Child", "Incomplete Dominant"],
      ["Platinum", "Recessive"],
      ["Sunfire", "Incomplete Dominant"],
      ["Dwarf", "Line-bred", [], false, "Line-bred"],
      ["Super Tiger", "Incomplete Dominant"],
      ["Calico", "Recessive"],
    ]),
  ],

  "Python curtus": [
    ...bySource("short-tailed-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Granite", "Recessive"],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Sunset", "Recessive"],
    ]),
  ],

  "Lampropeltis californiae": [
    ...bySource("kingsnakes/", [
      ["Amelanistic", "Recessive", ["Albino", "Amel"]],
      ["Anerythristic", "Recessive", ["Anery"]],
      ["Hypo", "Recessive", ["Ghost", "Hypomelanistic"]],
      ["Lavender Albino", "Recessive", ["Lavender"]],
      ["Leucistic", "Recessive", ["Lucy"]],
      ["Erythristic", "Recessive"],
      ["Banana", "Incomplete Dominant"],
      ["Peanut Butter", "Recessive"],
      ["Long Beach Hypermelanistic", "Incomplete Dominant", ["Grease King"]],
    ]),
  ],

  "Python regius": [
    trait("Piebald", "Recessive", "ball-pythons/piebald/", {
      aliases: ["Pied"],
      evidenceStatus: "confirmed",
      evidenceNote: "Piebald is a recessive single-gene trait in ball pythons. Whole-genome mapping and segregation data identify a TFEC stop-gain variant associated with the phenotype.",
      sourceLinks: [ballPiebaldOmia, ballPiebaldPaper],
    }),
    trait("Albino", "Recessive", "ball-pythons/albino/", {
      aliases: ["Amelanistic", "T- Albino", "T-Albino"],
      evidenceStatus: "recognised",
      evidenceNote: "Widely documented recessive ball-python morph with molecular evidence implicating TYR haplotypes; maintained as recognised here until the database has a dedicated allele/complex model.",
    }),
    trait("Hypo", "Recessive", "ball-pythons/hypo/", {
      aliases: ["Ghost", "Hypomelanistic"],
      evidenceStatus: "recognised",
    }),
    trait("Clown", "Recessive", "ball-pythons/clown/", {
      evidenceStatus: "recognised",
    }),
    trait("Genetic Stripe", "Recessive", "ball-pythons/genetic-stripe/", {
      evidenceStatus: "recognised",
    }),
    trait("Pastel", "Incomplete Dominant", "ball-pythons/pastel/", {
      aliases: ["Lemon Pastel"],
      evidenceStatus: "recognised",
    }),
    trait("Mojave", "Incomplete Dominant", "ball-pythons/mojave/", {
      evidenceStatus: "recognised",
    }),
    trait("Puzzle", "Recessive", "ball-pythons/puzzle/", {
      evidenceStatus: "recognised",
    }),
    trait("Sunset", "Recessive", "ball-pythons/sunset/", {
      evidenceStatus: "recognised",
    }),
    trait("Monsoon", "Recessive", "ball-pythons/monsoon/", {
      evidenceStatus: "recognised",
    }),
  ],
};
