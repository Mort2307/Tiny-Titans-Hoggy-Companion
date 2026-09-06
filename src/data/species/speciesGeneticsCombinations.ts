import type { MasterMorphDefinition } from "../masterMorphDatabase.ts";
import type { CombinationDefinition, CombinationComponent, EvidenceRecord } from "../../genetics/geneticsModel.ts";

const morphMarket = "https://www.morphmarket.com/morphpedia/";
type ComboSpec = { id: string; species: string; name: string; aliases?: string[]; components: CombinationComponent[]; sourcePath: string; note: string };

function component(species: string, geneId: string, copies: 1 | 2 = 1): CombinationComponent {
  if (species === "Pantherophis guttatus") {
    if (geneId === "amel") return { locusId: "pantherophis-guttatus-amel-locus", alleleId: "amel", copies };
    if (geneId === "motley" || geneId === "stripe") return { locusId: "pantherophis-guttatus-pattern-locus", alleleId: geneId, copies };
  }
  return { locusId: `catalogue:${species}:${geneId}`, alleleId: geneId, copies };
}
function evidence(spec: ComboSpec): EvidenceRecord { return { sourceType: "specialist_database", claim: `${spec.name} is listed by MorphMarket as a named trait combination for ${spec.species}, built from the specified component traits.`, confidence: "moderate", source: `${morphMarket}${spec.sourcePath}`, note: spec.note }; }
function toCombination(spec: ComboSpec): CombinationDefinition { const record = evidence(spec); return { id: spec.id, species: spec.species, name: spec.name, aliases: spec.aliases, componentLocusIds: [...new Set(spec.components.map((item) => item.locusId))], components: spec.components, status: "recognised", evidence: [record] }; }
function toMorph(spec: ComboSpec): MasterMorphDefinition { return { geneId: spec.id, name: spec.name, aliases: spec.aliases ?? [], kind: "Combination", isGene: false, isCombination: true, category: "Recognised genetic combination", inheritance: "Unknown", hetPossible: false, verification: "Recognised", evidenceStatus: "documented", description: `Recognised ${spec.name} combination: ${spec.components.map((item) => `${item.alleleId}${item.copies === 2 ? " ×2" : ""}`).join(" + ")}.`, educationalNotes: `${spec.note} This name describes a phenotype/genetic combination and is not an independent locus.`, sourceUrl: `${morphMarket}${spec.sourcePath}`, sourceLabel: "MorphMarket Morphpedia", components: spec.components.map((item) => ({ morphId: item.alleleId, type: "Gene" as const, copies: item.copies })) }; }

