import type { MorphDefinition } from "./morphs";
import { resolveHognoseMorphInput } from "../genetics/hognoseMorphResolver.ts";

export type FullMorphTaxonomyEntry = MorphDefinition & {
  sourceUrl?: string;
  sourceLabel?: string;
  sourceClaim?: string;
  sourceSnapshotDate?: string;
  taxonomyStatus?: "documented" | "regional" | "community" | "historical";
};

const SOURCE_SNAPSHOT_DATE = "2026-09-08";
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const HOGNOSE_MORPHS = "https://hognose-morphs.com/morphs/all";
const HOGNOSE_POLYGENIC = "https://hognose-morphs.com/morphs/polygenic";
const REPTINODE = "https://reptinode.fr/en/genetics/heterodon-nasicus";

const entry = (
  name: string,
  kind: MorphDefinition["kind"],
  inheritance: MorphDefinition["inheritance"] = "Unknown",
  options: Partial<Pick<FullMorphTaxonomyEntry, "aliases" | "components" | "description" | "educationalNotes" | "verification" | "hetPossible" | "sourceUrl" | "sourceLabel" | "sourceClaim" | "sourceSnapshotDate" | "taxonomyStatus">> = {},
): FullMorphTaxonomyEntry => {
  const inferred = kind === "Combination" ? resolveHognoseMorphInput(name) : undefined;
  const inferredComponents = inferred?.confidence !== "unresolved" && inferred?.components.length ? inferred.components.map((component) => ({
    morphId: component.geneId,
    type: component.kind === "super" ? "Super" : component.kind === "modifier" ? "Polygenic" : "Gene",
    copies: component.copies,
  } as const)) : undefined;

  return {
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
    educationalNotes: options.educationalNotes ?? (inferred?.notes.join(" ") || "Reference taxonomy entry. Confirm lineage and genetic structure before treating this as a confirmed Mendelian locus."),
    sourceUrl: options.sourceUrl,
    sourceLabel: options.sourceLabel,
    sourceClaim: options.sourceClaim ?? (options.sourceUrl?.includes("hognose-morphs.com") ? `${name} is listed by the source catalogue; Tiny Titans records the source claim and does not independently adjudicate breeder nomenclature.` : undefined),
    sourceSnapshotDate: options.sourceSnapshotDate ?? SOURCE_SNAPSHOT_DATE,
    taxonomyStatus: options.taxonomyStatus ?? "documented",
    aliases: options.aliases,
    components: options.components ?? inferredComponents,
  };
};

const geneNames = [
  ["Normal", "Unknown"], ["Albino", "Recessive"], ["Anaconda", "Incomplete Dominant"], ["Conda", "Incomplete Dominant"],
  ["Antarctic", "Incomplete Dominant"], ["Arctic", "Incomplete Dominant"], ["Axanthic", "Recessive"], ["Caramel", "Recessive"],
  ["Cinnamon", "Dominant"], ["Desert", "Unknown"], ["Evan's Hypo", "Recessive"], ["Dutch Hypo", "Recessive"],
  ["True Hypo", "Recessive"], ["Lavender", "Recessive"], ["Leucistic", "Recessive"], ["Pink Pastel Albino", "Recessive"],
  ["Pistachio", "Recessive"], ["Sable", "Recessive"], ["Superarctic", "Incomplete Dominant"], ["Superantarctic", "Incomplete Dominant"],
  ["Superconda", "Incomplete Dominant"], ["Swiss Chocolate", "Recessive"], ["Toffeebelly", "Recessive"], ["Banded", "Unknown"],
  ["Blond", "Unknown"], ["Chocolate", "Unknown"], ["Jaguar", "Unknown"], ["Jungle", "Unknown"], ["Motley", "Unknown"],
  ["Reverse Stripe", "Unknown"], ["Smoke Hypo", "Unknown"], ["Skullface", "Dominant"], ["Woma", "Polygenic"],
] as const;

