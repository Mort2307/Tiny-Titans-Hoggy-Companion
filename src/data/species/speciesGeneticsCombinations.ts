import type { MasterMorphDefinition } from "../masterMorphDatabase";

const MM = "https://www.morphmarket.com/morphpedia/";

function signature(parts: string[]): string {
  return [...new Set(parts)].sort().map((geneId) => `${geneId}:1`).join("|");
}

function combo(
  name: string,
  parts: string[],
  sourcePath: string,
  aliases: string[] = [],
): MasterMorphDefinition {
  return {
    geneId: `combo-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    aliases,
    kind: "Combination",
    isGene: false,
    category: "Recognised combination",
    inheritance: "Unknown",
    hetPossible: false,
    verification: "Recognised",
    description: `${name} is a recognised combination phenotype represented by its underlying component loci.`,
    educationalNotes: "Combination name only. The underlying genes remain the genetic identity; this entry is not a standalone locus.",
    sourceUrl: `${MM}${sourcePath}`,
    sourceLabel: "MorphMarket Morphpedia",
    geneticSignature: signature(parts),
    geneticFormula: parts.sort().join(" + "),
    compositionStatus: "exact",
  };
}

/**
 * Recognised combination names are stored separately from gene rows. This
 * prevents a named combo from becoming a fake Mendelian locus while still
 * allowing search, reversal and breeding output to resolve the common name.
 */
export const SPECIES_GENETICS_COMBINATIONS: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    combo("Butter", ["amelanistic", "caramel"], "corn-snakes/caramel/", ["Amel Caramel"]),
    combo("Amber", ["caramel", "hypomelanistic"], "corn-snakes/caramel/"),
    combo("Blizzard", ["amelanistic", "charcoal"], "corn-snakes/charcoal/"),
    combo("Pewter", ["charcoal", "diffused"], "corn-snakes/charcoal/"),
    combo("Diamond", ["charcoal", "lava"], "corn-snakes/lava/"),
    combo("Ice", ["anerythristic", "lava"], "corn-snakes/lava/"),
    combo("Ghost", ["anerythristic", "hypomelanistic"], "corn-snakes/charcoal/"),
  ],

  "Lampropeltis californiae": [
    combo("True Snow", ["amelanistic", "anerythristic"], "kingsnakes/amelanistic/", ["Snow"]),
    combo("Hybino", ["amelanistic", "hypo"], "kingsnakes/hypo/"),
    combo("Albescent", ["amelanistic", "axanthic", "hypo"], "kingsnakes/axanthic/"),
  ],

  "Lampropeltis triangulum": [
    combo("Ghost", ["anerythristic", "hypo"], "milk-snakes/hypo/"),
    combo("Hybino", ["albino", "hypo"], "milk-snakes/hypo/"),
    combo("Pearl", ["albino", "anerythristic", "hypo"], "milk-snakes/hypo/"),
  ],

  "Boa constrictor": [
    combo("Ghost", ["anery-type-1", "hypo"], "boa-constrictors/anerythristic-type-1/"),
    combo("Snow", ["anery-type-1", "kahl-albino"], "boa-constrictors/anerythristic-type-1/"),
    combo("Moonglow", ["anery-type-1", "kahl-albino", "hypo"], "boa-constrictors/anerythristic-type-1/"),
    combo("Sunglow", ["kahl-albino", "hypo"], "boa-constrictors/anerythristic-type-1/"),
  ],

  "Morelia spilota": [
    combo("Ghost", ["caramel", "axanthic"], "carpet-pythons/axanthic/"),
    combo("Snow", ["albino", "axanthic"], "carpet-pythons/axanthic/"),
    combo("Sun Glow", ["caramel", "albino"], "carpet-pythons/caramel/"),
  ],

  "Eryx colubrinus": [
    combo("Ghost", ["anery", "hypomelanistic"], "sand-boas/anery/"),
    combo("Snow", ["albino", "anery"], "sand-boas/albino/"),
  ],

  "Malayopython reticulatus": [
    combo("Sun Tiger", ["sunfire", "tiger"], "reticulated-pythons/sunfire/"),
  ],
};
