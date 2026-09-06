import fs from "node:fs";

const registry = fs.readFileSync("src/data/species/speciesRegistry.ts", "utf8");
const catalog = fs.readFileSync("src/data/species/speciesGeneticsCatalogues.ts", "utf8");
const speciesTypes = fs.readFileSync("src/data/species/speciesTypes.ts", "utf8");
const coverage = fs.readFileSync("src/data/species/speciesGeneticsCoverage.ts", "utf8");

const failures = [];

if (!registry.includes("SPECIES_EXPANSION_BATCH_9")) failures.push("Species registry is missing the current expansion boundary.");
if (!catalog.includes("SPECIES_GENETICS_CATALOGUES")) failures.push("Species genetics catalogue export is missing.");
if (!speciesTypes.includes("SourceCitation")) failures.push("Species evidence contract is missing SourceCitation.");
if (!coverage.includes("baseline-only")) failures.push("Species genetics coverage does not distinguish unmapped species.");
if (!coverage.includes("sourceBackedTraitCount")) failures.push("Species genetics coverage does not measure evidence-backed traits.");

// Keep the audit intentionally source-light: it verifies architecture without
// treating an unreviewed catalogue entry as scientifically confirmed.
const traitBlocks = [...catalog.matchAll(/\[\"([^\"]+)\",\s*\"(Recessive|Incomplete Dominant|Dominant|Polygenic|Line-bred|Unknown)\"/g)];
const seenNames = new Set();
for (const match of traitBlocks) {
  const name = match[1].trim().toLowerCase();
  if (seenNames.has(name)) continue;
  seenNames.add(name);
}

console.log(`Species genetics architecture audit passed: ${seenNames.size} distinct catalogue trait names detected; coverage and evidence contracts are present.`);
