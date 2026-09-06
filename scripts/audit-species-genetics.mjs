import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/data/species");
const registry = fs.readFileSync(path.join(root, "speciesRegistry.ts"), "utf8");
const catalogue = fs.readFileSync(path.join(root, "speciesGeneticsCatalogues.ts"), "utf8");
const expanded = fs.readFileSync(path.join(root, "speciesGeneticsCataloguesExpanded.ts"), "utf8");
const batch = fs.readFileSync(path.join(root, "speciesGeneticsExpansionBatch1.ts"), "utf8");

for (const required of ["export const SPECIES_GENETICS_CATALOGUES", "sourceUrl:", "sourceLabel:"]) {
  if (!catalogue.includes(required)) throw new Error(`Species genetics catalogue is missing required contract: ${required}`);
}
if (!expanded.includes("SPECIES_GENETICS_EXPANSION_BATCH_1")) throw new Error("Expansion batches are not composed into the expanded catalogue.");
if (!batch.includes("Lampropeltis triangulum")) throw new Error("Milk Snake expansion batch is missing.");

const speciesIds = new Set([
  ...[...registry.matchAll(/\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g)].map((m) => m[1]),
  ...[...registry.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]),
]);
if (speciesIds.size < 100) throw new Error(`Expected 100+ registered species; detected ${speciesIds.size}.`);

const traitBlocks = [...catalogue.matchAll(/\[\"([^\"]+)\",\s*\"([^\"]+)\"/g)].map((m) => ({ name: m[1], inheritance: m[2] }));
if (!traitBlocks.length) throw new Error("No species genetics trait records detected.");

console.log(`Species genetics audit passed: ${speciesIds.size} registered species, ${traitBlocks.length} catalogue trait rows, plus isolated evidence expansion batches.`);