const lineNames = [
  "Extreme Red", "Gaverth Green", "Green Line", "Green Phase", "Granite", "Granite Jungle", "Lemon Ghost", "Pastel",
  "Purple Line", "Red Line", "Red Purple Line", "Phoenix Red", "Raging Red", "Shadow", "Spider", "Symphony", "Tiger",
  "Twinspot", "Watermelon", "Yellow Line", "Yellow Glow", "Citrus", "Mocha", "Orange Albino", "RBE Pastel",
] as const;

const namedCombinations = [
  "Grey Fog", "Platinum", "Superarctic Anaconda", "Superarctic Superconda", "Albino Anaconda", "Albino Superconda",
  "Albino Arctic", "Albino Arctic Anaconda", "Subzero", "Bubs Daddy", "Bub's Daddy", "Super Daddy", "Electric",
  "Axanthic Anaconda", "Silver Streak", "Silver Torpedo", "Yeti", "Super Yeti", "Caramel Anaconda", "Caramel Superconda",
  "Cinnamon Anaconda", "Cinnamon Superconda", "Cinnamon Arctic", "Cinnamon Arctic Anaconda", "Cinnamon Arctic Superconda",
  "Cinnamon Superarctic", "Desert Anaconda", "Desert Superconda", "Hypo Anaconda", "Hypo Superconda", "Banshee",
  "Banshee Anaconda", "Banshee Superconda", "Caramel Arctic Anaconda", "Caramel Arctic Superconda", "Caramel Superarctic Superconda",
  "Nemesis", "Stormcloud", "Stormcloud Anaconda", "Stormcloud Arctic Anaconda", "Lavender Stormcloud Arctic", "Solar Storm",
  "Snowburst", "Toffeeconda", "Candy", "Toffee Arctic Anaconda", "Toffee Arctic Superconda", "Pink Punch", "Pink Punch Superconda",
  "Thallium", "Maitai", "Maitai Anaconda", "Candy Cocktail", "Maitai Superarctic", "Maitai Superarctic Anaconda",
  "Lavender Anaconda", "Lavender Arctic", "Lavender Superarctic", "Lavender Superconda", "Lavender Toxic Superconda",
  "Lemon Ghost Lavender Superconda", "Coral", "Red Line Conda", "Red Line Arctic", "Red Line Arctic Conda", "Red Line Albino",
  "Red Line Albino Conda", "Red Line Sable", "Red Line Arctic Sable", "Red Line Arctic Albino Anaconda", "Purple Line Conda",
  "Purple Line Albino", "Purple Line Albino Conda", "Yellow Line Conda", "Yellow Line Arctic", "Yellow Line Arctic Conda",
  "Green Line Conda", "Green Line Arctic", "Green Line Arctic Conda", "Extreme Red Albino", "Extreme Red Albino Conda",
  "Extreme Red Superconda", "Extreme Red Sunburst", "Extreme Red Sunburst Superarctic", "Sunburst", "Sunburst Conda",
  "Sunburst Cinnamon Arctic Anaconda", "Pink Panther", "Ash", "Shadow Axanthic", "Jigsaw", "Casper", "Wraith", "Cotton Candy",
  "Moonstone", "Moondust", "Moonstruck", "Albino Arctic Axanthic", "Axanthic Arctic", "Axanthic Arctic Anaconda",
  "Axanthic Arctic Superconda", "Axanthic Superarctic", "Axanthic Antarctic", "Axanthic Superconda", "Mercury", "Toffee Arctic",
  "Toffee Arctic Anaconda", "Toffee Arctic Superconda", "Toffee Yeti", "Arctic Yeti", "Super Arctic Sable", "Super Arctic Conda",
  "Super Arctic Superconda", "Arctic Superconda", "Arctic Superconda Albino", "Albino Conda", "Toffee Conda", "Axanthic Conda",
  "Vanda", "Lavender Conda", "Sable Conda", "Pink Pastel Conda", "Pink Pastel Arctic Anaconda", "Pink Pastel Arctic Superconda",
  "Pink Pastel Maitai Arctic Anaconda", "Shadow Conda", "Snow Conda", "Toxic Conda", "Yeti Conda", "Jigsaw Conda", "Casper Superconda",
  "Toffee Panda", "Superconda Lavender", "Superconda Sable", "Superconda Snow", "Superconda Toxic", "Superconda Yeti",
  "Coral Red Albino", "Purple Albino", "Toffee Sable", "Lavender Sable", "Tiger Conda", "Jaguar Conda", "Microscale Conda",
  "Twin Spot Albino", "Twin Spot Axanthic", "Exorcist", "Snow", "Toxic", "Toxic Evans", "Hypnos", "Axanthic Sable",
  "Axanthic Jigsaw", "Axanthic Casper", "Axanthic Cotton Candy", "Snow Sable", "Maitai Superarctic Anaconda", "Arctic Superconda",
  "Arctic Albino Anaconda", "Arctic Albino Conda", "Albino Antarctic", "Albino Antarctic Anaconda", "Albino Antarctic Superconda",
  "Albino Arctic Antarctic", "Albino Arctic Antarctic Anaconda", "Albino Arctic Antarctic Superconda", "Purple Punch Superconda",
  "Lavender Toffeebelly Superarctic Anaconda", "Lavender Toffeebelly Superarctic Superconda", "Toasted Lavender Superconda",
  "Toffeeburst Superconda", "Vanilla Cherry Superconda", "Tomato Arctic Superconda", "Purple People Eater Superconda",
  "Pastel Toffeeglow Chocolate Superconda", "Crystal Diamond Superconda", "Snow Chocolate", "Snow Chocolate Superconda", "Super Moon",
  "Super Avalanche", "Ultramel Sable Arctic Anaconda", "Albino Skullface Arctic Anaconda", "Albino Skullface Superconda",
  "Skullface Albino Lemon Ghost Anaconda", "Woma Lemon Ghost Albino Anaconda", "Savannah Anaconda", "Savannah Albino Anaconda",
  "Symphony Superarctic Anaconda", "Pastel Axanthic Anaconda", "Vanilla Cherry Superconda", "ATOM",
  "Gaverth Green Lemon Ghost", "Lavender Oxide", "Toffee Frosted", "Lemon Ghost Albino Arctic Anaconda", "Paint Maker Anaconda",
  "Cinnamon Lemon Ghost Extreme Red Anaconda", "Extreme Red Tomato Lemon Ghost Anaconda", "Sunburst Cinnamon Anaconda", "Sable Cinnamon Anaconda",
] as const;

