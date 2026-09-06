import type { MasterMorphDefinition } from "../masterMorphDatabase";
import { getMasterVisualMorphs } from "../masterMorphDatabase";
import { INITIAL_SNAKE_SPECIES } from "./speciesRegistry";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import { SPECIES_GENETICS_EXPANSION_BATCH_1 } from "./speciesGeneticsExpansionBatch1";

export type SpeciesGeneticsCoverageStatus = "mapped" | "partial" | "baseline-only";

export type SpeciesGeneticsCoverage = {
  speciesId: string;
  scientificName: string;
  commonName: string;
  status: SpeciesGeneticsCoverageStatus;
  traitCount: number;
  mendelianTraitCount: number;
  confirmedMendelianTraitCount: number;
  calculatorEligibleTraitCount: number;
  nonMendelianTraitCount: number;
  sourceBackedTraitCount: number;
  scientificSourceBackedTraitCount: number;
};

const MENDELIAN = new Set(["Recessive", "Incomplete Dominant", "Dominant"]);

function composeCatalogue(speciesName: string): MasterMorphDefinition[] {
  const base = SPECIES_GENETICS_CATALOGUES[speciesName] ?? [];
  const expansion = SPECIES_GENETICS_EXPANSION_BATCH_1[speciesName] ?? [];
  return [
    ...base,
    ...expansion.filter((trait) => !base.some((entry) => entry.geneId === trait.geneId || entry.name.trim().toLowerCase() === trait.name.trim().toLowerCase())),
  ];
}

function catalogueForSpecies(speciesId: string): MasterMorphDefinition[] {
  if (speciesId === "heterodon-nasicus") return getMasterVisualMorphs();
  const species = INITIAL_SNAKE_SPECIES.find((entry) => entry.id === speciesId);
  return species ? composeCatalogue(species.acceptedScientificName) : [];
}

function hasScientificSource(entry: MasterMorphDefinition): boolean {
  return (entry.sourceLinks ?? []).some((source) => source.type === "scientific-literature");
}

export function getSpeciesGeneticsCoverage(speciesId: string): SpeciesGeneticsCoverage | undefined {
  const species = INITIAL_SNAKE_SPECIES.find((entry) => entry.id === speciesId);
  if (!species) return undefined;

  const catalogue = catalogueForSpecies(speciesId);
  const mendelianTraitCount = catalogue.filter((entry) => MENDELIAN.has(entry.inheritance) && entry.isGene === true && entry.kind === "Gene").length;
  const confirmedMendelianTraitCount = catalogue.filter((entry) =>
    MENDELIAN.has(entry.inheritance) &&
    entry.isGene === true &&
    entry.kind === "Gene" &&
    entry.evidenceStatus === "confirmed" &&
    entry.verification === "Confirmed",
  ).length;
  const calculatorEligibleTraitCount = catalogue.filter((entry) =>
    entry.isGene === true &&
    entry.kind === "Gene" &&
    MENDELIAN.has(entry.inheritance) &&
    entry.evidenceStatus === "confirmed" &&
    entry.verification === "Confirmed",
  ).length;
  const nonMendelianTraitCount = catalogue.length - mendelianTraitCount;
  const sourceBackedTraitCount = catalogue.filter((entry) => Boolean(entry.sourceUrl || entry.sourceLinks?.length)).length;
  const scientificSourceBackedTraitCount = catalogue.filter(hasScientificSource).length;
  const mapped = speciesId === "heterodon-nasicus";

  return {
    speciesId: species.id,
    scientificName: species.acceptedScientificName,
    commonName: species.commonNames[0] ?? species.acceptedScientificName,
    status: mapped ? "mapped" : catalogue.length === 0 ? "baseline-only" : "partial",
    traitCount: catalogue.length,
    mendelianTraitCount,
    confirmedMendelianTraitCount,
    calculatorEligibleTraitCount,
    nonMendelianTraitCount,
    sourceBackedTraitCount,
    scientificSourceBackedTraitCount,
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
    mendelianTraitCount: coverage.reduce((sum, entry) => sum + entry.mendelianTraitCount, 0),
    confirmedMendelianTraitCount: coverage.reduce((sum, entry) => sum + entry.confirmedMendelianTraitCount, 0),
    calculatorEligibleTraitCount: coverage.reduce((sum, entry) => sum + entry.calculatorEligibleTraitCount, 0),
    sourceBackedTraitCount: coverage.reduce((sum, entry) => sum + entry.sourceBackedTraitCount, 0),
    scientificSourceBackedTraitCount: coverage.reduce((sum, entry) => sum + entry.scientificSourceBackedTraitCount, 0),
  };
}
