import type { MasterMorphDefinition } from "../masterMorphDatabase";

type InheritanceType = MasterMorphDefinition["inheritance"];

const morphMarket = "https://www.morphmarket.com/morphpedia/";

function trait(
  name: string,
  inheritance: InheritanceType,
  sourcePath: string,
  options: { aliases?: string[]; hetPossible?: boolean; kind?: MasterMorphDefinition["kind"] } = {},
): MasterMorphDefinition {
  const kind = options.kind ?? (
    inheritance === "Polygenic" ? "Polygenic" :
    inheritance === "Line-bred" ? "Line-bred" :
    "Gene"
  );
  return {
    geneId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    aliases: options.aliases ?? [],
    kind,
    isGene: kind === "Gene",
    category: kind === "Gene" ? "Species gene" : kind,
    inheritance,
    hetPossible: kind === "Gene" ? (options.hetPossible ?? inheritance === "Recessive") : false,
    verification: "Recognised",
    description: `Species-specific ${name} trait documented for this species in the current evidence set.`,
    educationalNotes: "Species-scoped reference entry. Individual lineage, proof crosses and breeder documentation still determine whether a particular animal is proven for the trait.",
    sourceUrl: `${morphMarket}${sourcePath}`,
    sourceLabel: "MorphMarket Morphpedia",
  };
}

const bySource = (sourcePath: string, rows: Array<[string, InheritanceType, string[]?, boolean?, MasterMorphDefinition["kind"]?]>): MasterMorphDefinition[] =>
  rows.map(([name, inheritance, aliases, hetPossible, kind]) => trait(name, inheritance, sourcePath, { aliases, hetPossible, kind }));

