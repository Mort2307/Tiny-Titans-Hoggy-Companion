import type { MasterMorphDefinition } from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistryBase";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";

export type SpeciesGeneticsCoverageStatus = "mapped" | "partial" | "baseline-only";

export type SpeciesGeneticsCoverage = {
  speciesId: string;
  scientificName: string;
  commonName: string;
  status: SpeciesGeneticsCoverageStatus;
  traitCount: number;
  mendelianTraitCount: number;
  nonMendelianTraitCount: number;
  sourceBackedTraitCount: number;
};

const MENDELIAN = new Set(["Recessive", "Incomplete Dominant", "Dominant"]);

function catalogueFor(scientificName: string): MasterMorphDefinition[] {
  return SPECIES_GENETICS_CATALOGUES[scientificName] ?? [];
}

export function getSpeciesGeneticsCoverage(speciesId: string): SpeciesGeneticsCoverage | undefined {
  const species = INITIAL_SNAKE_SPECIES.find((entry) => entry.id === speciesId);
  if (!species) return undefined;

  const catalogue = catalogueFor(species.acceptedScientificName);
  const mendelianTraitCount = catalogue.filter((entry) => MENDELIAN.has(entry.inheritance)).length;
  const nonMendelianTraitCount = catalogue.length - mendelianTraitCount;
  const sourceBackedTraitCount = catalogue.filter((entry) => Boolean(entry.sourceUrl)).length;

  return {
    speciesId: species.id,
    scientificName: species.acceptedScientificName,
    commonName: species.commonNames[0] ?? species.acceptedScientificName,
    status: catalogue.length === 0 ? "baseline-only" : "partial",
    traitCount: catalogue.length,
    mendelianTraitCount,
    nonMendelianTraitCount,
    sourceBackedTraitCount,
  };
}

export function getAllSpeciesGeneticsCoverage(): SpeciesGeneticsCoverage[] {
  return INITIAL_SNAKE_SPECIES.map((species) => getSpeciesGeneticsCoverage(species.id)).filter(
    (entry): entry is SpeciesGeneticsCoverage => Boolean(entry),
  );
}

export function getSpeciesGeneticsCoverageSummary() {
  const coverage = getAllSpeciesGeneticsCoverage();
  return {
    speciesCount: coverage.length,
    mappedCount: coverage.filter((entry) => entry.status === "mapped").length,
    partialCount: coverage.filter((entry) => entry.status === "partial").length,
    baselineOnlyCount: coverage.filter((entry) => entry.status === "baseline-only").length,
    traitCount: coverage.reduce((sum, entry) => sum + entry.traitCount, 0),
    sourceBackedTraitCount: coverage.reduce((sum, entry) => sum + entry.sourceBackedTraitCount, 0),
  };
}
