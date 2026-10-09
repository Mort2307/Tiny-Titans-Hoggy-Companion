import {
  getMasterCalculatorMorphs,
  getMasterVisualMorphs,
  type MasterMorphDefinition,
} from "../masterMorphDatabase";
import { UNIVERSAL_SPECIES_BY_ID } from "./universalSpeciesRegistry";
import type { UniversalSpeciesRecord } from "./universalSpeciesTypes";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import { SPECIES_GENETICS_COMBINATION_MORPHS, SPECIES_GENETICS_COMBINATION_SPECS } from "./speciesGeneticsCombinations";
import { SPECIES_GENETICS_RESEARCH_ADDITIONS } from "./speciesGeneticsResearchAdditions";
import { SPECIES_GENETICS_EXPANSION_BATCH_2 } from "./speciesGeneticsExpansionBatch2";
import { SPECIES_GENETICS_EXPANSION_BATCH_3 } from "./speciesGeneticsExpansionBatch3";

type SpeciesRecord = UniversalSpeciesRecord;
export type SpeciesGeneticsStatus = "mapped" | "partial" | "baseline-only";
export type SpeciesVariationLibraryStatus = "catalogued" | "reviewed-no-established-variants" | "research-required";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const normalTrait = (speciesName: string): MasterMorphDefinition => ({
  geneId: "normal",
  name: "Wild Type / Unclassified",
  aliases: ["Normal", "Wild Type", "Wildtype", "Wild", "Unclassified"],
  kind: "Gene",
  isGene: false,
  category: "Baseline phenotype",
  inheritance: "Unknown",
  hetPossible: false,
  verification: "Recognised",
  description: `Baseline wild-type / unclassified phenotype reference for ${speciesName}. Community photographs may document unusual colour, pattern or morphology for later expert review; this entry does not imply a genetic morph.`,
  educationalNotes: "Baseline reference only. A visible difference is not automatically a genetic morph. Community submissions can document unusual animals for Creator review and future evidence gathering.",
});

const BALL_PYTHON_SOURCE = "https://www.morphmarket.com/all/c/reptiles/pythons/ball-pythons";
const ballPythonTrait = (name: string, inheritance: MasterMorphDefinition["inheritance"], aliases: string[] = []): MasterMorphDefinition => ({
  geneId: normalise(name).replace(/[^a-z0-9]+/g, "-"),
  name,
  aliases,
  kind: "Gene",
  isGene: true,
  category: "Species gene",
  inheritance,
  hetPossible: inheritance === "Recessive",
  verification: "Recognised",
  description: `Recognised ${name} trait for Python regius.`,
  educationalNotes: "Species-scoped catalogue entry. Confirm individual lineage and documentation before treating a genetic claim as proven.",
  sourceUrl: BALL_PYTHON_SOURCE,
  sourceLabel: "MorphMarket Ball Python trait index",
});

const BALL_PYTHON_TRAITS: MasterMorphDefinition[] = [
  ballPythonTrait("Albino", "Recessive", ["Amelanistic", "Amel"]),
  ballPythonTrait("Axanthic", "Recessive", ["Anery"]),
  ballPythonTrait("Clown", "Recessive"),
  ballPythonTrait("Desert Ghost", "Recessive", ["DG"]),
  ballPythonTrait("Ghost", "Recessive", ["Hypo"]),
  ballPythonTrait("Genetic Stripe", "Recessive", ["G Stripe"]),
  ballPythonTrait("Lavender Albino", "Recessive", ["Lavender", "Lav Albino"]),
  ballPythonTrait("Piebald", "Recessive", ["Pied"]),
  ballPythonTrait("Puzzle", "Recessive"),
  ballPythonTrait("Tri-Stripe", "Recessive", ["Tristripe", "Tri Stripe"]),
  ballPythonTrait("Ultramel", "Recessive"),
  ballPythonTrait("Enhancer", "Recessive"),
  ballPythonTrait("Axanthic (MJ)", "Recessive", ["Markus Jayne Axanthic"]),
  ballPythonTrait("Banana", "Incomplete Dominant", ["Coral Glow"]),
  ballPythonTrait("Bamboo", "Incomplete Dominant"),
  ballPythonTrait("Black Pastel", "Incomplete Dominant"),
  ballPythonTrait("Butter", "Incomplete Dominant"),
  ballPythonTrait("Cinnamon", "Incomplete Dominant"),
  ballPythonTrait("Fire", "Incomplete Dominant"),
  ballPythonTrait("Lesser", "Incomplete Dominant"),
  ballPythonTrait("Mojave", "Incomplete Dominant"),
  ballPythonTrait("Mystic", "Incomplete Dominant"),
  ballPythonTrait("Orange Dream", "Incomplete Dominant", ["OD"]),
  ballPythonTrait("Pastel", "Incomplete Dominant"),
  ballPythonTrait("Phantom", "Incomplete Dominant"),
  ballPythonTrait("Enchi", "Incomplete Dominant"),
  ballPythonTrait("GHI", "Incomplete Dominant"),
  ballPythonTrait("Mahogany", "Incomplete Dominant"),
  ballPythonTrait("Red Stripe", "Incomplete Dominant"),
  ballPythonTrait("Yellow Belly", "Incomplete Dominant"),
  ballPythonTrait("Champagne", "Incomplete Dominant"),
  ballPythonTrait("Cypress", "Incomplete Dominant"),
  ballPythonTrait("Gravel", "Incomplete Dominant"),
  ballPythonTrait("Huffman", "Incomplete Dominant"),
  ballPythonTrait("Leopard", "Incomplete Dominant"),
  ballPythonTrait("Lori", "Incomplete Dominant"),
  ballPythonTrait("Special", "Incomplete Dominant"),
  ballPythonTrait("Jolt", "Incomplete Dominant"),
  ballPythonTrait("Raven", "Incomplete Dominant"),
  ballPythonTrait("Honey", "Incomplete Dominant"),
  ballPythonTrait("Scaleless Head", "Incomplete Dominant"),
  ballPythonTrait("Pinstripe", "Dominant"),
  ballPythonTrait("Spider", "Dominant"),
  ballPythonTrait("Spotnose", "Dominant"),
  ballPythonTrait("Ashen", "Dominant"),
  ballPythonTrait("Citron", "Incomplete Dominant"),
];

