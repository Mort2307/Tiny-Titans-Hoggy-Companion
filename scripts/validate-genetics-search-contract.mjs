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
const legacyEngine = read("utils/geneticsEngine.ts");
const engineV3 = read("utils/geneticsEngineV3.ts");
const safetyV3 = read("utils/geneticsEngineV3Safety.ts");
const speciesAdapter = read("utils/speciesGeneticsCalculator.ts");
const masterMorphDatabase = read("data/masterMorphDatabase.ts");
const speciesLibrary = read("pages/SpeciesMorphLibrary.tsx");
const calculator = read("pages/Calculator.tsx");
const comboRegistry = read("data/geneticsComboRegistry.ts");
const speciesCoverage = read("data/species/speciesGeneticsCoverage.ts");

if (!speciesGenetics.includes("SPECIES_GENETICS_CATALOGUES")) throw new Error("Species genetics must use the canonical species catalogue registry.");
if (!speciesGenetics.includes("SPECIES_GENETICS_EXPANSION_BATCH_1") || !speciesGenetics.includes("SPECIES_GENETICS_EXPANSION_BATCH_2")) throw new Error("All active species genetics expansion batches must be composed.");
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
if (!resolver.includes("applyScientificEvidence") || !resolver.includes("getSpeciesCalculatorMorph")) throw new Error("Species resolver evidence/calculator layers are incomplete.");
if (!resolver.includes("resolveSpeciesUnderlyingGenes")) throw new Error("Species resolver is missing underlying-component resolution.");

if (!engineV3.includes("calculateGeneticsV3") || !engineV3.includes("CopyKnowledge")) throw new Error("Authoritative V3 genetics engine is missing.");
if (!engineV3.includes('copies: "unknown"') || !engineV3.includes('certainty: "bounded"')) throw new Error("V3 bounded zygosity support is missing.");
if (!engineV3.includes("getSpeciesGeneticsLocus") || !engineV3.includes("crossLocusStates")) throw new Error("V3 locus/allele modelling is incomplete.");
if (!engineV3.includes("combinationRequirements") || !engineV3.includes("calculatorNamedCombinations")) throw new Error("V3 canonical combination resolution is incomplete.");
if (!safetyV3.includes("calculateGeneticsV3Safe")) throw new Error("V3 safety normalisation layer is missing.");
if (!speciesAdapter.includes("calculateGeneticsV3Safe")) throw new Error("Species calculator adapter is not using V3 safety routing.");
if (!calculator.includes("calculateSpeciesGeneticsForSpecies") || !calculator.includes("knownGeneCopies: selection.knownGeneCopies")) throw new Error("Live calculator is not passing explicit species and genotype evidence to V3.");
if (!legacyEngine.includes("export function calculateGenetics")) throw new Error("Legacy Hognose compatibility engine is missing for non-V3 callers.");

if (engineV3.includes("0.5, 0.5") || engineV3.includes("50/50 genotype")) throw new Error("Unknown zygosity must not encode an arbitrary genotype prior.");
if (!locusRegistry.includes("pantherophis-guttatus-clcn2-pattern")) throw new Error("Corn Snake CLCN2 locus registry is missing.");
if (!locusRegistry.includes("clcn2-motley") || !locusRegistry.includes("clcn2-stripe")) throw new Error("Corn Snake CLCN2 allele identities are missing from the locus registry.");
if (!locusRegistry.includes("Motley/Stripe (intermediate)")) throw new Error("Corn Snake heteroallelic phenotype metadata is missing.");

if (!speciesCatalogue.includes('"Python regius"')) throw new Error("Ball Python species genetics catalogue is missing.");
if (!speciesCatalogue.includes('trait("Piebald", "Recessive"')) throw new Error("Ball Python Piebald locus is missing.");
if (!speciesCatalogue.includes('"Pantherophis guttatus"')) throw new Error("Corn Snake species genetics catalogue is missing.");
if (!scientificOverlay.includes('traitName: "Axanthic"')) throw new Error("Ball Python GCH2 axanthic evidence overlay is missing.");
if (!scientificOverlay.includes('traitName: "Terrazzo"')) throw new Error("Corn Snake Terrazzo evidence overlay is missing.");
if (!scientificOverlay.includes('traitName: "Lavender"')) throw new Error("Corn Snake Lavender evidence overlay is missing.");
for (const id of ["OMIA002937/51751", "OMIA002758/51751", "OMIA002770/51751", "OMIA002701/51751", "OMIA002449/94885", "OMIA002884/94885"]) {
  if (!scientificOverlay.includes(id)) throw new Error(`Scientific genetics provenance missing: ${id}`);
}
if (!speciesCatalogue.includes("omia.org/OMIA002761/51751/")) throw new Error("Ball Python Piebald OMIA provenance is missing.");
if (!speciesCatalogue.includes("pmc.ncbi.nlm.nih.gov/articles/PMC10712277/")) throw new Error("Ball Python Piebald peer-reviewed provenance is missing.");
if (!speciesCatalogue.includes("omia.org/OMIA002130/94885/")) throw new Error("Corn Snake amelanism OMIA provenance is missing.");
if (!speciesCatalogue.includes("pubmed.ncbi.nlm.nih.gov/40140900/")) throw new Error("Corn Snake CLCN2 provenance is missing.");

if (!expansionBatch2.includes('"Python bivittatus"')) throw new Error("Burmese Python expansion is missing.");
if (!expansionBatch2.includes('trait("python-bivittatus", "Pied", "Recessive"')) throw new Error("Burmese Python Pied trait is missing.");
if (!expansionBatch2.includes('trait("python-bivittatus", "Hypo", "Incomplete Dominant"')) throw new Error("Burmese Python Hypo inheritance is missing.");
if (!expansionBatch2.includes('trait("morelia-spilota", "Genetic Stripe", "Recessive"')) throw new Error("Carpet Python Genetic Stripe trait is missing.");

if (!speciesLibrary.includes("searchGenetics(selectedSpeciesId, query")) throw new Error("Species Morph Library is not routed through searchGenetics().");
if (!speciesLibrary.includes("getSpeciesVisualMorphs(selectedSpeciesId)")) throw new Error("Species Morph Library is not exposing species visual phenotype coverage.");
if (!speciesLibrary.includes("result.components")) throw new Error("Species Morph Library does not render resolved combination components.");
if (!speciesLibrary.includes("confidenceLabel(result.evidence.confidence)")) throw new Error("Species Morph Library does not render evidence confidence.");

if (!comboRegistry.includes('geneId: "grey-fog"')) throw new Error("Grey Fog recognised combination is missing.");
if (!comboRegistry.includes('morphId: "arctic"') || !comboRegistry.includes('morphId: "conda"')) throw new Error("Grey Fog must resolve to Arctic + Conda components.");
if (!comboRegistry.includes('aliases: ["Arctic Conda"')) throw new Error("Grey Fog alias recognition is missing.");
if (!speciesCoverage.includes("SPECIES_GENETICS_CATALOGUES") || !speciesCoverage.includes("SPECIES_GENETICS_EXPANSION_BATCH_2")) throw new Error("Species genetics coverage is not tied to all canonical evidence sources.");
if (!speciesCoverage.includes("getAllSpeciesGeneticsCoverage") || !speciesCoverage.includes("confirmedMendelianTraitCount") || !speciesCoverage.includes("scientificSourceBackedTraitCount")) throw new Error("Species genetics coverage API is incomplete.");

console.log("Genetics contract passed: species resolver, evidence overlays, V3 bounded zygosity, canonical combinations, copy-aware matching, allelic-series safety, provenance, live calculator routing and coverage are wired together.");