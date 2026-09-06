import type { MasterMorphDefinition } from "../masterMorphDatabase.ts";
import type { CombinationDefinition, CombinationComponent, EvidenceRecord } from "../../genetics/geneticsModel.ts";

const morphMarket = "https://www.morphmarket.com/morphpedia/";

type ComboSpec = {
  id: string;
  species: string;
  name: string;
  aliases?: string[];
  components: CombinationComponent[];
  sourcePath: string;
  note: string;
};

function component(species: string, geneId: string, copies: 1 | 2 = 1): CombinationComponent {
  if (species === "Pantherophis guttatus") {
    if (geneId === "amel") return { locusId: "pantherophis-guttatus-amel-locus", alleleId: "amel", copies };
    if (geneId === "motley" || geneId === "stripe") return { locusId: "pantherophis-guttatus-pattern-locus", alleleId: geneId, copies };
  }
  return { locusId: `catalogue:${species}:${geneId}`, alleleId: geneId, copies };
}

function evidence(spec: ComboSpec): EvidenceRecord {
  return {
    sourceType: "specialist_database",
    claim: `${spec.name} is listed by MorphMarket as a named trait combination for ${spec.species}, built from the specified component traits.`,
    confidence: "moderate",
    source: `${morphMarket}${spec.sourcePath}`,
    note: spec.note,
  };
}

function toCombination(spec: ComboSpec): CombinationDefinition {
  const record = evidence(spec);
  return {
    id: spec.id,
    species: spec.species,
    name: spec.name,
    aliases: spec.aliases,
    componentLocusIds: [...new Set(spec.components.map((item) => item.locusId))],
    components: spec.components,
    status: "recognised",
    evidence: [record],
  };
}

function toMorph(spec: ComboSpec): MasterMorphDefinition {
  return {
    geneId: spec.id,
    name: spec.name,
    aliases: spec.aliases ?? [],
    kind: "Combination",
    isGene: false,
    isCombination: true,
    category: "Recognised genetic combination",
    inheritance: "Unknown",
    hetPossible: false,
    verification: "Recognised",
    evidenceStatus: "documented",
    description: `Recognised ${spec.name} combination: ${spec.components.map((item) => `${item.alleleId}${item.copies === 2 ? " ×2" : ""}`).join(" + ")}.`,
    educationalNotes: `${spec.note} This name describes a phenotype/genetic combination and is not an independent locus.`,
    sourceUrl: `${morphMarket}${spec.sourcePath}`,
    sourceLabel: "MorphMarket Morphpedia",
    components: spec.components.map((item) => ({ morphId: item.alleleId, type: "Gene" as const, copies: item.copies })),
  };
}

const cornSnake: ComboSpec[] = [
  ["almond", "Almond", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "lavender")]],
  ["amaretto", "Amaretto", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic"), component("Pantherophis guttatus", "lavender")]],
  ["amber", "Amber", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic")]],
  ["butter", "Butter", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "caramel")]],
  ["caramot", "Caramot", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "motley")]],
  ["caramel-shatter", "Caramel Shatter", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "cinder"), component("Pantherophis guttatus", "sunkissed")]],
  ["citrine", "Citrine", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic")]],
  ["diamond", "Diamond", [component("Pantherophis guttatus", "charcoal"), component("Pantherophis guttatus", "lava")]],
  ["diffused-ice", "Diffused Ice", [component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "diffused"), component("Pantherophis guttatus", "lava")]],
  ["eclipse-stripe", "Eclipse Stripe", [component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "lavender"), component("Pantherophis guttatus", "stripe"), component("Pantherophis guttatus", "sunkissed")]],
  ["etna", "Etna", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "diffused"), component("Pantherophis guttatus", "lava"), component("Pantherophis guttatus", "sunkissed")]],
  ["honey", "Honey", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "sunkissed")]],
  ["ice", "Ice", [component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "lava")]],
  ["lavalanche", "Lavalanche", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "diffused"), component("Pantherophis guttatus", "lava")]],
  ["lavamelanistic", "Lavamelanistic", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "lava")]],
  ["lemon-stripe", "Lemon Stripe", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic"), component("Pantherophis guttatus", "stripe"), component("Pantherophis guttatus", "sunkissed")]],
  ["orchid", "Orchid", [component("Pantherophis guttatus", "lavender"), component("Pantherophis guttatus", "sunkissed")]],
  ["peppermint", "Peppermint", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "cinder")]],
  ["saffron", "Saffron", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "sunkissed")]],
  ["sulfur", "Sulfur", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "diffused")]],
  ["topaz", "Topaz", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "lava")]],
  ["xanthic-snow", "Xanthic Snow", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "caramel")]],
].map(([id, name, components]) => ({ id, name, species: "Pantherophis guttatus", components, sourcePath: `corn-snakes/${name.toLowerCase().replace(/ /g, "-")}/`, note: "MorphMarket explicitly lists this as a named corn snake combination. Component genes are restricted to traits already represented in Tiny Titans." }));

