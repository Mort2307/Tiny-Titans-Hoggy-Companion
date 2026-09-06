import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/data/species");
const registry = fs.readFileSync(path.join(root, "speciesRegistry.ts"), "utf8");
const coverage = fs.readFileSync(path.join(root, "speciesGeneticsCoverage.ts"), "utf8");
const expanded = fs.readFileSync(path.join(root, "speciesGeneticsCataloguesExpanded.ts"), "utf8");
const batch1 = fs.readFileSync(path.join(root, "speciesGeneticsExpansionBatch1.ts"), "utf8");
const batch3 = fs.readFileSync(path.join(root, "speciesGeneticsExpansionBatch3.ts"), "utf8");
const combinations = fs.readFileSync(path.join(root, "speciesGeneticsCombinations.ts"), "utf8");
const speciesGenetics = fs.readFileSync(path.join(root, "speciesGenetics.ts"), "utf8");

for (const state of ['"mapped"', '"partial"', '"baseline-only"']) if (!coverage.includes(state)) throw new Error(`Missing coverage state ${state}.`);
if (!coverage.includes("getAllSpeciesGeneticsCoverage") || !coverage.includes("getSpeciesGeneticsCoverageSummary")) throw new Error("Species genetics coverage API is incomplete.");
if (!expanded.includes("SPECIES_GENETICS_CATALOGUES") || !expanded.includes("SPECIES_GENETICS_EXPANSION_BATCH_1") || !expanded.includes("SPECIES_GENETICS_EXPANSION_BATCH_3")) throw new Error("Expanded catalogue is not composed from all evidence batches.");
if (!batch1.includes('"Lampropeltis triangulum"') || !batch1.includes('"Albino"') || !batch1.includes('"Hypo"') || !batch1.includes('"Anerythristic"')) throw new Error("Milk Snake evidence batch is incomplete.");
if (!batch3.includes('"Pantherophis guttatus"') || !batch3.includes('"Lampropeltis californiae"') || !batch3.includes('"Boa constrictor"') || !batch3.includes('"Malayopython reticulatus"')) throw new Error("Priority species expansion batch is incomplete.");
if (!batch3.includes('"Morelia spilota"') || !batch3.includes('"Eryx colubrinus"') || !batch3.includes('"Python bivittatus"')) throw new Error("Carpet, Sand Boa or Burmese expansion is incomplete.");
if (!combinations.includes("SPECIES_GENETICS_COMBINATIONS") || !combinations.includes("CombinationPart")) throw new Error("Species combination registry is missing.");
if (!speciesGenetics.includes("resolveSpeciesGenetics") || !speciesGenetics.includes("findSpeciesCanonicalMorphForComposition")) throw new Error("Species canonical genetics resolver is missing.");
if (expanded.includes("speciesGeneticsExpansionBatch2")) throw new Error("Superseded unverified genetics batch remains wired.");

const speciesIds = new Set([
  ...([...registry.matchAll(/\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g)].map((m) => m[1])),
  ...([...registry.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1])),
]);
if (speciesIds.size < 100) throw new Error(`Expected 100+ registered species; detected ${speciesIds.size}.`);
console.log(`Species genetics coverage contract passed: ${speciesIds.size} registered species.`);
