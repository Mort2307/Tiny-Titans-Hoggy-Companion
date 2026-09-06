import type { MasterMorphDefinition } from "../masterMorphDatabase";

type InheritanceType = MasterMorphDefinition["inheritance"];

const morphMarket = "https://www.morphmarket.com/morphpedia/";

function trait(
  speciesKey: string,
  name: string,
  inheritance: InheritanceType,
  sourcePath: string,
  aliases: string[] = [],
): MasterMorphDefinition {
  return {
    geneId: `${speciesKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    aliases,
    kind: "Gene",
    isGene: true,
    category: "Species gene",
    inheritance,
    hetPossible: inheritance === "Recessive",
    verification: "Recognised",
    description: `Species-scoped ${name} trait recorded in MorphMarket Morphpedia for this species group.`,
    educationalNotes: "Species-scoped reference entry. Confirm subspecies/lineage and individual breeder documentation before treating a claimed trait as proven.",
    sourceUrl: `${morphMarket}${sourcePath}`,
    sourceLabel: "MorphMarket Morphpedia",
  };
}

/**
 * Evidence-backed expansion batch 1.
 *
 * This deliberately does not copy generic snake morph names into every species.
 * A species gets a trait only when the source identifies the trait for that
 * species/group. Combination names are kept out of the gene list and can be
 * added later through the canonical composition layer.
 */
export const SPECIES_GENETICS_EXPANSION_BATCH_1: Record<string, MasterMorphDefinition[]> = {
  "Lampropeltis triangulum": [
    trait("lampropeltis-triangulum", "Albino", "Recessive", "milk-snakes/albino/", ["Amelanistic", "Amel"]),
    trait("lampropeltis-triangulum", "Hypo", "Recessive", "milk-snakes/hypo/", ["Hypomelanistic"]),
    trait("lampropeltis-triangulum", "Anerythristic", "Recessive", "milk-snakes/anerythristic/", ["Anery"]),
  ],
};
