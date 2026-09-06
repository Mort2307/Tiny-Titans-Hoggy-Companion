import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const speciesGenetics = fs.readFileSync(path.join(root, "data/species/speciesGenetics.ts"), "utf8");
const speciesCatalogue = fs.readFileSync(path.join(root, "data/species/speciesGeneticsCatalogues.ts"), "utf8");
const speciesLibrary = fs.readFileSync(path.join(root, "pages/SpeciesMorphLibrary.tsx"), "utf8");
const comboRegistry = fs.readFileSync(path.join(root, "data/geneticsComboRegistry.ts"), "utf8");
const speciesCoverage = fs.readFileSync(path.join(root, "data/species/speciesGeneticsCoverage.ts"), "utf8");

if (!speciesGenetics.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics must use the canonical species catalogue registry.");
if (speciesGenetics.includes("speciesGeneticsCataloguesExpanded")) throw new Error("Deleted expanded species catalogue wrapper is still referenced.");
if (!speciesGenetics.includes("export function searchGenetics")) throw new Error("Species-aware searchGenetics API is missing.");
if (!speciesGenetics.includes("calculatorNamedCombinations")) throw new Error("Recognised calculator combinations are not included in genetics search.");
if (!speciesGenetics.includes("calculatorEligible")) throw new Error("Genetics search results are missing calculator eligibility metadata.");
if (!speciesGenetics.includes("evidenceStatus === \"confirmed\"")) throw new Error("Species calculator must require confirmed evidence.");
if (!speciesGenetics.includes("morph.verification === \"Confirmed\"")) throw new Error("Species calculator must require Confirmed verification.");
if (!speciesGenetics.includes("evidence")) throw new Error("Genetics search results are missing evidence metadata.");
if (!speciesGenetics.includes("explanation")) throw new Error("Genetics search results are missing explanation metadata.");

if (!speciesCatalogue.includes('"Python regius"')) throw new Error("Ball Python species genetics catalogue is missing.");
if (!speciesCatalogue.includes('trait("Piebald", "Recessive"')) throw new Error("Ball Python Piebald locus is missing.");
if (!speciesCatalogue.includes('evidenceStatus: "confirmed"')) throw new Error("Confirmed species genetics evidence metadata is missing.");
if (!speciesCatalogue.includes("omnia.org/OMIA002761/51751/")) throw new Error("Ball Python Piebald OMIA provenance is missing.");
if (!speciesCatalogue.includes("pmc.ncbi.nlm.nih.gov/articles/PMC10712277/")) throw new Error("Ball Python Piebald peer-reviewed provenance is missing.");
if (!speciesCatalogue.includes("omia.org/OMIA002130/94885/")) throw new Error("Corn Snake amelanism OMIA provenance is missing.");
if (!speciesCatalogue.includes("pubmed.ncbi.nlm.nih.gov/40140900/")) throw new Error("Corn Snake CLCN2 provenance is missing.");

if (!speciesLibrary.includes("searchGenetics(selectedSpeciesId, query")) throw new Error("Species Morph Library is not routed through searchGenetics().");
if (!speciesLibrary.includes("result.components")) throw new Error("Species Morph Library does not render resolved combination components.");
if (!speciesLibrary.includes("confidenceLabel(result.evidence.confidence)")) throw new Error("Species Morph Library does not render evidence confidence.");

if (!comboRegistry.includes('geneId: "grey-fog"')) throw new Error("Grey Fog recognised combination is missing.");
if (!comboRegistry.includes('morphId: "arctic"') || !comboRegistry.includes('morphId: "conda"')) throw new Error("Grey Fog must resolve to Arctic + Conda components.");
if (!comboRegistry.includes('aliases: ["Arctic Conda"')) throw new Error("Grey Fog alias recognition is missing.");

if (!speciesCoverage.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics coverage is not tied to the canonical catalogue.");
if (!speciesCoverage.includes("getAllSpeciesGeneticsCoverage")) throw new Error("Species genetics coverage API is incomplete.");
if (!speciesCoverage.includes("confirmedMendelianTraitCount")) throw new Error("Species genetics coverage does not expose confirmed Mendelian evidence.");
if (!speciesCoverage.includes("scientificSourceBackedTraitCount")) throw new Error("Species genetics coverage does not expose scientific-source coverage.");

console.log("Genetics search contract passed: species-scoped search, evidence-gated calculator eligibility, recognised combinations, component resolution and provenance-aware coverage are wired together.");