const cornSnake: ComboSpec[] = [
  ["almond", "Almond", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "lavender")], "", "caramel", "MorphMarket lists Almond as Caramel + Lavender."],
  ["amaretto", "Amaretto", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic"), component("Pantherophis guttatus", "lavender")], "", "caramel", "MorphMarket lists Amaretto as Caramel + Hypo + Lavender."],
  ["amber", "Amber", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic")], "", "caramel", "MorphMarket lists Amber as Caramel + Hypo."],
  ["butter", "Butter", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "caramel")], "", "caramel", "MorphMarket lists Butter as Amelanistic + Caramel."],
  ["caramot", "Caramot", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "motley")], "", "caramel", "MorphMarket lists Caramot as Caramel + Motley."],
  ["caramel-shatter", "Caramel Shatter", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "cinder"), component("Pantherophis guttatus", "sunkissed")], "", "caramel", "MorphMarket lists Caramel Shatter as Caramel + Cinder + Sunkissed."],
  ["citrine", "Citrine", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic")], "", "caramel", "MorphMarket lists Citrine as Amelanistic + Anerythristic + Caramel + Hypo."],
  ["diamond", "Diamond", [component("Pantherophis guttatus", "charcoal"), component("Pantherophis guttatus", "lava")], "", "lava", "MorphMarket lists Diamond as Charcoal + Lava."],
  ["diffused-ice", "Diffused Ice", [component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "diffused"), component("Pantherophis guttatus", "lava")], "", "lava", "MorphMarket lists Diffused Ice as Anery + Diffused + Lava."],
  ["eclipse-stripe", "Eclipse Stripe", [component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "lavender"), component("Pantherophis guttatus", "stripe"), component("Pantherophis guttatus", "sunkissed")], "", "sunkissed", "MorphMarket lists Eclipse Stripe as Anery + Lavender + Stripe + Sunkissed."],
  ["etna", "Etna", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "diffused"), component("Pantherophis guttatus", "lava"), component("Pantherophis guttatus", "sunkissed")], "", "sunkissed", "MorphMarket lists Etna as Amelanistic + Diffused + Lava + Sunkissed."],
  ["honey", "Honey", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "sunkissed")], "", "sunkissed", "MorphMarket lists Honey as Caramel + Sunkissed."],
  ["hypo-ashy", "Hypo Ashy", [component("Pantherophis guttatus", "cinder"), component("Pantherophis guttatus", "hypomelanistic")], "", "cinder", "MorphMarket lists Hypo Ashy as Cinder + Hypo."],
  ["ice", "Ice", [component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "lava")], "Ice Ghost", "lava", "MorphMarket lists Ice and Ice Ghost as the same Anery + Lava genetic signature; Ice Ghost is retained as an alias, not a second genotype."],
  ["inferno", "Inferno", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "sunkissed")], "", "sunkissed", "MorphMarket lists Inferno as Amelanistic + Sunkissed."],
  ["lavalanche", "Lavalanche", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "diffused"), component("Pantherophis guttatus", "lava")], "", "lava", "MorphMarket lists Lavalanche as Amelanistic + Anery + Diffused + Lava."],
  ["lavamelanistic", "Lavamelanistic", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "lava")], "", "lava", "MorphMarket lists Lavamelanistic as Amelanistic + Lava."],
  ["lemon-stripe", "Lemon Stripe", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "hypomelanistic"), component("Pantherophis guttatus", "stripe"), component("Pantherophis guttatus", "sunkissed")], "", "sunkissed", "MorphMarket lists Lemon Stripe as Caramel + Hypo + Stripe + Sunkissed."],
  ["orchid", "Orchid", [component("Pantherophis guttatus", "lavender"), component("Pantherophis guttatus", "sunkissed")], "", "sunkissed", "MorphMarket lists Orchid as Lavender + Sunkissed."],
  ["peppermint", "Peppermint", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "cinder")], "", "cinder", "MorphMarket lists Peppermint as Amelanistic + Cinder."],
  ["saffron", "Saffron", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "sunkissed")], "", "caramel", "MorphMarket lists Saffron as Amelanistic + Caramel + Sunkissed."],
  ["sulfur", "Sulfur", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "diffused")], "", "caramel", "MorphMarket lists Sulfur as Amelanistic + Caramel + Diffused."],
  ["topaz", "Topaz", [component("Pantherophis guttatus", "caramel"), component("Pantherophis guttatus", "lava")], "", "lava", "MorphMarket lists Topaz as Caramel + Lava."],
  ["xanthic-snow", "Xanthic Snow", [component("Pantherophis guttatus", "amel"), component("Pantherophis guttatus", "anerythristic"), component("Pantherophis guttatus", "caramel")], "", "caramel", "MorphMarket lists Xanthic Snow as Amelanistic + Anery + Caramel."],
].map(([id, name, components, alias, source, note]) => ({ id, name, species: "Pantherophis guttatus", components, aliases: alias ? [alias] : undefined, sourcePath: `corn-snakes/${source}/`, note }));

