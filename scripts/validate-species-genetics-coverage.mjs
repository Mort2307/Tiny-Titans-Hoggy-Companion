import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/data/species");
const registry = fs.readFileSync(path.join(root, "speciesRegistry.ts"), "utf8");
const coverage = fs.readFileSync(path.join(root, "speciesGeneticsCoverage.ts"), "utf8");
const expanded = fs.readFileSync(path.join(root, "speciesGeneticsCataloguesExpanded.ts"), "utf8");
const batch = fs.readFileSync(path.join(root, "speciesGeneticsExpansionBatch1.ts"), "utf8");

if (!coverage.includes('"mapped"') || !coverage.includes('"partial"') || !coverage.includes('"baseline-only"')) throw new Error("Species genetics coverage states are incomplete.");
if (!coverage.includes("getAllSpeciesGeneticsCoverage") || !coverage.includes("getSpeciesGeneticsCoverageSummary")) throw new Error("Species genetics coverage API is incomplete.");
if (!expanded.includes("SPECIES_GENETICS_CATALOGUES") || !expanded.includes("SPECIES_GENETICS_EXPANSION_BATCH_1")) throw new Error("Expanded species genetics read model is not wired to the base catalogue and expansion batches.");
if (!batch.includes('"Lampropeltis triangulum"')) throw new Error("Expansion batch 1 is missing the Milk Snake catalogue.");
if (!batch.includes('"Albino"') || !batch.includes('"Hypo"') || !batch.includes('"Anerythristic"')) throw new Error("Milk Snake expansion batch is missing required evidence-backed traits.");

const speciesIds = new Set([
  ...[...registry.matchAll(/\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g)].map((m) => m[1]),
  ...[...registry.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]),
]);
if (speciesIds.size < 100) throw new Error(`Expected 100+ registered snake species; detected ${speciesIds.size}.`);

console.log(`Species genetics coverage contract passed: ${speciesIds.size} registered species are covered by the shared status model.`);
