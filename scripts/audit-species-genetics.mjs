import fs from "node:fs";

const registry = fs.readFileSync("src/data/species/speciesRegistry.ts", "utf8");
const catalog = fs.readFileSync("src/data/species/speciesGeneticsCatalogues.ts", "utf8");
const speciesTypes = fs.readFileSync("src/data/species/speciesTypes.ts", "utf8");
const coverage = fs.readFileSync("src/data/species/speciesGeneticsCoverage.ts", "utf8");

const failures = [];

for (const [source, needle, message] of [
  [registry, "SPECIES_EXPANSION_BATCH_9", "Species registry is missing the current expansion boundary."],
  [catalog, "SPECIES_GENETICS_CATALOGUES", "Species genetics catalogue export is missing."],
  [speciesTypes, "SourceCitation", "Species evidence contract is missing SourceCitation."],
  [coverage, "baseline-only", "Species genetics coverage does not distinguish unmapped species."],
  [coverage, "sourceBackedTraitCount", "Species genetics coverage does not measure evidence-backed traits."],
]) {
  if (!source.includes(needle)) failures.push(message);
}

const rows = [...catalog.matchAll(/\[\"([^\"]+)\",\s*\"(Recessive|Incomplete Dominant|Dominant|Polygenic|Line-bred|Unknown)\"/g)];
const canonicalNames = rows.map((match) => match[1].trim().toLowerCase());
const uniqueNames = new Set(canonicalNames);

if (!rows.length) failures.push("No species genetics trait records were detected.");
if (uniqueNames.size !== canonicalNames.length) failures.push("Species genetics catalogue contains duplicate canonical trait names.");

if (failures.length) {
  console.error(`Species genetics integrity audit failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Species genetics integrity audit passed: ${uniqueNames.size} distinct catalogue trait names detected; coverage and evidence contracts are present.`);