const boaCombos = (species: string): ComboSpec[] => [
  ["ghost", "Ghost", [component(species, "hypo"), component(species, "anery-type-1")], "Ghost", "Hypo + Anery Type 1"],
  ["junglow", "Junglow", [component(species, "hypo"), component(species, "jungle"), component(species, "kahl-albino")], "Junglow", "Hypo + Jungle + Kahl Albino"],
  ["moon-glow", "Moon Glow", [component(species, "hypo"), component(species, "kahl-albino"), component(species, "anery-type-1")], "Moon Glow", "Hypo + Kahl Albino + Anery Type 1"],
  ["moonglow", "Moonglow", [component(species, "hypo"), component(species, "kahl-albino"), component(species, "anery-type-1")], "Moonglow", "Same genetic signature as Moon Glow; retained as a recognised spelling."],
  ["snow", "Snow", [component(species, "kahl-albino"), component(species, "anery-type-1")], "Snow", "Kahl Albino + Anery Type 1"],
  ["sunglow", "Sunglow", [component(species, "hypo"), component(species, "kahl-albino")], "Sunglow", "Hypo + Kahl Albino"],
].map(([id, name, components, sourceName, note]) => ({ id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${id}`, name, species, components, sourcePath: `boa-constrictors/${sourceName.toLowerCase().replace(/ /g, "-")}/`, note }));

const burmese: ComboSpec[] = [
  { id: "python-bivittatus-pearl", species: "Python bivittatus", name: "Pearl", components: [component("Python bivittatus", "hypo"), component("Python bivittatus", "albino")], sourcePath: "burmese-pythons/hypo/", note: "MorphMarket lists Pearl as Hypo + Albino." },
  { id: "python-bivittatus-blizzard", species: "Python bivittatus", name: "Blizzard", components: [component("Python bivittatus", "hypo", 2), component("Python bivittatus", "albino")], sourcePath: "burmese-pythons/hypo/", note: "MorphMarket lists Blizzard as Super Hypo + Albino; Hypo ×2 is therefore represented at one locus." },
];

const carpet: ComboSpec[] = [
  { id: "morelia-spilota-snow", species: "Morelia spilota", name: "Snow", components: [component("Morelia spilota", "albino"), component("Morelia spilota", "axanthic")], sourcePath: "carpet-pythons/albino/", note: "MorphMarket lists Snow as Albino + Axanthic." },
];

const sandBoa = (species: string): ComboSpec[] => [
  { id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-anery-splash`, species, name: "Anery Splash", components: [component(species, "anerythristic"), component(species, "splash")], sourcePath: "sand-boas/anery/", note: "MorphMarket lists Anery Splash as the named combination of Anery + Splash." },
  { id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ghost`, species, name: "Ghost", components: [component(species, "anerythristic"), component(species, "hypomelanistic")], sourcePath: "sand-boas/anery/", note: "MorphMarket lists Ghost as Anery + Hypo." },
  { id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-snow`, species, name: "Snow", components: [component(species, "albino"), component(species, "anerythristic")], sourcePath: "sand-boas/anery/", note: "MorphMarket lists Snow as Albino + Anery." },
];

const retic: ComboSpec[] = [
  { id: "malayopython-reticulatus-snow", species: "Malayopython reticulatus", name: "Snow", components: [component("Malayopython reticulatus", "albino"), component("Malayopython reticulatus", "anery")], sourcePath: "reticulated-pythons/albino/", note: "MorphMarket lists Snow as Albino + Anery." },
  { id: "malayopython-reticulatus-sun-tiger", species: "Malayopython reticulatus", name: "Sun Tiger", components: [component("Malayopython reticulatus", "sunfire"), component("Malayopython reticulatus", "tiger")], sourcePath: "reticulated-pythons/sunfire/", note: "MorphMarket documents Sun Tiger as Sunfire + Tiger." },
  { id: "malayopython-reticulatus-albino-super-sun", species: "Malayopython reticulatus", name: "Albino Super Sun", components: [component("Malayopython reticulatus", "sunfire", 2), component("Malayopython reticulatus", "albino")], sourcePath: "reticulated-pythons/albino/", note: "MorphMarket documents Albino Super Sun as Super Sunfire + Albino; Sunfire ×2 is represented at one locus." },
];

const kingsnake: ComboSpec[] = [
  { id: "lampropeltis-californiae-flamethrower", species: "Lampropeltis californiae", name: "Flamethrower", components: [component("Lampropeltis californiae", "erythristic"), component("Lampropeltis californiae", "hypo")], sourcePath: "kingsnakes/hypo/", note: "MorphMarket lists Flamethrower as Erythristic + Hypo." },
  { id: "lampropeltis-californiae-hybino", species: "Lampropeltis californiae", name: "Hybino", components: [component("Lampropeltis californiae", "hypo"), component("Lampropeltis californiae", "lavender-albino")], sourcePath: "kingsnakes/lavender-albino/", note: "MorphMarket lists Hybino as Hypo + Lavender Albino." },
  { id: "lampropeltis-californiae-true-hybino", species: "Lampropeltis californiae", name: "True Hybino", components: [component("Lampropeltis californiae", "amelanistic"), component("Lampropeltis californiae", "hypo")], sourcePath: "kingsnakes/amelanistic/", note: "MorphMarket lists True Hybino as Amelanistic + Hypo." },
  { id: "lampropeltis-californiae-true-snow", species: "Lampropeltis californiae", name: "True Snow", components: [component("Lampropeltis californiae", "amelanistic"), component("Lampropeltis californiae", "anerythristic")], sourcePath: "kingsnakes/amelanistic/", note: "MorphMarket lists True Snow as Amelanistic + Anerythristic." },
  { id: "lampropeltis-californiae-anery-snow", species: "Lampropeltis californiae", name: "Anery Snow", components: [component("Lampropeltis californiae", "anerythristic"), component("Lampropeltis californiae", "lavender-albino")], sourcePath: "kingsnakes/lavender-albino/", note: "MorphMarket lists Anery Snow as Anerythristic + Lavender Albino." },
  { id: "lampropeltis-californiae-double-albino", species: "Lampropeltis californiae", name: "Double Albino", components: [component("Lampropeltis californiae", "amelanistic"), component("Lampropeltis californiae", "lavender-albino")], sourcePath: "kingsnakes/lavender-albino/", note: "MorphMarket lists Double Albino as Amelanistic + Lavender Albino." },
];

const allSpecs: ComboSpec[] = [
  ...cornSnake,
  ...boaCombos("Boa constrictor"),
  ...boaCombos("Boa imperator"),
  ...burmese,
  ...carpet,
  ...sandBoa("Eryx colubrinus"),
  ...sandBoa("Gongylophis colubrinus"),
  ...retic,
  ...kingsnake,
];

export const SPECIES_GENETICS_COMBINATIONS: CombinationDefinition[] = allSpecs.map(toCombination);
export const SPECIES_GENETICS_COMBINATION_MORPHS: MasterMorphDefinition[] = allSpecs.map(toMorph);
export const SPECIES_GENETICS_COMBINATION_SPECS = allSpecs;
