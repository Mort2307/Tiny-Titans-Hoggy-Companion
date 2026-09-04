import { getMasterCalculatorMorphs, getMasterHetGenes, getMasterVisualMorphs, type MasterMorphDefinition } from "../masterMorphDatabase";

/**
 * Genetics is intentionally mapped separately from taxonomy.
 * A species may exist in the master species registry while its genetics
 * catalogue is still awaiting species-specific evidence and review.
 */
export const SPECIES_WITH_MAPPED_GENETICS = new Set<string>(["heterodon-nasicus"]);

export function isSpeciesGeneticsMapped(speciesId: string | null | undefined): boolean {
  return Boolean(speciesId && SPECIES_WITH_MAPPED_GENETICS.has(speciesId));
}

export function getSpeciesVisualMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  return isSpeciesGeneticsMapped(speciesId) ? getMasterVisualMorphs() : [];
}

export function getSpeciesHetGenes(speciesId: string | null | undefined): MasterMorphDefinition[] {
  return isSpeciesGeneticsMapped(speciesId) ? getMasterHetGenes() : [];
}

export function getSpeciesCalculatorMorphs(speciesId: string | null | undefined): MasterMorphDefinition[] {
  return isSpeciesGeneticsMapped(speciesId) ? getMasterCalculatorMorphs() : [];
}

export function getSpeciesGeneticsStatus(speciesId: string | null | undefined): "mapped" | "not-mapped" {
  return isSpeciesGeneticsMapped(speciesId) ? "mapped" : "not-mapped";
}