const boaCombos: ComboSpec[] = [
  ["ghost", "Ghost", [component("Boa constrictor", "hypo"), component("Boa constrictor", "anery-type-1")], "", "anery-type-1", "MorphMarket lists Ghost as Hypo + Anery Type 1."],
  ["junglow", "Junglow", [component("Boa constrictor", "hypo"), component("Boa constrictor", "jungle"), component("Boa constrictor", "kahl-albino")], "", "kahl-albino", "MorphMarket lists Junglow as Hypo + Jungle + Kahl Albino."],
  ["moon-glow", "Moon Glow", [component("Boa constrictor", "hypo"), component("Boa constrictor", "kahl-albino"), component("Boa constrictor", "anery-type-1")], "Moonglow", "kahl-albino", "Moon Glow and Moonglow are the same recognised genetic signature; Moonglow is retained as an alias."],
  ["snow", "Snow", [component("Boa constrictor", "kahl-albino"), component("Boa constrictor", "anery-type-1")], "", "kahl-albino", "MorphMarket lists Snow as Kahl Albino + Anery Type 1."],
  ["sunglow", "Sunglow", [component("Boa constrictor", "hypo"), component("Boa constrictor", "kahl-albino")], "", "kahl-albino", "MorphMarket lists Sunglow as Hypo + Kahl Albino."],
].map(([id, name, components, alias, source, note]) => ({ id: `boa-constrictor-${id}`, name, species: "Boa constrictor", components, aliases: alias ? [alias] : undefined, sourcePath: `boa-constrictors/${source}/`, note }));

const burmese: ComboSpec[] = [
  { id: "python-bivittatus-pearl", species: "Python bivittatus", name: "Pearl", components: [component("Python bivittatus", "hypo"), component("Python bivittatus", "albino")], sourcePath: "albino/", note: "MorphMarket lists Pearl as Hypo + Albino." },
  { id: "python-bivittatus-blizzard", species: "Python bivittatus", name: "Blizzard", components: [component("Python bivittatus", "hypo", 2), component("Python bivittatus", "albino")], sourcePath: "albino/", note: "MorphMarket lists Blizzard as Super Hypo + Albino." },
];
const ballPython: ComboSpec[] = [
  { id: "python-regius-blizzard", species: "Python regius", name: "Blizzard", components: [component("Python regius", "black-pastel", 2), component("Python regius", "albino")], sourcePath: "albino/", note: "MorphMarket lists Blizzard as Super Black Pastel + Albino." },
  { id: "python-regius-cherry-bomb", species: "Python regius", name: "Cherry Bomb", components: [component("Python regius", "mojave", 2), component("Python regius", "albino")], sourcePath: "albino/", note: "MorphMarket lists Cherry Bomb as Super Mojave + Albino." },
  { id: "python-regius-sunglow", species: "Python regius", name: "Sunglow", components: [component("Python regius", "albino"), component("Python regius", "ghost")], sourcePath: "albino/", note: "MorphMarket lists Sunglow as Albino + Ghost." },
  { id: "python-regius-whiplash", species: "Python regius", name: "Whiplash", components: [component("Python regius", "jolt"), component("Python regius", "black-pastel")], sourcePath: "jolt/", note: "MorphMarket's Jolt article identifies Whiplash as Jolt bred into Black Pastel." },
];
const carpet: ComboSpec[] = [{ id: "morelia-spilota-snow", species: "Morelia spilota", name: "Snow", components: [component("Morelia spilota", "albino"), component("Morelia spilota", "axanthic")], sourcePath: "albino/", note: "MorphMarket lists Snow as Albino + Axanthic." }];
const sandBoa = (species: string): ComboSpec[] => [
  { id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-anery-splash`, species, name: "Anery Splash", components: [component(species, "anerythristic"), component(species, "splash")], sourcePath: "anery/", note: "MorphMarket lists Anery Splash as Anery + Splash." },
  { id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ghost`, species, name: "Ghost", components: [component(species, "anerythristic"), component(species, "hypomelanistic")], sourcePath: "anery/", note: "MorphMarket lists Ghost as Anery + Hypo." },
  { id: `${species.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-snow`, species, name: "Snow", components: [component(species, "albino"), component(species, "anerythristic")], sourcePath: "anery/", note: "MorphMarket lists Snow as Albino + Anery." },
];
const retic: ComboSpec[] = [
  { id: "malayopython-reticulatus-snow", species: "Malayopython reticulatus", name: "Snow", components: [component("Malayopython reticulatus", "albino"), component("Malayopython reticulatus", "anery")], sourcePath: "albino/", note: "MorphMarket lists Snow as Albino + Anery." },
  { id: "malayopython-reticulatus-sun-tiger", species: "Malayopython reticulatus", name: "Sun Tiger", components: [component("Malayopython reticulatus", "sunfire"), component("Malayopython reticulatus", "tiger")], sourcePath: "sunfire/", note: "MorphMarket documents Sun Tiger as Sunfire + Tiger." },
  { id: "malayopython-reticulatus-albino-super-sun", species: "Malayopython reticulatus", name: "Albino Super Sun", components: [component("Malayopython reticulatus", "sunfire", 2), component("Malayopython reticulatus", "albino")], sourcePath: "albino/", note: "MorphMarket documents Albino Super Sun as Super Sunfire + Albino." },
];
const kingsnake: ComboSpec[] = [
  { id: "lampropeltis-californiae-flamethrower", species: "Lampropeltis californiae", name: "Flamethrower", components: [component("Lampropeltis californiae", "erythristic"), component("Lampropeltis californiae", "hypo")], sourcePath: "hypo/", note: "MorphMarket lists Flamethrower as Erythristic + Hypo." },
  { id: "lampropeltis-californiae-hybino", species: "Lampropeltis californiae", name: "Hybino", components: [component("Lampropeltis californiae", "hypo"), component("Lampropeltis californiae", "lavender-albino")], sourcePath: "lavender-albino/", note: "MorphMarket lists Hybino as Hypo + Lavender Albino." },
  { id: "lampropeltis-californiae-true-hybino", species: "Lampropeltis californiae", name: "True Hybino", components: [component("Lampropeltis californiae", "amelanistic"), component("Lampropeltis californiae", "hypo")], sourcePath: "amelanistic/", note: "MorphMarket lists True Hybino as Amelanistic + Hypo." },
  { id: "lampropeltis-californiae-true-snow", species: "Lampropeltis californiae", name: "True Snow", components: [component("Lampropeltis californiae", "amelanistic"), component("Lampropeltis californiae", "anerythristic")], sourcePath: "amelanistic/", note: "MorphMarket lists True Snow as Amelanistic + Anerythristic." },
  { id: "lampropeltis-californiae-anery-snow", species: "Lampropeltis californiae", name: "Anery Snow", components: [component("Lampropeltis californiae", "anerythristic"), component("Lampropeltis californiae", "lavender-albino")], sourcePath: "lavender-albino/", note: "MorphMarket lists Anery Snow as Anerythristic + Lavender Albino." },
  { id: "lampropeltis-californiae-double-albino", species: "Lampropeltis californiae", name: "Double Albino", components: [component("Lampropeltis californiae", "amelanistic"), component("Lampropeltis californiae", "lavender-albino")], sourcePath: "lavender-albino/", note: "MorphMarket lists Double Albino as Amelanistic + Lavender Albino." },
];