export const SPECIES_GENETICS_CATALOGUES: Record<string, MasterMorphDefinition[]> = {
  "Pantherophis guttatus": [
    ...bySource("corn-snakes/", [
      ["Amelanistic / Albino", "Recessive", ["Amel", "Albino"]],
      ["Anerythristic", "Recessive", ["Anery", "Anery A"]],
      ["Charcoal", "Recessive", ["Anery B"]],
      ["Caramel", "Recessive"],
      ["Cinder", "Recessive"],
      ["Diffused", "Recessive", ["Bloodred"]],
      ["Hypomelanistic", "Recessive", ["Hypo"]],
      ["Lava", "Recessive", ["Hypo C", "Trans Hypo"]],
      ["Motley", "Recessive"],
      ["Stripe", "Recessive"],
      ["Scaleless", "Recessive"],
      ["Sunkissed", "Recessive"],
      ["Palmetto", "Incomplete Dominant"],
      ["Tessera", "Dominant"],
      ["Masque", "Incomplete Dominant"],
      ["Halo", "Incomplete Dominant"],
      ["Tequila Sunrise", "Polygenic", ["TS"], false, "Polygenic"],
    ]),
  ],

  "Boa constrictor": [
    ...bySource("boa-constrictors/", [
      ["Kahl Albino", "Recessive", ["Albino", "Kahl"]],
      ["Anery Type 1", "Recessive", ["Anery"]],
      ["Leopard", "Incomplete Dominant", ["Super Leopard"]],
      ["IMG", "Incomplete Dominant", ["Increased Melanism Gene", "Azabache"]],
      ["Inca", "Dominant"],
      ["Blood", "Incomplete Dominant", ["Blood Boa"]],
      ["Fire", "Incomplete Dominant"],
      ["Jungle", "Incomplete Dominant"],
      ["Motley", "Recessive"],
    ]),
  ],

  "Boa imperator": [
    ...bySource("boa-constrictors/", [
      ["Kahl Albino", "Recessive", ["Albino", "Kahl"]],
      ["Anery Type 1", "Recessive", ["Anery"]],
      ["Leopard", "Incomplete Dominant", ["Super Leopard"]],
      ["Hypo", "Incomplete Dominant", ["Hypomelanistic"]],
      ["IMG", "Incomplete Dominant", ["Increased Melanism Gene", "Azabache"]],
      ["Inca", "Dominant"],
      ["Blood", "Incomplete Dominant", ["Blood Boa"]],
      ["Fire", "Incomplete Dominant"],
      ["Jungle", "Incomplete Dominant"],
    ]),
  ],

  "Python bivittatus": [
    ...bySource("burmese-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Patternless", "Recessive", ["Green"]],
      ["Granite", "Recessive"],
      ["Labyrinth", "Recessive"],
      ["Caramel", "Recessive"],
    ]),
  ],

  "Morelia spilota": [
    ...bySource("carpet-pythons/", [
      ["Jaguar", "Incomplete Dominant", ["Jag"]],
      ["Zebra", "Incomplete Dominant"],
      ["Granite", "Recessive"],
      ["Hypo", "Incomplete Dominant", ["Hypomelanistic"]],
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Axanthic", "Recessive"],
      ["Tiger", "Polygenic", [], false, "Polygenic"],
      ["Genetic Stripe", "Recessive"],
      ["Stonewashed", "Polygenic", [], false, "Polygenic"],
    ]),
  ],

  "Eryx colubrinus": [
    ...bySource("sand-boas/", [
      ["Albino", "Recessive"],
      ["Blonde Albino", "Recessive"],
      ["Anerythristic", "Recessive", ["Anery", "Axanthic"]],
      ["Hypomelanistic", "Recessive", ["Hypo"]],
      ["Splash", "Recessive"],
      ["Paint", "Recessive"],
      ["Gene X", "Recessive", ["GX"]],
      ["Stripe", "Dominant"],
      ["Granite", "Incomplete Dominant"],
      ["Patternless", "Incomplete Dominant"],
      ["Splatter", "Recessive"],
      ["Holloway Reduced Pattern", "Line-bred", ["HRP"], false, "Line-bred"],
      ["Stockwell Nuclear", "Line-bred", [], false, "Line-bred"],
      ["Thermo Nuclear", "Line-bred", [], false, "Line-bred"],
      ["Cal Flame", "Line-bred", [], false, "Line-bred"],
      ["Extreme Red Dodoma Flame", "Line-bred", [], false, "Line-bred"],
      ["P3 Anery", "Line-bred", [], false, "Line-bred"],
    ]),
  ],

  "Gongylophis colubrinus": [
    ...bySource("sand-boas/", [
      ["Albino", "Recessive"],
      ["Anerythristic", "Recessive", ["Anery", "Axanthic"]],
      ["Hypomelanistic", "Recessive", ["Hypo"]],
      ["Splash", "Recessive"],
      ["Paint", "Recessive"],
      ["Gene X", "Recessive", ["GX"]],
      ["Stripe", "Dominant"],
      ["Granite", "Incomplete Dominant"],
      ["Patternless", "Incomplete Dominant"],
    ]),
  ],

  "Epicrates cenchria": [
    ...bySource("rainbow-boas/", [
      ["Anery (Sharp)", "Recessive", ["Anerythristic"]],
      ["Anery (VPI)", "Recessive"],
      ["Anery (T+)", "Recessive"],
      ["Piebald", "Recessive"],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Motley", "Dominant"],
      ["Leopard", "Incomplete Dominant"],
    ]),
  ],

  "Malayopython reticulatus": [
    ...bySource("reticulated-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Anery", "Recessive", ["Anerythristic"]],
      ["Tiger", "Incomplete Dominant"],
      ["Motley", "Incomplete Dominant"],
      ["Golden Child", "Incomplete Dominant"],
      ["Platinum", "Recessive"],
      ["Sunfire", "Incomplete Dominant"],
      ["Dwarf", "Line-bred", [], false, "Line-bred"],
      ["Calico", "Recessive"],
    ]),
  ],

  "Python curtus": [
    ...bySource("short-tailed-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Granite", "Recessive"],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Sunset", "Recessive"],
    ]),
  ],

  "Lampropeltis californiae": [
    ...bySource("kingsnakes/", [
      ["Amelanistic", "Recessive", ["Albino", "Amel"]],
      ["Anerythristic", "Recessive", ["Anery"]],
      ["Hypo", "Recessive", ["Ghost", "Hypomelanistic"]],
      ["Lavender Albino", "Recessive", ["Lavender"]],
      ["Leucistic", "Recessive", ["Lucy"]],
      ["Erythristic", "Recessive"],
      ["Banana", "Incomplete Dominant"],
      ["Peanut Butter", "Recessive"],
      ["Long Beach Hypermelanistic", "Incomplete Dominant", ["Grease King"]],
    ]),
  ],
};
