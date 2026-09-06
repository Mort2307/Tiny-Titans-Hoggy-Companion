import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const speciesGenetics = read("data/species/speciesGenetics.ts");
const speciesCatalogue = read("data/species/speciesGeneticsCatalogues.ts");
const expansionBatch2 = read("data/species/speciesGeneticsExpansionBatch2.ts");
const scientificOverlay = read("data/species/speciesGeneticsScientificEvidence.ts");
const locusRegistry = read("data/species/speciesGeneticsLoci.ts");
const resolver = read("data/species/speciesGeneticsResolver.ts");
const engine = read("utils/geneticsEngine.ts");
const masterMorphDatabase = read("data/masterMorphDatabase.ts");
const speciesLibrary = read("pages/SpeciesMorphLibrary.tsx");
const comboRegistry = read("data/geneticsComboRegistry.ts");
const speciesCoverage = read("data/species/speciesGeneticsCoverage.ts");

if (!speciesGenetics.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics must use the canonical species catalogue registry.");
if (!speciesGenetics.includes("SPECIES_GENETICS_EXPANSION_BATCH_1") || !speciesGenetics.includes("SPECIES_GENETICS_EXPANSION_BATCH_2")) throw new Error("All active species genetics expansion batches must be composed.");
if (!speciesGenetics.includes("applyScientificEvidence")) throw new Error("Scientific evidence overlay registry is not composed into species genetics.");
if (speciesGenetics.includes("speciesGeneticsCataloguesExpanded")) throw new Error("Deleted expanded species catalogue wrapper is still referenced.");
if (!speciesGenetics.includes("export function searchGenetics")) throw new Error("Species-aware searchGenetics API is missing.");
if (!speciesGenetics.includes("calculatorNamedCombinations")) throw new Error("Recognised calculator combinations are not included in genetics search.");
if (!speciesGenetics.includes("calculatorEligible")) throw new Error("Genetics search results are missing calculator eligibility metadata.");
if (!speciesGenetics.includes("evidenceStatus === \"confirmed\"")) throw new Error("Species calculator must require confirmed evidence.");
if (!speciesGenetics.includes("morph.verification === \"Confirmed\"")) throw new Error("Species calculator must require Confirmed verification.");
if (!speciesGenetics.includes("evidence")) throw new Error("Genetics search results are missing evidence metadata.");
if (!speciesGenetics.includes("explanation")) throw new Error("Genetics search results are missing explanation metadata.");

if (!masterMorphDatabase.includes("calculatorEligible?: boolean")) throw new Error("Master morph definitions are missing explicit calculator eligibility metadata.");
if (!masterMorphDatabase.includes("if (morph.calculatorEligible === false) return false")) throw new Error("Master calculator gate is not honouring explicit calculator exclusion.");

if (!resolver.includes("getSpeciesCalculatorMorphs")) throw new Error("Species resolver is not connected to the species calculator gate.");
if (!resolver.includes("resolveSpeciesUnderlyingGenes")) throw new Error("Species resolver is missing underlying-component resolution.");

if (!engine.includes("calculatorNamedCombinations")) throw new Error("Genetics engine is not consuming the canonical combination registry.");
if (engine.includes("const possibleIds = new Set")) throw new Error("Genetics engine still contains a hardcoded combination id list.");
if (!engine.includes("getCombinationRequirements")) throw new Error("Genetics engine is not using canonical component copy requirements.");
if (!engine.includes("component.copies")) throw new Error("Combination copy counts are not read from canonical components.");
if (!engine.includes("getSpeciesCalculatorMorph")) throw new Error("Genetics engine is not species-scoped for calculator morph resolution.");
if (!engine.includes("calculateSpeciesGenetics")) throw new Error("Species-specific calculator entry point is missing.");
if (!engine.includes("morph.inheritance === \"Dominant\"")) throw new Error("Dominant phenotype resolution is missing.");
if (!engine.includes("getOutcomeKey") || !engine.includes("state.copies")) throw new Error("Outcome merging is not preserving genotype-specific copy states.");
if (!engine.includes("getSpeciesGeneticsLocus") || !engine.includes("validateAllelicSeries")) throw new Error("Allelic-series safety gate is missing.");

if (!locusRegistry.includes("pantherophis-guttatus-clcn2-pattern")) throw new Error("Corn Snake CLCN2 locus registry is missing.");
if (!locusRegistry.includes("motley") || !locusRegistry.includes("stripe")) throw new Error("Corn Snake CLCN2 alleles are missing from the locus registry.");
if (!locusRegistry.includes("Motley/Stripe (intermediate)")) throw new Error("Corn Snake heteroallelic phenotype metadata is missing.");

if (!speciesCatalogue.includes('"Python regius"')) throw new Error("Ball Python species genetics catalogue is missing.");
if (!speciesCatalogue.includes('trait("Piebald", "Recessive"')) throw new Error("Ball Python Piebald locus is missing.");
if (!speciesCatalogue.includes('"Pantherophis guttatus"')) throw new Error("Corn Snake species genetics catalogue is missing.");
if (!scientificOverlay.includes('traitName: "Axanthic"')) throw new Error("Ball Python GCH2 axanthic evidence overlay is missing.");
if (!scientificOverlay.includes('traitName: "Terrazzo"')) throw new Error("Corn Snake Terrazzo evidence overlay is missing.");
if (!scientificOverlay.includes('traitName: "Lavender"')) throw new Error("Corn Snake Lavender evidence overlay is missing.");
if (!scientificOverlay.includes("OMIA002937/51751")) throw new Error("Ball Python GCH2 OMIA provenance is missing.");
if (!scientificOverlay.includes("OMIA002758/51751")) throw new Error("Ball Python MLPH OMIA provenance is missing.");
if (!scientificOverlay.includes("OMIA002770/51751")) throw new Error("Ball Python MC1R OMIA provenance is missing.");
if (!scientificOverlay.includes("OMIA002701/51751")) throw new Error("Ball Python EDNRB2 OMIA provenance is missing.");
if (!scientificOverlay.includes("OMIA002449/94885")) throw new Error("Corn Snake LYST OMIA provenance is missing.");
if (!scientificOverlay.includes("OMIA002884/94885")) throw new Error("Corn Snake PMEL OMIA provenance is missing.");
if (!speciesCatalogue.includes("omnia.org/OMIA002761/51751/")) throw new Error("Ball Python Piebald OMIA provenance is missing.");
if (!speciesCatalogue.includes("pmc.ncbi.nlm.nih.gov/articles/PMC10712277/")) throw new Error("Ball Python Piebald peer-reviewed provenance is missing.");
if (!speciesCatalogue.includes("omia.org/OMIA002130/94885/")) throw new Error("Corn Snake amelanism OMIA provenance is missing.");
if (!speciesCatalogue.includes("pubmed.ncbi.nlm.nih.gov/40140900/")) throw new Error("Corn Snake CLCN2 provenance is missing.");

if (!expansionBatch2.includes('"Python bivittatus"')) throw new Error("Burmese Python expansion is missing.");
if (!expansionBatch2.includes('trait("python-bivittatus", "Pied", "Recessive"')) throw new Error("Burmese Python Pied trait is missing.");
if (!expansionBatch2.includes('trait("python-bivittatus", "Hypo", "Incomplete Dominant"')) throw new Error("Burmese Python Hypo inheritance is missing.");
if (!expansionBatch2.includes('trait("morelia-spilota", "Genetic Stripe", "Recessive"')) throw new Error("Carpet Python Genetic Stripe trait is missing.");

if (!speciesLibrary.includes("searchGenetics(selectedSpeciesId, query")) throw new Error("Species Morph Library is not routed through searchGenetics().");
if (!speciesLibrary.includes("result.components")) throw new Error("Species Morph Library does not render resolved combination components.");
if (!speciesLibrary.includes("confidenceLabel(result.evidence.confidence)")) throw new Error("Species Morph Library does not render evidence confidence.");

if (!comboRegistry.includes('geneId: "grey-fog"')) throw new Error("Grey Fog recognised combination is missing.");
if (!comboRegistry.includes('morphId: "arctic"') || !comboRegistry.includes('morphId: "conda"')) throw new Error("Grey Fog must resolve to Arctic + Conda components.");
if (!comboRegistry.includes('aliases: ["Arctic Conda"')) throw new Error("Grey Fog alias recognition is missing.");

if (!speciesCoverage.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics coverage is not tied to the canonical catalogue.");
if (!speciesCoverage.includes("SPECIES_GENETICS_EXPANSION_BATCH_2")) throw new Error("Species genetics coverage is missing the second expansion batch.");
if (!speciesCoverage.includes("getAllSpeciesGeneticsCoverage")) throw new Error("Species genetics coverage API is incomplete.");
if (!speciesCoverage.includes("confirmedMendelianTraitCount")) throw new Error("Species genetics coverage does not expose confirmed Mendelian evidence.");
if (!speciesCoverage.includes("scientificSourceBackedTraitCount")) throw new Error("Species genetics coverage does not expose scientific-source coverage.");

console.log("Genetics contract passed: species-scoped resolver, calculator gate, canonical combinations, copy-aware matching, allelic-series safety, molecular evidence overlays, provenance and coverage are wired together.");
