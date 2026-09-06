import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const speciesGenetics = fs.readFileSync(path.join(root, "data/species/speciesGenetics.ts"), "utf8");
const speciesLibrary = fs.readFileSync(path.join(root, "pages/SpeciesMorphLibrary.tsx"), "utf8");
const comboRegistry = fs.readFileSync(path.join(root, "data/geneticsComboRegistry.ts"), "utf8");
const speciesCoverage = fs.readFileSync(path.join(root, "data/species/speciesGeneticsCoverage.ts"), "utf8");

if (!speciesGenetics.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics must use the canonical species catalogue registry.");
if (speciesGenetics.includes("speciesGeneticsCataloguesExpanded")) throw new Error("Deleted expanded species catalogue wrapper is still referenced.");
if (!speciesGenetics.includes("export function searchGenetics")) throw new Error("Species-aware searchGenetics API is missing.");
if (!speciesGenetics.includes("calculatorNamedCombinations")) throw new Error("Recognised calculator combinations are not included in genetics search.");
if (!speciesGenetics.includes("calculatorEligible")) throw new Error("Genetics search results are missing calculator eligibility metadata.");
if (!speciesGenetics.includes("explanation")) throw new Error("Genetics search results are missing explanation metadata.");
if (!speciesGenetics.includes("evidence")) throw new Error("Genetics search results are missing evidence metadata.");

if (!speciesLibrary.includes("searchGenetics(selectedSpeciesId, query")) throw new Error("Species Morph Library is not routed through searchGenetics().");
if (!speciesLibrary.includes("result.components")) throw new Error("Species Morph Library does not render resolved combination components.");
if (!speciesLibrary.includes("confidenceLabel(result.evidence.confidence)")) throw new Error("Species Morph Library does not render evidence confidence.");

if (!comboRegistry.includes('geneId: "grey-fog"')) throw new Error("Grey Fog recognised combination is missing.");
if (!comboRegistry.includes('morphId: "arctic"') || !comboRegistry.includes('morphId: "conda"')) throw new Error("Grey Fog must resolve to Arctic + Conda components.");
if (!comboRegistry.includes('aliases: ["Arctic Conda"')) throw new Error("Grey Fog alias recognition is missing.");

if (!speciesCoverage.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics coverage is not tied to the canonical catalogue.");
if (!speciesCoverage.includes("getAllSpeciesGeneticsCoverage")) throw new Error("Species genetics coverage API is incomplete.");

console.log("Genetics search contract passed: canonical registry, species-scoped search, recognised combinations, component resolution and evidence metadata are wired together.");
