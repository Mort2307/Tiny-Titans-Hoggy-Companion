import type { MasterMorphDefinition } from "../masterMorphDatabase.ts";

type InheritanceType = MasterMorphDefinition["inheritance"];

const morphMarket = "https://www.morphmarket.com/morphpedia/";

function trait(
  name: string,
  inheritance: InheritanceType,
  sourcePath: string,
  options: { aliases?: string[]; hetPossible?: boolean; kind?: MasterMorphDefinition["kind"]; description?: string } = {},
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
    description: options.description ?? `Species-specific ${name} trait documented for this species in MorphMarket's trait knowledge base.`,
    educationalNotes: "Species-scoped reference entry. Individual lineage and breeder documentation still determine whether a particular animal is proven for the trait.",
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
      ["Lavender", "Recessive"],
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
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Leopard", "Recessive"],
      ["IMG", "Dominant", ["Increased Melanism Gene", "Azabache"]],
      ["Inca", "Dominant"],
      ["Fire", "Incomplete Dominant"],
      ["Jungle", "Incomplete Dominant"],
      ["Motley", "Recessive"],
    ]),
  ],

  "Boa imperator": [
    ...bySource("boa-constrictors/", [
      ["Kahl Albino", "Recessive", ["Albino", "Kahl"]],
      ["Anery Type 1", "Recessive", ["Anery"]],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
      ["Leopard", "Recessive"],
      ["IMG", "Dominant", ["Increased Melanism Gene", "Azabache"]],
      ["Inca", "Dominant"],
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
      ["Hypo", "Incomplete Dominant"],
    ]),
  ],

  "Morelia spilota": [
    ...bySource("carpet-pythons/", [
      ["Jaguar", "Incomplete Dominant", ["Jag"]],
      ["Zebra", "Incomplete Dominant"],
      ["Granite", "Recessive"],
      ["Hypo", "Recessive", ["Hypomelanistic"]],
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
      ["Tiger", "Recessive"],
      ["Motley", "Incomplete Dominant"],
      ["Golden Child", "Incomplete Dominant"],
      ["Platinum", "Recessive"],
      ["Sunfire", "Incomplete Dominant"],
      ["Dwarf", "Line-bred", [], false, "Line-bred"],
      ["Super Tiger", "Incomplete Dominant"],
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

  "Python regius": [
    ...bySource("ball-pythons/", [
      ["Albino", "Recessive", ["Amelanistic", "Amel"]],
      ["Axanthic", "Recessive", ["Anery"]],
      ["Clown", "Recessive"],
      ["Desert Ghost", "Recessive", ["DG"]],
      ["Ghost", "Recessive", ["Hypo"]],
      ["Genetic Stripe", "Recessive", ["G Stripe"]],
      ["Lavender Albino", "Recessive", ["Lavender", "Lav Albino"]],
      ["Piebald", "Recessive", ["Pied"]],
      ["Puzzle", "Recessive"],
      ["Tri-Stripe", "Recessive", ["Tristripe", "Tri Stripe"]],
      ["Ultramel", "Recessive"],
      ["Enhancer", "Recessive"],
      ["Axanthic (MJ)", "Recessive", ["Markus Jayne Axanthic"]],
      ["Banana", "Incomplete Dominant", ["Coral Glow"]],
      ["Bamboo", "Incomplete Dominant"],
      ["Black Pastel", "Incomplete Dominant"],
      ["Butter", "Incomplete Dominant"],
      ["Cinnamon", "Incomplete Dominant"],
      ["Fire", "Incomplete Dominant"],
      ["Lesser", "Incomplete Dominant"],
      ["Mojave", "Incomplete Dominant"],
      ["Mystic", "Incomplete Dominant"],
      ["Orange Dream", "Incomplete Dominant", ["OD"]],
      ["Pastel", "Incomplete Dominant"],
      ["Phantom", "Incomplete Dominant"],
      ["Enchi", "Incomplete Dominant"],
      ["GHI", "Incomplete Dominant"],
      ["Mahogany", "Incomplete Dominant"],
      ["Red Stripe", "Incomplete Dominant"],
      ["Yellow Belly", "Incomplete Dominant"],
      ["Champagne", "Incomplete Dominant"],
      ["Cypress", "Incomplete Dominant"],
      ["Gravel", "Incomplete Dominant"],
      ["Huffman", "Incomplete Dominant"],
      ["Leopard", "Incomplete Dominant"],
      ["Lori", "Incomplete Dominant"],
      ["Special", "Incomplete Dominant"],
      ["Jolt", "Incomplete Dominant"],
      ["Raven", "Incomplete Dominant"],
      ["Honey", "Incomplete Dominant"],
      ["Scaleless Head", "Incomplete Dominant"],
      ["Pinstripe", "Dominant"],
      ["Spider", "Dominant"],
      ["Spotnose", "Dominant"],
      ["Ashen", "Dominant"],
      ["Citron", "Incomplete Dominant"],
    ]),
  ],
};
