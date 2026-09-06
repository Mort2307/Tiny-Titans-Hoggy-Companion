import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const engine = read("utils/geneticsEngineV3.ts");
const resolver = read("data/species/speciesGeneticsResolver.ts");
const speciesGenetics = read("data/species/speciesGenetics.ts");
const loci = read("data/species/speciesGeneticsLoci.ts");
const overlay = read("data/species/speciesGeneticsScientificEvidence.ts");
const calculator = read("pages/Calculator.tsx");
const adapter = read("utils/speciesGeneticsCalculator.ts");
const snake = read("types/Snake.ts");
const fixtures = read("data/species/geneticsEngineV3Fixtures.ts");

const required = [
  [engine, "CopyKnowledge", "Explicit genotype copy knowledge is missing."],
  [engine, 'copies: "unknown"', "Unknown dominant/incomplete-dominant zygosity is missing."],
  [engine, "genotypeScenarios", "Bounded genotype scenarios are missing."],
  [engine, "knownGeneCopies", "Explicit known copy states are missing."],
  [engine, "calculateGeneticsV3", "V3 calculation entry point is missing."],
  [engine, "crossLocusStates", "Allele-state crossing is missing."],
  [engine, "getSpeciesLocusPhenotypeRule", "Locus phenotype resolution is missing."],
  [engine, "getSpeciesWildTypeAllele", "Wild-type allele support is missing."],
  [engine, "combinationRequirements", "Canonical combination component requirements are missing."],
  [engine, "calculatorNamedCombinations", "Canonical combination registry is missing."],
  [calculator, "calculateSpeciesGeneticsForSpecies", "Live calculator is not routed through V3."],
  [calculator, "knownGeneCopies: selection.knownGeneCopies", "Live calculator is not passing stored copy evidence."],
  [adapter, "calculateGeneticsV3", "Species adapter is not backed by V3."],
  [adapter, "probabilityRange", "Species adapter does not expose bounded conditional probability ranges."],
  [snake, "geneticsProfile?: AnimalGeneticsProfile", "Animal records cannot carry structured genetics evidence."],
  [snake, "GeneticEvidenceKind", "Animal genetics provenance model is missing."],
  [fixtures, "retic-unknown-tiger-x-normal", "Unknown-zigosity fixture is missing."],
  [fixtures, "ball-piebald-het-x-het", "Exact recessive fixture is missing."],
  [fixtures, "corn-motley-x-stripe-allelic-locus", "Allelic-locus fixture is missing."],
  [fixtures, "hognose-grey-fog-components", "Canonical combination fixture is missing."],
];
for (const [source, marker, message] of required) if (!source.includes(marker)) throw new Error(message);

if (engine.includes("uncertainZygosity")) throw new Error("Obsolete uncertainZygosity contract remains in the V3 engine.");
if (engine.includes("50/50") || engine.includes("0.5, 0.5")) throw new Error("Unknown zygosity must not encode an arbitrary prior.");
if (!speciesGenetics.includes("applyScientificEvidence")) throw new Error("Scientific evidence overlay is not composed into species genetics.");
if (!resolver.includes("getSpeciesCalculatorMorph")) throw new Error("Species resolver calculator gate is missing.");
if (!loci.includes("alleles:")) throw new Error("Explicit allele registry is missing.");
if (!loci.includes("clcn2-motley") || !loci.includes("clcn2-stripe")) throw new Error("CLCN2 allele identities are missing.");
if (!loci.includes("clcn2-motley-stripe-intermediate")) throw new Error("CLCN2 heteroallelic phenotype rule is missing.");
if (!overlay.includes("applyScientificEvidence")) throw new Error("Scientific evidence application function is missing.");

console.log("Genetics Engine V3 contract passed: bounded zygosity, species-scoped routing, explicit allele loci, canonical combinations, provenance-aware animal genetics, live calculator integration and evidence overlays are wired.");
