import fs from "node:fs";

const sources = {
  registry: fs.readFileSync("src/data/species/speciesRegistry.ts", "utf8"),
  genetics: fs.readFileSync("src/data/species/speciesGenetics.ts", "utf8"),
  coverage: fs.readFileSync("src/data/species/speciesGeneticsCoverage.ts", "utf8"),
};

const failures = [];
for (const [name, needles] of Object.entries({
  registry: ["INITIAL_SNAKE_SPECIES", "SNAKE_SPECIES_BY_ID"],
  genetics: ["getSpeciesGeneticsCoverage", "getSpeciesGeneticsCoverageSummary"],
  coverage: ["getAllSpeciesGeneticsCoverage", "baseline-only", "partial", "sourceBackedTraitCount"],
})) {
  for (const needle of needles) {
    if (!sources[name].includes(needle)) failures.push(`${name}: missing ${needle}`);
  }
}

if (failures.length) {
  console.error(`Species genetics coverage validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Species genetics coverage validation passed: full-registry coverage API and species-scoped status model are wired.");
