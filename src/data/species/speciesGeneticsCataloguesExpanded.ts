import type { MasterMorphDefinition } from "../masterMorphDatabase";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import { SPECIES_GENETICS_EXPANSION_BATCH_1 } from "./speciesGeneticsExpansionBatch1";

/**
 * Single species-genetics read model. Individual evidence batches stay isolated
 * so they can be reviewed and expanded without duplicating the base catalogue.
 */
export const SPECIES_GENETICS_CATALOGUES_EXPANDED: Record<string, MasterMorphDefinition[]> = Object.entries({
  ...SPECIES_GENETICS_CATALOGUES,
  ...SPECIES_GENETICS_EXPANSION_BATCH_1,
}).reduce<Record<string, MasterMorphDefinition[]>>((result, [speciesName, traits]) => {
  const existing = SPECIES_GENETICS_CATALOGUES[speciesName] ?? [];
  result[speciesName] = [
    ...existing,
    ...traits.filter((trait) => !existing.some((entry) => entry.geneId === trait.geneId || entry.name.toLowerCase() === trait.name.toLowerCase())),
  ];
  return result;
}, {});
