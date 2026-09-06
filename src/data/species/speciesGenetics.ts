import {
  getMasterCalculatorMorphs,
  getMasterHetGenes,
  getMasterVisualMorphs,
  type MasterMorphDefinition,
} from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { SPECIES_GENETICS_CATALOGUES_EXPANDED } from "./speciesGeneticsCataloguesExpanded";
import { getSpeciesGeneticsCoverage, getSpeciesGeneticsCoverageSummary } from "./speciesGeneticsCoverage";

type SpeciesRecord = (typeof INITIAL_SNAKE_SPECIES)[number];
export type SpeciesGeneticsStatus = "mapped" | "partial" | "baseline-only";

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

const SPECIES_CATALOGUES: Record<string, MasterMorphDefinition[]> = SPECIES_GENETICS_CATALOGUES_EXPANDED;

function getSpeciesRecord(speciesId: string | null | undefined): SpeciesRecord | undefined {
  return speciesId ? INITIAL_SNAKE_SPECIES.find((species) => species.id === speciesId) : undefined;
}

function isHognose(speciesId: string | null | undefined): boolean {
  return speciesId === "heterodon-nasicus";
}

function getCatalogue(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  return species ? SPECIES_CATALOGUES[species.acceptedScientificName] ?? [] : [];
}

export function getSpeciesVisualMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterVisualMorphs();
  const species = getSpeciesRecord(speciesId);
  if (!species) return [];
  const mapped = SPECIES_CATALOGUES[species.acceptedScientificName] ?? [];
  const name = species.commonNames[0] ?? species.acceptedScientificName;
  return [normalTrait(name), ...mapped];
}

export function getSpeciesHetGenes(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterHetGenes();
  return getCatalogue(speciesId).filter((morph) => morph.isGene && morph.hetPossible === true);
}

export function getSpeciesCalculatorMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  if (isHognose(speciesId)) return getMasterCalculatorMorphs();
  return getCatalogue(speciesId).filter((morph) => morph.isGene && ["Recessive", "Incomplete Dominant", "Dominant"].includes(morph.inheritance));
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): SpeciesGeneticsStatus {
  if (!speciesId) return "baseline-only";
  if (isHognose(speciesId)) return "mapped";
  const coverage = getSpeciesGeneticsCoverage(speciesId);
  return coverage?.traitCount ? "partial" : "baseline-only";
}

export { getSpeciesGeneticsCoverage, getSpeciesGeneticsCoverageSummary };

export function isSpeciesGeneticsMapped(speciesId: string | null | undefined): boolean {
  return getSpeciesGeneticsStatus(speciesId) !== "baseline-only";
}
