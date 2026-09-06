import type { MasterMorphDefinition } from "../masterMorphDatabase";
import type { MorphEvidenceSourceDefinition } from "../morphEvidenceSources";

type InheritanceType = MasterMorphDefinition["inheritance"];

const morphMarket = "https://www.morphmarket.com/morphpedia/";

function source(label: string, url: string, notes: string): MorphEvidenceSourceDefinition {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    url,
    type: "morphology-database",
    authority: "secondary",
    notes,
  };
}

function trait(
  speciesPrefix: string,
  name: string,
  inheritance: InheritanceType,
  sourcePath: string,
  options: {
    aliases?: string[];
    kind?: MasterMorphDefinition["kind"];
    hetPossible?: boolean;
    evidenceNote?: string;
  } = {},
): MasterMorphDefinition {
  const kind = options.kind ?? (
    inheritance === "Polygenic" ? "Polygenic" :
    inheritance === "Line-bred" ? "Line-bred" :
    "Gene"
  );
  const reference = source(
    "MorphMarket Morphpedia",
    `${morphMarket}${sourcePath}`,
    "Secondary trait reference used for identity, terminology and reported inheritance; this entry is not promoted to calculator-confirmed status without stronger provenance.",
  );
  return {
    geneId: `${speciesPrefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    aliases: options.aliases ?? [],
    kind,
    isGene: kind === "Gene",
    category: kind === "Gene" ? "Species gene" : kind,
    inheritance,
    hetPossible: kind === "Gene" ? (options.hetPossible ?? inheritance === "Recessive") : false,
    verification: "Recognised",
    description: `Species-scoped ${name} trait documented for this species in the available reptile genetics evidence base.`,
    educationalNotes: "Species-scoped reference entry. Confirm lineage, subspecies and breeder evidence before treating the individual as genetically proven.",
    sourceUrl: reference.url,
    sourceLabel: reference.label,
    sourceLinks: [reference],
    evidenceNote: options.evidenceNote,
  };
}

export const SPECIES_GENETICS_EXPANSION_BATCH_2: Record<string, MasterMorphDefinition[]> = {
  "Python bivittatus": [
    trait("python-bivittatus", "Pied", "burmese-pythons/pied/", {
      aliases: ["Piebald"],
    }),
    trait("python-bivittatus", "Champagne", "burmese-pythons/champagne/"),
    trait("python-bivittatus", "Lava", "burmese-pythons/lava/"),
    trait("python-bivittatus", "Pin", "burmese-pythons/pin/"),
    trait("python-bivittatus", "Scaleless", "burmese-pythons/scaleless/"),
    trait("python-bivittatus", "Smoke", "burmese-pythons/smoke/"),
    trait("python-bivittatus", "Stonewash", "burmese-pythons/stonewash/"),
    trait("python-bivittatus", "Fader", "burmese-pythons/fader/", {
      evidenceNote: "Historical breeder/community evidence has been inconsistent about proof and surviving lines; retained as recognised reference-only genetics rather than calculator-confirmed.",
    }),
    trait("python-bivittatus", "Sable", "burmese-pythons/sable/"),
    trait("python-bivittatus", "Melanistic", "burmese-pythons/melanistic/"),
    trait("python-bivittatus", "Hypo", "burmese-pythons/hypo/", {
      aliases: ["Hypomelanistic"],
      inheritance: "Incomplete Dominant",
    }),
    trait("python-bivittatus", "Enigma", "burmese-pythons/enigma/", {
      inheritance: "Incomplete Dominant",
    }),
  ],

  "Morelia spilota": [
    trait("morelia-spilota", "Genetic Stripe", "carpet-pythons/genetic-stripe/"),
    trait("morelia-spilota", "Gamma", "carpet-pythons/gamma/", {
      inheritance: "Incomplete Dominant",
    }),
    trait("morelia-spilota", "Ocelot", "carpet-pythons/ocelot/", {
      inheritance: "Incomplete Dominant",
    }),
  ],
};
