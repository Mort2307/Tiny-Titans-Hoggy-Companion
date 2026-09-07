import type { MasterMorphDefinition } from "../masterMorphDatabase";

type Inheritance = MasterMorphDefinition["inheritance"];

const mm = (path: string) => `https://www.morphmarket.com/morphpedia/${path}`;

function trait(species: string, name: string, inheritance: Inheritance, sourcePath: string, aliases: string[] = [], kind: MasterMorphDefinition["kind"] = inheritance === "Polygenic" ? "Polygenic" : inheritance === "Line-bred" ? "Line-bred" : "Gene"): MasterMorphDefinition {
  return {
    geneId: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
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

function replace(species: string, name: string, inheritance: Inheritance, sourcePath: string, aliases: string[] = [], kind?: MasterMorphDefinition["kind"]): MasterMorphDefinition {
  return trait(species, name, inheritance, sourcePath, aliases, kind ?? (inheritance === "Polygenic" ? "Polygenic" : inheritance === "Line-bred" ? "Line-bred" : "Gene"));
}

export const SPECIES_GENETICS_RESEARCH_ADDITIONS: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    replace("Pantherophis guttatus", "Christmas", "Recessive", "corn-snakes/christmas/", ["Xmas"]),
    replace("Pantherophis guttatus", "Dilute", "Recessive", "corn-snakes/dilute/"),
    replace("Pantherophis guttatus", "Cinder", "Recessive", "corn-snakes/cinder/", ["Ashy", "Anery C", "Morph Z"]),
  ],
  "Boa constrictor": [
    replace("Boa constrictor", "Harlequin", "Incomplete Dominant", "boa-constrictors/harlequin/"),
    replace("Boa constrictor", "Anerythristic (Type 2)", "Recessive", "boa-constrictors/anerythristic-type-2/", ["T2"]),
  ],
  "Boa imperator": [
    replace("Boa imperator", "Harlequin", "Incomplete Dominant", "boa-constrictors/harlequin/"),
  ],
  "Morelia spilota": [
    replace("Morelia spilota", "Hypo", "Incomplete Dominant", "carpet-pythons/hypo/", ["Hypomelanistic", "Co-dominant"]),
  ],
  "Epicrates cenchria": [
    replace("Epicrates cenchria", "Calico", "Polygenic", "rainbow-boas/calico/", [], "Polygenic"),
  ],
  "Malayopython reticulatus": [
    replace("Malayopython reticulatus", "Pied", "Recessive", "reticulated-pythons/pied/", ["Piebald"]),
    replace("Malayopython reticulatus", "Phantom", "Incomplete Dominant", "reticulated-pythons/phantom/", ["Het BluEL", "Het Blue Eyed Leucistic"]),
    replace("Malayopython reticulatus", "Sunfire", "Incomplete Dominant", "reticulated-pythons/sunfire/"),
  ],
};
