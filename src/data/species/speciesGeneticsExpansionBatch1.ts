import type { MasterMorphDefinition } from "../masterMorphDatabase";

type InheritanceType = MasterMorphDefinition["inheritance"];
const morphMarket = "https://www.morphmarket.com/morphpedia/";

function trait(name: string, inheritance: InheritanceType, sourcePath: string, aliases: string[] = []): MasterMorphDefinition {
  return {
    geneId: `lampropeltis-triangulum-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    aliases,
    kind: "Gene",
    isGene: true,
    category: "Species gene",
    inheritance,
    hetPossible: inheritance === "Recessive",
    verification: "Recognised",
    description: `Species-scoped ${name} trait recorded in MorphMarket Morphpedia for the milk-snake group.`,
    educationalNotes: "Species-scoped reference entry. Confirm subspecies/lineage and individual breeder documentation before treating a claimed trait as proven.",
    sourceUrl: `${morphMarket}${sourcePath}`,
    sourceLabel: "MorphMarket Morphpedia",
  };
}

/** Evidence-backed expansion batch 1. Combination names stay in canonical composition data. */
export const SPECIES_GENETICS_EXPANSION_BATCH_1: Record<string, MasterMorphDefinition[]> = {
  "Lampropeltis triangulum": [
    trait("Albino", "Recessive", "milk-snakes/albino/", ["Amelanistic", "Amel"]),
    trait("Hypo", "Recessive", "milk-snakes/hypo/", ["Hypomelanistic"]),
    trait("Anerythristic", "Recessive", "milk-snakes/anerythristic/", ["Anery"]),
  ],
};