const allSpecs: ComboSpec[] = [...cornSnake, ...boaCombos, ...burmese, ...ballPython, ...carpet, ...sandBoa("Eryx colubrinus"), ...sandBoa("Gongylophis colubrinus"), ...retic, ...kingsnake];
export const SPECIES_GENETICS_COMBINATIONS: CombinationDefinition[] = allSpecs.map(toCombination);
export const SPECIES_GENETICS_COMBINATION_MORPHS: MasterMorphDefinition[] = allSpecs.map(toMorph);
export const SPECIES_GENETICS_COMBINATION_SPECS = allSpecs;

export type CombinationBacklogEntry = { species: string; name: string; requiredTraits: string[]; reason: string; source: string };
export const SPECIES_GENETICS_COMBINATION_BACKLOG: CombinationBacklogEntry[] = [
  { species: "Pantherophis guttatus", name: "Blaze", requiredTraits: ["Toffee", "Amel", "Sunkissed"], reason: "Toffee is not yet a reviewed Corn Snake locus.", source: "MorphMarket Corn Snake Sunkissed combinations" },
  { species: "Pantherophis guttatus", name: "Hazel", requiredTraits: ["Toffee", "Sunkissed"], reason: "Toffee is not yet modelled.", source: "MorphMarket Corn Snake Sunkissed combinations" },
  { species: "Pantherophis guttatus", name: "Solar", requiredTraits: ["Sunkissed", "Sunrise"], reason: "Sunrise is not yet modelled.", source: "MorphMarket Corn Snake Sunkissed combinations" },
  { species: "Pantherophis guttatus", name: "Persimmon", requiredTraits: ["Kastanie", "Lava"], reason: "Kastanie is not yet modelled.", source: "MorphMarket Corn Snake Lava combinations" },
  { species: "Boa constrictor", name: "Avalanche", requiredTraits: ["Arabesque", "Kahl Albino", "Anery Type 1"], reason: "Arabesque is not yet modelled.", source: "MorphMarket Kahl Albino combinations" },
  { species: "Boa constrictor", name: "Red Dragon", requiredTraits: ["Blood", "Kahl Albino"], reason: "Blood is not yet modelled.", source: "MorphMarket Kahl Albino combinations" },
  { species: "Boa constrictor", name: "Sun Dragon", requiredTraits: ["Hypo", "Blood", "Kahl Albino"], reason: "Blood is not yet modelled.", source: "MorphMarket Kahl Albino combinations" },
  { species: "Boa imperator", name: "Junglow / Moon Glow / Snow / Sunglow", requiredTraits: ["species-specific B. imperator documentation"], reason: "These exact named combinations were verified on B. constrictor Morphpedia pages; they are not being cross-applied to B. imperator without species-specific evidence.", source: "MorphMarket Boa Constrictor combination pages" },
  { species: "Morelia spilota", name: "Sun Glow", requiredTraits: ["Caramel", "Albino"], reason: "Caramel is not yet modelled for Carpet Python.", source: "MorphMarket Carpet Python Albino combinations" },
  { species: "Eryx colubrinus", name: "Snow Paradox", requiredTraits: ["Paradox Albino", "Anery"], reason: "Paradox Albino requires a separate resolved phenotype/locus model.", source: "MorphMarket Sand Boa Anery combinations" },
  { species: "Gongylophis colubrinus", name: "Snow Paradox", requiredTraits: ["Paradox Albino", "Anery"], reason: "Paradox Albino requires a separate resolved phenotype/locus model.", source: "MorphMarket Sand Boa Anery combinations" },
  { species: "Eryx colubrinus", name: "Nuclear Meltdown", requiredTraits: ["Nuclear", "Dodoma"], reason: "Line-bred components require a separate line-bred model.", source: "MorphMarket Sand Boa trait list" },
  { species: "Eryx colubrinus", name: "Picasso", requiredTraits: ["Paint", "Splash"], reason: "Not enough reviewed evidence/lineage semantics are currently modelled to promote this named combo.", source: "MorphMarket Sand Boa trait list" },
  { species: "Epicrates cenchria", name: "Ghost", requiredTraits: ["Hypo (Lockwood)", "Anery (Seib)"], reason: "Both components are line-specific and must not be collapsed into generic Hypo/Anery.", source: "MorphMarket Rainbow Boa line-specific combinations" },
  { species: "Malayopython reticulatus", name: "Ruby Eyed Ivory", requiredTraits: ["Super Platinum", "Albino"], reason: "The current Platinum model lacks the required super-form semantics.", source: "MorphMarket Reticulated Python combinations" },
  { species: "Lampropeltis californiae", name: "Alabaster", requiredTraits: ["Axanthic", "Hypo", "Peanut Butter"], reason: "Axanthic is not yet modelled for California Kingsnake.", source: "MorphMarket California Kingsnake combinations" },
  { species: "Lampropeltis californiae", name: "Albescent", requiredTraits: ["Amelanistic", "Axanthic", "Hypo"], reason: "Axanthic is not yet modelled.", source: "MorphMarket California Kingsnake combinations" },
  { species: "Lampropeltis californiae", name: "Goblin", requiredTraits: ["Axanthic", "Leucistic"], reason: "Axanthic is not yet modelled.", source: "MorphMarket California Kingsnake combinations" },
  { species: "Python regius", name: "Snow (VPI)", requiredTraits: ["Axanthic (VPI)", "Albino"], reason: "The current Axanthic record is not line-specific VPI.", source: "MorphMarket VPI Axanthic combinations" },
  { species: "Python regius", name: "Lavender Snow", requiredTraits: ["Axanthic (VPI)", "Lavender Albino"], reason: "Requires line-specific VPI Axanthic.", source: "MorphMarket VPI Axanthic combinations" },
  { species: "Python regius", name: "True Ghost", requiredTraits: ["Axanthic (VPI)", "Ghost"], reason: "Requires line-specific VPI Axanthic.", source: "MorphMarket VPI Axanthic combinations" },
  { species: "Python regius", name: "Zebra Bee", requiredTraits: ["Pastel", "Spider", "Axanthic (VPI)"], reason: "Requires line-specific VPI Axanthic.", source: "MorphMarket VPI Axanthic combinations" },
  { species: "Python regius", name: "Polar Ball", requiredTraits: ["Super Russo", "Albino"], reason: "Russo is not currently modelled.", source: "MorphMarket Ball Python Albino combinations" },
  { species: "Python regius", name: "Yellow Snow", requiredTraits: ["Red Axanthic", "Albino"], reason: "Red Axanthic is not currently modelled.", source: "MorphMarket Ball Python Albino combinations" },
  { species: "Python curtus", name: "007", requiredTraits: ["Golden Eye", "Matrix"], reason: "Golden Eye and Matrix are not currently modelled.", source: "MorphMarket Blood/Short-tailed Python combinations" },
  { species: "Python curtus", name: "Pixel", requiredTraits: ["Batik", "Golden Eye"], reason: "Batik and Golden Eye are not currently modelled.", source: "MorphMarket Blood/Short-tailed Python combinations" },
  { species: "Python curtus", name: "Batrix", requiredTraits: ["Batik", "Matrix"], reason: "Batik and Matrix are not currently modelled.", source: "MorphMarket Blood/Short-tailed Python combinations" },
  { species: "Python curtus", name: "White Lightning", requiredTraits: ["Batik", "Ivory"], reason: "Batik and Ivory are not currently modelled.", source: "MorphMarket Blood/Short-tailed Python combinations" },
  { species: "Heterodon nasicus", name: "Electric", requiredTraits: ["Pink Pastel Albino", "Albino"], reason: "Electric is documented as a double visual combination, but the authoritative Hognose calculator currently lacks a resolved Pink Pastel Albino locus.", source: "MorphMarket Hognose Albino + Pink Pastel Albino genetics review" },
  { species: "Heterodon nasicus", name: "Coral", requiredTraits: ["Albino", "Lavender"], reason: "Albino/Lavender are not yet part of the authoritative Hognose locus model.", source: "MorphMarket Hognose Albino combinations" },
  { species: "Heterodon nasicus", name: "Hybino", requiredTraits: ["Albino", "Evans Hypo"], reason: "Evans Hypo is not yet part of the authoritative Hognose locus model.", source: "MorphMarket Hognose Albino combinations" },
  { species: "Heterodon nasicus", name: "Smolder", requiredTraits: ["Albino", "Smoke Hypo"], reason: "Smoke Hypo is not yet part of the authoritative Hognose locus model.", source: "MorphMarket Hognose Albino combinations" },
  { species: "Heterodon nasicus", name: "Toffee Glow", requiredTraits: ["Albino", "Toffee Belly"], reason: "Toffee Belly is not yet part of the authoritative Hognose locus model.", source: "MorphMarket Hognose Albino combinations" },
  { species: "Heterodon nasicus", name: "True Sunglow", requiredTraits: ["Albino", "True Hypo"], reason: "True Hypo is not yet part of the authoritative Hognose locus model.", source: "MorphMarket Hognose Albino combinations" },
  { species: "Heterodon nasicus", name: "Super Yeti", requiredTraits: ["Albino", "Axanthic", "Super Conda"], reason: "The current authoritative Hognose loci do not yet model the full component set required for Super Yeti.", source: "MorphMarket Hognose community documentation" },
];
