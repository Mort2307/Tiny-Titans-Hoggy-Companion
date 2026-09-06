import { SPECIES_GENETICS_CATALOGUES } from "../src/data/species/speciesGeneticsCatalogues.ts";
import { INITIAL_SNAKE_SPECIES } from "../src/data/species/speciesRegistry.ts";

const registeredScientificNames = new Set(INITIAL_SNAKE_SPECIES.map((species) => species.acceptedScientificName));

for (const [scientificName, traits] of Object.entries(SPECIES_GENETICS_CATALOGUES)) {
  if (!registeredScientificNames.has(scientificName)) {
    throw new Error(`Genetics catalogue is orphaned from species registry: ${scientificName}`);
  }

  const seen = new Set();
  for (const trait of traits) {
    if (!trait.name || !trait.geneId || !trait.inheritance) throw new Error(`Incomplete genetics trait in ${scientificName}.`);
    const key = trait.name.trim().toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate genetics trait '${trait.name}' in ${scientificName}.`);
    seen.add(key);
    if (trait.sourceUrl && !trait.sourceLabel) throw new Error(`Source URL without source label for ${scientificName}: ${trait.name}.`);
  }
}

console.log(`Species genetics catalogue audit passed: ${Object.keys(SPECIES_GENETICS_CATALOGUES).length} species catalogued.`);
