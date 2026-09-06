import type { MasterMorphDefinition } from "../masterMorphDatabase";

const MM = "https://www.morphmarket.com/morphpedia/";
type CombinationPart = [geneId: string, copies: 1 | 2];
function signature(parts: CombinationPart[]): string { return [...parts].sort(([a], [b]) => a.localeCompare(b)).map(([geneId, copies]) => `${geneId}:${copies}`).join("|"); }
function formula(parts: CombinationPart[]): string { return [...parts].sort(([a], [b]) => a.localeCompare(b)).map(([geneId, copies]) => `${geneId}${copies === 2 ? " ×2" : ""}`).join(" + "); }
function combo(name: string, parts: CombinationPart[], sourcePath: string, aliases: string[] = []): MasterMorphDefinition {
  return { geneId: `combo-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name, aliases, kind: "Combination", isGene: false, category: "Recognised combination", inheritance: "Unknown", hetPossible: false, verification: "Recognised", description: `${name} is a recognised combination phenotype represented by its underlying component loci.`, educationalNotes: "Combination name only. The underlying genes remain the genetic identity; this entry is not a standalone locus.", sourceUrl: `${MM}${sourcePath}`, sourceLabel: "MorphMarket Morphpedia", geneticSignature: signature(parts), geneticFormula: formula(parts), compositionStatus: "exact" };
}

/** Recognised combination names are phenotype labels, never independent loci. */
export const SPECIES_GENETICS_COMBINATIONS: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    combo("Butter", [["amelanistic", 2], ["caramel", 2]], "corn-snakes/caramel/", ["Amel Caramel"]),
    combo("Amber", [["caramel", 2], ["hypomelanistic", 2]], "corn-snakes/caramel/"),
    combo("Blizzard", [["amelanistic", 2], ["charcoal", 2], ["diffused", 2]], "corn-snakes/charcoal/"),
    combo("Pewter", [["charcoal", 2], ["diffused", 2]], "corn-snakes/charcoal/"),
    combo("Diamond", [["charcoal", 2], ["lava", 2]], "corn-snakes/lava/"),
    combo("Ice", [["anerythristic", 2], ["lava", 2]], "corn-snakes/lava/"),
    combo("Ghost", [["anerythristic", 2], ["hypomelanistic", 2]], "corn-snakes/charcoal/"),
    combo("Creamsicle", [["amelanistic", 2], ["hypomelanistic", 2]], "corn-snakes/hypomelanistic/"),
    combo("Opal", [["amelanistic", 2], ["lavender", 2]], "corn-snakes/"),
    combo("Snow", [["amelanistic", 2], ["anerythristic", 2]], "corn-snakes/"),
    combo("Ultramel", [["amelanistic", 1], ["ultra", 1]], "corn-snakes/"),
  ],
  "Lampropeltis californiae": [
    combo("True Snow", [["amelanistic", 2], ["anerythristic", 2]], "kingsnakes/amelanistic/", ["Snow"]),
    combo("Hybino", [["amelanistic", 2], ["hypo", 2]], "kingsnakes/hypo/"),
    combo("Albescent", [["amelanistic", 2], ["axanthic", 2], ["hypo", 2]], "kingsnakes/axanthic/"),
  ],
  "Lampropeltis triangulum": [
    combo("Ghost", [["anerythristic", 2], ["hypo", 2]], "milk-snakes/hypo/"),
    combo("Hybino", [["albino", 2], ["hypo", 2]], "milk-snakes/hypo/"),
    combo("Snow", [["albino", 2], ["anerythristic", 2]], "milk-snakes/anerythristic/"),
    combo("Pearl", [["albino", 2], ["anerythristic", 2], ["hypo", 2]], "milk-snakes/hypo/"),
  ],
  "Boa constrictor": [
    combo("Ghost", [["anerythristic-type-1", 2], ["hypo", 1]], "boa-constrictors/anerythristic-type-1/"),
    combo("Snow", [["anerythristic-type-1", 2], ["albino-kahl", 2]], "boa-constrictors/anerythristic-type-1/"),
    combo("Moonglow", [["anerythristic-type-1", 2], ["albino-kahl", 2], ["hypo", 1]], "boa-constrictors/anerythristic-type-1/"),
    combo("Sunglow", [["albino-kahl", 2], ["hypo", 1]], "boa-constrictors/anerythristic-type-1/"),
    combo("Anery Blood", [["anerythristic-type-1", 2], ["blood", 1]], "boa-constrictors/anerythristic/"),
    combo("Jungle Blood", [["jungle", 1], ["blood", 1]], "boa-constrictors/"),
  ],
  "Boa imperator": [
    combo("Ghost", [["anery-type-1", 2], ["hypo", 1]], "boa-constrictors/anerythristic-type-1/"),
    combo("Snow", [["anery-type-1", 2], ["kahl-albino", 2]], "boa-constrictors/anerythristic-type-1/"),
    combo("Sunglow", [["kahl-albino", 2], ["hypo", 1]], "boa-constrictors/"),
  ],
  "Morelia spilota": [
    combo("Ghost", [["caramel", 1], ["axanthic", 2]], "carpet-pythons/axanthic/"),
    combo("Snow", [["albino", 2], ["axanthic", 2]], "carpet-pythons/axanthic/"),
    combo("Sun Glow", [["caramel", 1], ["albino", 2]], "carpet-pythons/caramel/"),
  ],
  "Eryx colubrinus": [
    combo("Ghost", [["anery", 2], ["hypomelanistic", 2]], "sand-boas/anery/"),
    combo("Snow", [["albino", 2], ["anery", 2]], "sand-boas/albino/"),
  ],
  "Malayopython reticulatus": [
    combo("Sun Tiger", [["sunfire", 1], ["tiger", 1]], "reticulated-pythons/sunfire/"),
  ],
  "Python bivittatus": [
    combo("Blizzard", [["albino", 2], ["patternless", 2]], "burmese-pythons/albino/"),
    combo("Super Hypo Albino", [["hypo", 2], ["albino", 2]], "burmese-pythons/albino/"),
  ],
};
