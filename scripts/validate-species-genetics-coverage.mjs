import { INITIAL_SNAKE_SPECIES } from "../src/data/species/speciesRegistry.ts";
import { getAllSpeciesGeneticsCoverage, getSpeciesGeneticsCoverage } from "../src/data/species/speciesGeneticsCoverage.ts";

const coverage = getAllSpeciesGeneticsCoverage();
const ids = new Set(coverage.map((entry) => entry.speciesId));

if (coverage.length !== INITIAL_SNAKE_SPECIES.length) {
  throw new Error(`Species genetics coverage mismatch: ${coverage.length} coverage records for ${INITIAL_SNAKE_SPECIES.length} registered species.`);
}

for (const species of INITIAL_SNAKE_SPECIES) {
  const entry = getSpeciesGeneticsCoverage(species.id);
  if (!entry || !ids.has(species.id)) throw new Error(`Missing genetics coverage for ${species.id}.`);
  if (!entry.scientificName || !entry.commonName) throw new Error(`Incomplete coverage identity for ${species.id}.`);
  if (!["mapped", "partial", "baseline-only"].includes(entry.status)) throw new Error(`Invalid coverage status for ${species.id}.`);
  if (entry.traitCount < 0 || entry.mendelianTraitCount < 0 || entry.nonMendelianTraitCount < 0 || entry.sourceBackedTraitCount < 0) {
    throw new Error(`Negative genetics coverage count for ${species.id}.`);
  }
  if (entry.mendelianTraitCount + entry.nonMendelianTraitCount !== entry.traitCount) {
    throw new Error(`Trait-count accounting mismatch for ${species.id}.`);
  }
  if (entry.sourceBackedTraitCount > entry.traitCount) throw new Error(`Source-backed count exceeds trait count for ${species.id}.`);
}

const hognose = getSpeciesGeneticsCoverage("heterodon-nasicus");
if (!hognose || hognose.status !== "mapped") throw new Error("Western Hognose must remain mapped in the shared coverage model.");

console.log(`Species genetics coverage validated: ${coverage.length} species.`);
