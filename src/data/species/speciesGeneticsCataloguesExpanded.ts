import type { MasterMorphDefinition } from "../masterMorphDatabase";
import { SPECIES_GENETICS_CATALOGUES } from "./speciesGeneticsCatalogues";
import { SPECIES_GENETICS_EXPANSION_BATCH_1 } from "./speciesGeneticsExpansionBatch1";
import { SPECIES_GENETICS_EXPANSION_BATCH_2 } from "./speciesGeneticsExpansionBatch2";

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Later expansion batches intentionally override earlier catalogue rows for the
 * same species/locus. This lets evidence-backed corrections replace legacy
 * classifications without duplicating traits.
 */
function mergeTraits(
  base: MasterMorphDefinition[],
  ...expansions: MasterMorphDefinition[][]
): MasterMorphDefinition[] {
  const byKey = new Map<string, MasterMorphDefinition>();
  for (const trait of base) byKey.set(normalise(trait.geneId || trait.name), trait);
  for (const batch of expansions) {
    for (const trait of batch) {
      byKey.set(normalise(trait.geneId || trait.name), trait);
      byKey.set(`name:${normalise(trait.name)}`, trait);
    }
  }

  const output: MasterMorphDefinition[] = [];
  const seen = new Set<string>();
  for (const trait of byKey.values()) {
    const identity = `${normalise(trait.geneId || trait.name)}|${normalise(trait.name)}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    output.push(trait);
  }
  return output;
}

const allBatches: Record<string, MasterMorphDefinition[]> = {
  ...SPECIES_GENETICS_EXPANSION_BATCH_1,
  ...SPECIES_GENETICS_EXPANSION_BATCH_2,
};

export const SPECIES_GENETICS_CATALOGUES_EXPANDED: Record<string, MasterMorphDefinition[]> = Object.entries({
  ...SPECIES_GENETICS_CATALOGUES,
  ...allBatches,
}).reduce<Record<string, MasterMorphDefinition[]>>((result, [speciesName]) => {
  result[speciesName] = mergeTraits(
    SPECIES_GENETICS_CATALOGUES[speciesName] ?? [],
    SPECIES_GENETICS_EXPANSION_BATCH_1[speciesName] ?? [],
    SPECIES_GENETICS_EXPANSION_BATCH_2[speciesName] ?? [],
  );
  return result;
}, {});
