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
    evidenceNote?: string;
  } = {},
): MasterMorphDefinition {
  const reference = source(
    "MorphMarket Morphpedia",
    `${morphMarket}${sourcePath}`,
    "Secondary trait reference used for identity, terminology and reported inheritance; this entry is not promoted to calculator-confirmed status without stronger provenance.",
  );
  return {
    geneId: `${speciesPrefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    aliases: options.aliases ?? [],
    kind: "Gene",
    isGene: true,
    category: "Species gene",
    inheritance,
    hetPossible: inheritance === "Recessive",
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
    trait("python-bivittatus", "Pied", "Recessive", "burmese-pythons/pied/", {
      aliases: ["Piebald"],
    }),
    trait("python-bivittatus", "Champagne", "Recessive", "burmese-pythons/champagne/"),
    trait("python-bivittatus", "Lava", "Recessive", "burmese-pythons/lava/"),
    trait("python-bivittatus", "Pin", "Recessive", "burmese-pythons/pin/"),
    trait("python-bivittatus", "Scaleless", "Recessive", "burmese-pythons/scaleless/"),
    trait("python-bivittatus", "Smoke", "Recessive", "burmese-pythons/smoke/"),
    trait("python-bivittatus", "Stonewash", "Recessive", "burmese-pythons/stonewash/"),
    trait("python-bivittatus", "Fader", "Recessive", "burmese-pythons/fader/", {
      evidenceNote: "Historical breeder/community evidence has been inconsistent about proof and surviving lines; retained as recognised reference-only genetics rather than calculator-confirmed.",
    }),
    trait("python-bivittatus", "Sable", "Recessive", "burmese-pythons/sable/"),
    trait("python-bivittatus", "Melanistic", "Recessive", "burmese-pythons/melanistic/"),
    trait("python-bivittatus", "Hypo", "Incomplete Dominant", "burmese-pythons/hypo/", {
      aliases: ["Hypomelanistic"],
    }),
    trait("python-bivittatus", "Enigma", "Incomplete Dominant", "burmese-pythons/enigma/"),
  ],

  "Morelia spilota": [
    trait("morelia-spilota", "Genetic Stripe", "Recessive", "carpet-pythons/genetic-stripe/"),
    trait("morelia-spilota", "Gamma", "Incomplete Dominant", "carpet-pythons/gamma/"),
    trait("morelia-spilota", "Ocelot", "Incomplete Dominant", "carpet-pythons/ocelot/"),
  ],
};
