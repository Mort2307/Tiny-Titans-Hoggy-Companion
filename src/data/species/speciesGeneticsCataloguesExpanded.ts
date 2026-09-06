import type { MasterMorphDefinition } from "../masterMorphDatabase";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import { SPECIES_GENETICS_EXPANSION_BATCH_1 } from "./speciesGeneticsExpansionBatch1";
import { SPECIES_GENETICS_EXPANSION_BATCH_3 } from "./speciesGeneticsExpansionBatch3";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function mergeTraits(base: MasterMorphDefinition[], ...expansions: MasterMorphDefinition[][]): MasterMorphDefinition[] {
  const output = [...base];
  for (const batch of expansions) {
    for (const trait of batch) {
      const index = output.findIndex((entry) =>
        normalise(entry.geneId) === normalise(trait.geneId) || normalise(entry.name) === normalise(trait.name),
      );
      if (index >= 0) output[index] = trait;
      else output.push(trait);
    }
  }
  return output;
}

const batchBySpecies: Record<string, MasterMorphDefinition[]> = {};
for (const batch of [SPECIES_GENETICS_EXPANSION_BATCH_1, SPECIES_GENETICS_EXPANSION_BATCH_3]) {
  for (const [speciesName, traits] of Object.entries(batch)) {
    batchBySpecies[speciesName] = [...(batchBySpecies[speciesName] ?? []), ...traits];
  }
}

export const SPECIES_GENETICS_CATALOGUES_EXPANDED: Record<string, MasterMorphDefinition[]> = Object.keys({
  ...SPECIES_GENETICS_CATALOGUES,
  ...batchBySpecies,
}).reduce<Record<string, MasterMorphDefinition[]>>((result, speciesName) => {
  result[speciesName] = mergeTraits(
    SPECIES_GENETICS_CATALOGUES[speciesName] ?? [],
    batchBySpecies[speciesName] ?? [],
  );
  return result;
}, {});