const manualCombinationComponents: Record<string, FullMorphTaxonomyEntry["components"]> = {
  "Gaverth Green Lemon Ghost": [
    { morphId: "gaverth-green", type: "Polygenic", copies: 1 },
    { morphId: "lemon-ghost", type: "Polygenic", copies: 1 },
  ],
  "Lavender Oxide": [
    { morphId: "sable", type: "Gene", copies: 2 },
    { morphId: "lavender", type: "Gene", copies: 2 },
    { morphId: "evans-hypo", type: "Gene", copies: 2 },
  ],
  "Toffee Frosted": [
    { morphId: "toffeebelly", type: "Gene", copies: 2 },
    { morphId: "caramel", type: "Gene", copies: 2 },
    { morphId: "evans-hypo", type: "Gene", copies: 2 },
  ],
  "Lemon Ghost Albino Arctic Anaconda": [
    { morphId: "albino", type: "Gene", copies: 2 },
    { morphId: "arctic", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "lemon-ghost", type: "Polygenic", copies: 1 },
  ],
  "Paint Maker Anaconda": [
    { morphId: "toffeebelly", type: "Gene", copies: 2 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "lemon-ghost", type: "Polygenic", copies: 1 },
  ],
  "Cinnamon Lemon Ghost Extreme Red Anaconda": [
    { morphId: "cinnamon", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "lemon-ghost", type: "Polygenic", copies: 1 },
    { morphId: "extreme-red", type: "Polygenic", copies: 1 },
  ],
  "Extreme Red Tomato Lemon Ghost Anaconda": [
    { morphId: "albino", type: "Gene", copies: 2 },
    { morphId: "cinnamon", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "extreme-red", type: "Polygenic", copies: 1 },
    { morphId: "lemon-ghost", type: "Polygenic", copies: 1 },
  ],
  "Sunburst Cinnamon Anaconda": [
    { morphId: "albino", type: "Gene", copies: 2 },
    { morphId: "cinnamon", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "sable", type: "Gene", copies: 2 },
  ],
  "Sunburst Cinnamon Arctic Anaconda": [
    { morphId: "albino", type: "Gene", copies: 2 },
    { morphId: "arctic", type: "Gene", copies: 1 },
    { morphId: "cinnamon", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "sable", type: "Gene", copies: 2 },
  ],
  "Pink Pastel Maitai Arctic Anaconda": [
    { morphId: "arctic", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "pink-pastel-albino", type: "Gene", copies: 2 },
    { morphId: "sable", type: "Gene", copies: 2 },
    { morphId: "toffeebelly", type: "Gene", copies: 2 },
  ],
  "Sable Cinnamon Anaconda": [
    { morphId: "cinnamon", type: "Gene", copies: 1 },
    { morphId: "conda", type: "Gene", copies: 1 },
    { morphId: "sable", type: "Gene", copies: 2 },
  ],
};

