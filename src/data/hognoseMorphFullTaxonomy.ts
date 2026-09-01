import type { MorphDefinition } from "./morphs";

export type FullMorphTaxonomyEntry = MorphDefinition & {
  sourceUrl?: string;
  sourceLabel?: string;
  taxonomyStatus?: "documented" | "regional" | "community" | "historical";
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const entry = (
  name: string,
  kind: MorphDefinition["kind"],
  inheritance: MorphDefinition["inheritance"] = "Unknown",
  options: Partial<Pick<FullMorphTaxonomyEntry, "aliases" | "components" | "description" | "educationalNotes" | "verification" | "hetPossible" | "sourceUrl" | "sourceLabel" | "taxonomyStatus">> = {},
): FullMorphTaxonomyEntry => ({
  geneId: slug(name),
  name,
  kind,
  isGene: kind === "Gene",
  isCombination: kind === "Combination",
  category: kind === "Line-bred" || kind === "Polygenic" ? kind : "Reference Morph",
  inheritance,
  hetPossible: options.hetPossible ?? false,
  verification: options.verification ?? "Recognised",
  description: options.description ?? `Documented Western Hognose morph or named phenotype: ${name}.`,
  educationalNotes: options.educationalNotes ?? "Reference taxonomy entry. Confirm lineage and genetic structure before treating this as a confirmed Mendelian locus.",
  sourceUrl: options.sourceUrl,
  sourceLabel: options.sourceLabel,
  taxonomyStatus: options.taxonomyStatus ?? "documented",
  aliases: options.aliases,
  components: options.components,
});

const HOGNOSE_MORPHS = "https://hognose-morphs.com/morphs/all";
const HOGNOSE_POLYGENIC = "https://hognose-morphs.com/morphs/polygenic";
const REPTIFIT = "https://www.reptifit.nl/en/collection";
const REPTINODE = "https://reptinode.fr/en/genetics/heterodon-nasicus";

const geneNames = [
  ["Normal", "Unknown"], ["Albino", "Recessive"], ["Anaconda", "Incomplete Dominant"], ["Conda", "Incomplete Dominant"],
  ["Antarctic", "Incomplete Dominant"], ["Arctic", "Incomplete Dominant"], ["Axanthic", "Recessive"], ["Caramel", "Recessive"],
  ["Cinnamon", "Dominant"], ["Desert", "Unknown"], ["Evan's Hypo", "Recessive"], ["Dutch Hypo", "Recessive"],
  ["True Hypo", "Recessive"], ["Lavender", "Recessive"], ["Leucistic", "Recessive"], ["Pink Pastel Albino", "Recessive"],
  ["Pistachio", "Recessive"], ["Sable", "Recessive"], ["Superarctic", "Incomplete Dominant"], ["Superantarctic", "Incomplete Dominant"],
  ["Superconda", "Incomplete Dominant"], ["Swiss Chocolate", "Recessive"], ["Toffeebelly", "Recessive"], ["Banded", "Unknown"],
  ["Blond", "Unknown"], ["Chocolate", "Unknown"], ["Jaguar", "Unknown"], ["Jungle", "Unknown"], ["Motley", "Unknown"],
  ["Reverse Stripe", "Unknown"], ["Smoke Hypo", "Unknown"], ["Skullface", "Unknown"], ["Woma", "Unknown"],
] as const;

const lineNames = [
  "Extreme Red", "Gaverth Green", "Green Line", "Green Phase", "Granite", "Granite Jungle", "Lemon Ghost", "Pastel",
  "Purple Line", "Red Line", "Red Purple Line", "Phoenix Red", "Raging Red", "Shadow", "Spider", "Symphony", "Tiger",
  "Twinspot", "Watermelon", "Yellow Line", "Yellow Glow", "Citrus", "Mocha", "Orange Albino", "RBE Pastel",
] as const;

const namedCombinations = [
  "Grey Fog", "Platinum", "Superarctic Anaconda", "Superarctic Superconda", "Albino Anaconda", "Albino Superconda",
  "Albino Arctic", "Albino Arctic Anaconda", "Subzero", "Super Daddy", "Electric", "Axanthic Anaconda", "Silver Streak",
  "Yeti", "Super Yeti", "Caramel Anaconda", "Caramel Superconda", "Cinnamon Anaconda", "Extreme Red Tomato Anaconda",
  "Black Ice", "Blucifer", "Big Black Conda", "Sable Arctic Superconda", "Stormcloud", "Stormcloud Anaconda", "Solar Storm",
  "Snowburst", "Toffeeconda", "Candy", "Toffee Arctic Anaconda", "Toffee Arctic Superconda", "Pink Punch", "Thallium", "Maitai",
  "Maitai Anaconda", "Candy Cocktail", "Maitai Superarctic", "Maitai Superarctic Anaconda", "Lavender Anaconda", "Coral",
  "Red Line Conda", "Red Line Arctic", "Red Line Arctic Conda", "Red Line Albino", "Red Line Albino Conda", "Red Line Sable",
  "Red Line Arctic Sable", "Red Line Arctic Albino Anaconda", "Purple Line Conda", "Purple Line Albino", "Purple Line Albino Conda",
  "Yellow Line Conda", "Yellow Line Arctic", "Yellow Line Arctic Conda", "Green Line Conda", "Green Line Arctic", "Green Line Arctic Conda",
  "Extreme Red Albino", "Extreme Red Albino Conda", "Extreme Red Superconda", "Extreme Red Sunburst", "Extreme Red Sunburst Superarctic",
  "Sunburst", "Sunburst Conda", "Pink Panther", "Ash", "Shadow Axanthic", "Jigsaw", "Casper", "Wraith", "Cotton Candy",
  "Moonstone", "Albino Arctic Axanthic", "Axanthic Arctic", "Toffee Arctic", "Lavender Arctic", "Subzero Arctic", "Arctic Yeti",
  "Toffee Yeti", "Super Arctic Axanthic", "Lavender Yeti", "Super Arctic Sable", "Super Arctic Conda", "Super Arctic Superconda",
  "Albino Conda", "Toffee Conda", "Axanthic Conda", "Vanda", "Lavender Conda", "Sable Conda", "Pink Pastel Conda",
  "Shadow Conda", "Snow Conda", "Toxic Conda", "Yeti Conda", "Jigsaw Conda", "Casper Superconda", "Toffee Panda",
  "Superconda Lavender", "Superconda Sable", "Superconda Snow", "Superconda Toxic", "Superconda Yeti", "Coral Red Albino",
  "Purple Albino", "Toffee Sable", "Lavender Sable", "Tiger Conda", "Jaguar Conda", "Microscale Conda", "Twin Spot Albino",
  "Twin Spot Axanthic", "Exorcist", "Snow", "Toxic", "Toxic Evans", "Hypnos", "Axanthic Sable", "Axanthic Jigsaw",
  "Axanthic Casper", "Axanthic Cotton Candy", "Snow Sable", "Maitai Superarctic Anaconda", "Arctic Superconda", "Arctic Superconda Albino",
  "Arctic Albino Anaconda", "Arctic Albino Conda", "Albino Antarctic", "Albino Antarctic Anaconda", "Albino Antarctic Superconda",
  "Albino Arctic Antarctic", "Albino Arctic Antarctic Anaconda", "Albino Arctic Antarctic Superconda", "Axanthic Superconda", "Mercury",
  "Moondust", "Moonstone", "Ghost", "T+ Snow", "Ultra Albino", "Ultra Caramel", "Ultramel", "Hybino", "Purple Haze",
  "Toffee Glow", "Sunburst Superconda", "Super Arctic Toffee", "Super Arctic Lavender", "Super Arctic Conda", "Super Arctic Sable Conda",
  "Sable Toffee", "Sable Toffee Conda", "Sable Toffee Superconda", "Sable Toffee Superarctic", "Sable Toffee Superarctic Anaconda",
] as const;

const unverifiedNamedTerms = [
  "Dinker", "Import", "Other Trait", "Paradox", "Gaverth Green", "Savannah", "Symphony", "Stormcloud", "Grey Fog", "Jigsaw",
  "Casper", "Wraith", "Ash", "Exorcist", "Microscale", "Masque", "Shuriken", "Circuit", "Volcano", "Stormcloud Line",
] as const;

export const fullHognoseMorphTaxonomy: FullMorphTaxonomyEntry[] = [
  ...geneNames.map(([name, inheritance]) => entry(name, "Gene", inheritance, {
    sourceUrl: HOGNOSE_MORPHS,
    sourceLabel: "Hognose Morphs / Tiny Titans master reference",
  })),
  ...lineNames.map((name) => entry(name, "Line-bred", "Line-bred", {
    sourceUrl: HOGNOSE_POLYGENIC,
    sourceLabel: "Hognose Morphs polygenic catalogue",
    taxonomyStatus: "documented",
  })),
  ...namedCombinations.map((name) => entry(name, "Combination", "Unknown", {
    sourceUrl: REPTIFIT,
    sourceLabel: "Reptifit collection / current named combinations",
  })),
  ...unverifiedNamedTerms.map((name) => entry(name, "Project", "Unknown", {
    sourceUrl: REPTINODE,
    sourceLabel: "ReptiNode named-term index",
    verification: "Unverified",
    taxonomyStatus: "community",
    description: `Named Western Hognose term encountered in current community/reference indexing: ${name}. Tiny Titans preserves the name for search and correction workflows but does not treat it as confirmed genetics.`,
  })),
];

export const fullHognoseMorphTaxonomyByName = new Map(
  fullHognoseMorphTaxonomy.map((item) => [item.name.toLowerCase(), item]),
);
