import type { MasterMorphDefinition } from "../masterMorphDatabase";

const MM = "https://www.morphmarket.com/morphpedia/";
const trait = (
  name: string,
  inheritance: MasterMorphDefinition["inheritance"],
  path: string,
  aliases: string[] = [],
): MasterMorphDefinition => ({
  geneId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  aliases,
  kind: "Gene",
  isGene: true,
  category: "Species gene",
  inheritance,
  hetPossible: inheritance === "Recessive",
  verification: "Recognised",
  description: `Species-scoped ${name} trait documented for this species in Morphpedia.`,
  educationalNotes: "Do not assume a same-named trait in another species has the same genetic identity or inheritance. Individual lineage and breeder proof remain relevant.",
  sourceUrl: `${MM}${path}`,
  sourceLabel: "MorphMarket Morphpedia",
});

/** Evidence-backed priority-wave corrections/additions. Combination phenotypes
 * are deliberately excluded: the canonical resolver constructs those from
 * their component loci at runtime. */
export const SPECIES_GENETICS_EXPANSION_BATCH_3: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    trait("Amelanistic", "Recessive", "corn-snakes/amelanistic/", ["Amel", "Albino"]),
    trait("Caramel", "Recessive", "corn-snakes/caramel/"),
    trait("Charcoal", "Recessive", "corn-snakes/charcoal/", ["Anery B"]),
    trait("Hypomelanistic", "Recessive", "corn-snakes/hypomelanistic/", ["Hypo"]),
    trait("Lava", "Recessive", "corn-snakes/lava/", ["Hypo C", "Trans Hypo"]),
    trait("Sunkissed", "Recessive", "corn-snakes/sunkissed/", ["Sunkist", "Hypo B"]),
    trait("Scaleless", "Recessive", "corn-snakes/scaleless/"),
    trait("Palmetto", "Incomplete Dominant", "corn-snakes/palmetto/"),
    trait("Strawberry", "Recessive", "corn-snakes/strawberry/"),
    trait("Ultra", "Recessive", "corn-snakes/ultra/"),
  ],

  "Lampropeltis californiae": [
    trait("Amelanistic", "Recessive", "kingsnakes/amelanistic/", ["Amel", "T- Albino"]),
    trait("Anerythristic", "Recessive", "kingsnakes/anerythristic/", ["Anery"]),
    trait("Axanthic", "Recessive", "kingsnakes/axanthic/"),
    trait("Hypo", "Recessive", "kingsnakes/hypo/", ["Ghost", "Hypomelanistic", "Hypo Type A"]),
    trait("Lavender Albino", "Recessive", "kingsnakes/lavender-albino/", ["Lavender"]),
    trait("Erythristic", "Recessive", "kingsnakes/erythristic/"),
  ],

  "Eryx colubrinus": [
    trait("Anery", "Recessive", "sand-boas/anery/", ["Anerythristic", "Axanthic"]),
    trait("Gene X", "Recessive", "sand-boas/gene-x/", ["GX"]),
  ],

  "Boa constrictor": [
    trait("Hypo", "Incomplete Dominant", "boa-constrictors/hypo/", ["Hypomelanistic"]),
    trait("IMG", "Dominant", "boa-constrictors/img/", ["Increased Melanism Gene", "Azabache"]),
    trait("Inca", "Dominant", "boa-constrictors/inca/"),
    trait("Albino (Kahl)", "Recessive", "boa-constrictors/albino-kahl/", ["Kahl Albino", "Kahl"]),
    trait("Albino (Sharp)", "Recessive", "boa-constrictors/albino-sharp/", ["Sharp Albino", "Sharp"]),
    trait("Anerythristic (Type 1)", "Recessive", "boa-constrictors/anerythristic-type-1/", ["Anery Type 1", "Type 1 Anery"]),
  ],

  "Malayopython reticulatus": [
    trait("Phantom", "Incomplete Dominant", "reticulated-pythons/phantom/", ["Het BluEL", "Het Blue Eyed Leucistic"]),
    trait("Genetic Stripe", "Recessive", "reticulated-pythons/genetic-stripe/", ["G-Stripe"]),
  ],

  "Python bivittatus": [
    trait("Albino", "Recessive", "burmese-pythons/albino/", ["Blonde", "Amelanistic"]),
    trait("Patternless", "Recessive", "burmese-pythons/patternless/", ["Green"]),
  ],

  "Lampropeltis triangulum": [
    trait("Hypo", "Recessive", "milk-snakes/hypo/", ["Hypomelanistic"]),
    trait("Albino", "Recessive", "milk-snakes/albino/", ["Amelanistic", "Amel"]),
    trait("Anerythristic", "Recessive", "milk-snakes/anerythristic/", ["Anery"]),
  ],
};