const unverifiedNamedTerms = [
  "Dinker", "Import", "Other Trait", "Paradox", "Savannah", "Shuriken", "Circuit", "Volcano", "Stormcloud Line",
] as const;

export const fullHognoseMorphTaxonomy: FullMorphTaxonomyEntry[] = [
  ...geneNames.map(([name, inheritance]) => entry(name, "Gene", inheritance, {
    sourceUrl: HOGNOSE_MORPHS,
    sourceLabel: "Hognose Morphs / Tiny Titans master reference",
    sourceClaim: `${name} is listed by the current Hognose Morphs catalogue; Tiny Titans records the source claim without treating the name as independently validated.`,
  })),
  ...lineNames.map((name) => entry(name, "Polygenic", "Polygenic", {
    sourceUrl: HOGNOSE_POLYGENIC,
    sourceLabel: "Hognose Morphs polygenic catalogue",
    sourceClaim: `${name} is listed in the Hognose Morphs polygenic catalogue; Tiny Titans preserves the source classification as a source record.`,
    taxonomyStatus: "documented",
  })),
  ...namedCombinations.map((name) => entry(name, "Combination", "Unknown", {
    sourceUrl: HOGNOSE_MORPHS,
    sourceLabel: "Hognose Morphs current named-combination catalogue",
    sourceClaim: `${name} is listed by the current Hognose Morphs catalogue; the linked source page is the authority for the recorded name and source-described components.`,
    components: manualCombinationComponents[name],
    educationalNotes: name === "Extreme Red Tomato Lemon Ghost Anaconda"
      ? "The source page name contains 'Tomato', but its structured Contains block does not list Tomato. Tiny Titans does not manufacture a Tomato gene; the source-described components are preserved exactly and the naming discrepancy is flagged."
      : name === "Sunburst Cinnamon Arctic Anaconda"
        ? "The source page prose identifies Sable as present, while the structured Contains list omits Sable. Tiny Titans preserves the source prose-derived Sable component and flags the source inconsistency for review."
        : undefined,
  })),
  ...unverifiedNamedTerms.map((name) => entry(name, "Project", "Unknown", {
    sourceUrl: REPTINODE,
    sourceLabel: "ReptiNode named-term index",
    sourceClaim: `${name} is preserved as a community/reference term; Tiny Titans does not promote it to confirmed genetics.`,
    verification: "Unverified",
    taxonomyStatus: "community",
    description: `Named Western Hognose term encountered in community/reference indexing: ${name}. Tiny Titans preserves the name for search and correction workflows but does not treat it as confirmed genetics.`,
  })),
];

export const fullHognoseMorphTaxonomyByName = new Map(
  fullHognoseMorphTaxonomy.map((item) => [item.name.toLowerCase(), item]),
);