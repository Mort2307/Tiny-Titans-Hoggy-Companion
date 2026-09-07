import type { MasterMorphDefinition } from "../masterMorphDatabase";

type Inheritance = MasterMorphDefinition["inheritance"];

const mm = (path: string) => `https://www.morphmarket.com/morphpedia/${path}`;

function trait(species: string, id: string, name: string, inheritance: Inheritance, sourcePath: string, aliases: string[] = [], kind: MasterMorphDefinition["kind"] = inheritance === "Polygenic" ? "Polygenic" : inheritance === "Line-bred" ? "Line-bred" : "Gene"): MasterMorphDefinition {
  return {
    geneId: id,
    name,
    aliases,
    kind,
    isGene: kind === "Gene",
    category: kind === "Gene" ? "Species gene" : kind,
    inheritance,
    hetPossible: kind === "Gene" && inheritance === "Recessive",
    verification: "Recognised",
    description: `Species-specific ${name} trait supported by current specialist genetics documentation for ${species}.`,
    educationalNotes: "Research overlay entry. Use documented inheritance and lineage evidence; a visible phenotype alone does not prove genotype.",
    sourceUrl: mm(sourcePath),
    sourceLabel: "MorphMarket Morphpedia / genetics review",
  };
}

export const SPECIES_GENETICS_RESEARCH_ADDITIONS: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    trait("Pantherophis guttatus", "christmas", "Christmas", "Recessive", "corn-snakes/christmas/", ["Xmas"]),
    trait("Pantherophis guttatus", "dilute", "Dilute", "Recessive", "corn-snakes/dilute/"),
    trait("Pantherophis guttatus", "cinder", "Cinder", "Recessive", "corn-snakes/cinder/", ["Ashy", "Anery C", "Morph Z"]),
  ],
  "Boa constrictor": [
    trait("Boa constrictor", "harlequin", "Harlequin", "Incomplete Dominant", "boa-constrictors/harlequin/"),
    trait("Boa constrictor", "anerythristic-type-2", "Anerythristic (Type 2)", "Recessive", "boa-constrictors/anerythristic-type-2/", ["T2"]),
  ],
  "Boa imperator": [
    trait("Boa imperator", "harlequin", "Harlequin", "Incomplete Dominant", "boa-constrictors/harlequin/"),
  ],
  "Morelia spilota": [
    trait("Morelia spilota", "hypo", "Hypo", "Incomplete Dominant", "carpet-pythons/hypo/", ["Hypomelanistic", "Co-dominant"]),
  ],
  "Epicrates cenchria": [
    trait("Epicrates cenchria", "calico", "Calico", "Polygenic", "rainbow-boas/calico/", [], "Polygenic"),
  ],
  "Malayopython reticulatus": [
    trait("Malayopython reticulatus", "pied", "Pied", "Recessive", "reticulated-pythons/pied/", ["Piebald"]),
    trait("Malayopython reticulatus", "phantom", "Phantom", "Incomplete Dominant", "reticulated-pythons/phantom/", ["Het BluEL", "Het Blue Eyed Leucistic"]),
    trait("Malayopython reticulatus", "sunfire", "Sunfire", "Incomplete Dominant", "reticulated-pythons/sunfire/"),
  ],
};