const BASE_SPECIES_CATALOGUES: Record<string, MasterMorphDefinition[]> = {
  ...SPECIES_GENETICS_CATALOGUES,
  "Python regius": BALL_PYTHON_TRAITS,
};

const CATALOGUE_LAYERS: Array<Record<string, MasterMorphDefinition[]>> = [
  BASE_SPECIES_CATALOGUES,
  SPECIES_GENETICS_EXPANSION_BATCH_2,
  SPECIES_GENETICS_EXPANSION_BATCH_3,
  SPECIES_GENETICS_RESEARCH_ADDITIONS,
];

function mergeSpeciesTraits(speciesName: string): MasterMorphDefinition[] {
  const byId = new Map<string, MasterMorphDefinition>();
  for (const layer of CATALOGUE_LAYERS) {
    for (const morph of layer[speciesName] ?? []) byId.set(morph.geneId, morph);
  }
  return [...byId.values()];
}

const SPECIES_CATALOGUES: Record<string, MasterMorphDefinition[]> = Object.fromEntries(
  [...new Set(CATALOGUE_LAYERS.flatMap((layer) => Object.keys(layer)))]
    .map((speciesName) => [speciesName, mergeSpeciesTraits(speciesName)]),
);

function getSpeciesRecord(speciesId: string | null | undefined): SpeciesRecord | undefined {
  return speciesId ? UNIVERSAL_SPECIES_BY_ID[speciesId] : undefined;
}
function isHognose(speciesId: string | null | undefined): boolean { return speciesId === "heterodon-nasicus"; }
function getCatalogue(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  return species ? SPECIES_CATALOGUES[species.acceptedScientificName] ?? [] : [];
}

export function getSpeciesCombinationMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const comboIds = new Set(SPECIES_GENETICS_COMBINATION_SPECS.filter((spec) => spec.species === species.acceptedScientificName).map((spec) => spec.id));
  return SPECIES_GENETICS_COMBINATION_MORPHS.filter((morph) => comboIds.has(morph.geneId));
}

export function getSpeciesVisualMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const mapped = getCatalogue(speciesId);
  const name = species.commonNames[0] ?? species.acceptedScientificName;
  return [normalTrait(name), ...mapped, ...getSpeciesCombinationMorphs(speciesId)];
}

export function getSpeciesHetGenes(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs().filter((morph) => morph.isGene && morph.kind === "Gene" && morph.hetPossible === true);
  return getCatalogue(speciesId).filter((morph) => morph.isGene && morph.hetPossible === true);
}

export function getSpeciesCalculatorMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterCalculatorMorphs();
  return getCatalogue(speciesId).filter((morph) => morph.isGene && ["Recessive", "Incomplete Dominant", "Dominant"].includes(morph.inheritance));
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): SpeciesGeneticsStatus {
  if (!speciesId) return "baseline-only";
  if (isHognose(speciesId)) return "mapped";
  const species = getSpeciesRecord(speciesId);
  if (!species) return "baseline-only";
  if (Object.prototype.hasOwnProperty.call(SPECIES_CATALOGUES, species.acceptedScientificName)) return "mapped";
  return "baseline-only";
}

const EXHAUSTIVELY_REVIEWED_VARIATION_LIBRARIES = new Set<string>([
  "heterodon-nasicus",
]);

const REVIEWED_NO_ESTABLISHED_VARIANTS = new Set<string>([]);

export function getSpeciesVariationLibraryStatus(speciesId: string | null | undefined): SpeciesVariationLibraryStatus {
  if (!speciesId) return "research-required";
  if (EXHAUSTIVELY_REVIEWED_VARIATION_LIBRARIES.has(speciesId)) return "catalogued";
  if (REVIEWED_NO_ESTABLISHED_VARIANTS.has(speciesId)) return "reviewed-no-established-variants";
  return getSpeciesRecord(speciesId) ? "research-required" : "research-required";
}

export function getSpeciesVariationLibraryCoverage(speciesId: string | null | undefined) {
  const species = getSpeciesRecord(speciesId);
  const entries = getSpeciesVisualMorphs(speciesId);
  const status = getSpeciesVariationLibraryStatus(speciesId);
  return {
    speciesId: species?.id ?? speciesId ?? "",
    scientificName: species?.acceptedScientificName ?? "",
    status,
    entryCount: entries.length,
    documentedVariationCount: Math.max(0, entries.length - 1),
    imagePolicy: "community-submissions-only" as const,
    exhaustiveReviewRequired: status === "research-required",
  };
}

export function isSpeciesGeneticsMapped(speciesId: string | null | undefined): boolean {
  return getSpeciesGeneticsStatus(speciesId) !== "baseline-only";
}
