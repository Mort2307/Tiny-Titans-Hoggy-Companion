import type { MasterMorphDefinition } from "../masterMorphDatabase";

const morphpedia = (path: string) => `https://www.morphmarket.com/morphpedia/${path}`;

function gene(
  name: string,
  inheritance: MasterMorphDefinition["inheritance"],
  sourceUrl: string,
  aliases: string[] = [],
  notes?: string,
): MasterMorphDefinition {
  const geneId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    geneId,
    name,
    aliases,
    kind: "Gene",
    isGene: true,
    category: "Species gene",
    inheritance,
    hetPossible: inheritance === "Recessive",
    verification: "Recognised",
    description: `${name} is a species-scoped genetic trait entry.`,
    educationalNotes:
      notes ??
      "Species-scoped genetics entry. Do not transfer this trait or inheritance model to another species solely because the display name matches. Confirm lineage, provenance and breeder records for an individual animal.",
    sourceUrl,
    sourceLabel: "MorphMarket Morphpedia",
  };
}

/**
 * Expansion batch 2.
 * Only exact source pages currently verified against Morphpedia are wired here.
 * Combination phenotypes are intentionally not represented as standalone genes.
 */
export const SPECIES_GENETICS_EXPANSION_BATCH_2: Record<string, MasterMorphDefinition[]> = {
  "Lampropeltis triangulum": [
    gene("Albino", "Recessive", morphpedia("milk-snakes/albino/"), ["Amelanistic", "Amel"]),
    gene("Hypo", "Recessive", morphpedia("milk-snakes/hypo/"), ["Hypomelanistic"]),
    gene("Anerythristic", "Recessive", morphpedia("milk-snakes/anerythristic/"), ["Anery"]),
  ],

  "Morelia spilota": [
    gene(
      "Hypo",
      "Incomplete Dominant",
      morphpedia("carpet-pythons/hypo/"),
      ["Hypomelanistic"],
      "Morphpedia identifies Carpet Python Hypo as incomplete dominant and describes it as distinct from Caramel. A homozygous/super expression is not yet established on the cited page, so the calculator must not invent one.",
    ),
    gene("Jaguar", "Incomplete Dominant", morphpedia("carpet-pythons/jaguar/"), ["Jag"], "Jaguar is incomplete dominant; the cited Morphpedia entry documents the super/leucistic form as lethal. TinyTitans should expose that breeding risk rather than present it as a desirable viable super.") ,
    gene("Zebra", "Incomplete Dominant", morphpedia("carpet-pythons/zebra/")),
  ],

  "Malayopython reticulatus": [
    gene("Phantom", "Incomplete Dominant", morphpedia("reticulated-pythons/phantom/"), ["Het BluEL", "Het Blue Eyed Leucistic"]),
    gene("Genetic Stripe", "Recessive", morphpedia("reticulated-pythons/genetic-stripe/"), ["G-Stripe"]),
  ],

  "Python bivittatus": [
    gene("Albino", "Recessive", morphpedia("burmese-pythons/albino/"), ["Blonde"]),
    gene("Patternless", "Recessive", morphpedia("burmese-pythons/patternless/"), ["Green"]),
  ],

  "Eryx colubrinus": [
    gene("Gene X", "Recessive", morphpedia("sand-boas/gene-x/"), ["GX"]),
  ],

  "Epicrates cenchria": [
    gene("Anery (Sharp)", "Recessive", morphpedia("rainbow-boas/anery-sharp/"), ["Sharp Anery", "Anerythristic"]),
  ],

  "Boa constrictor": [
    gene("Albino (Kahl)", "Recessive", morphpedia("boa-constrictors/albino-kahl/"), ["Kahl Albino", "Kahl"]),
    gene("Albino (Sharp)", "Recessive", morphpedia("boa-constrictors/albino-sharp/"), ["Sharp Albino", "Sharp"]),
    gene("Anerythristic (Type 1)", "Recessive", morphpedia("boa-constrictors/anerythristic-type-1/"), ["Anery Type 1", "Type 1 Anery"]),
    gene(
      "Hypo",
      "Incomplete Dominant",
      "https://www.morphmarket.com/morphpedia/boa-constrictors/hypomelanistic/",
      ["Hypomelanistic"],
    ),
  ],
};
