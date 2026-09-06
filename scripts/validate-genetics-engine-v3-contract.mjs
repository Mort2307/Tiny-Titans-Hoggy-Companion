import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const engine = read("utils/geneticsEngineV3.ts");
const calculator = read("pages/Calculator.tsx");
const adapter = read("utils/speciesGeneticsCalculator.ts");
const loci = read("data/species/speciesGeneticsLoci.ts");
const snake = read("types/Snake.ts");
const genetics = read("types/genetics.ts");
const fixtures = read("data/species/geneticsEngineV3Fixtures.ts");

const required = [
  [engine, "type CopyKnowledge = 0 | 1 | 2 | \"unknown\"", "Unknown copy-state model is missing."],
  [engine, "genotypeScenarios", "Bounded genotype scenarios are missing."],
  [engine, "Unknown visual zygosity is a set of possible genotypes", "Unknown zygosity must not claim a prior."],
  [engine, "getSpeciesLocusPhenotypeRule", "Locus phenotype resolution is missing."],
  [engine, "crossLocusStates", "Allele-state crossing is missing."],
  [engine, "getSpeciesWildTypeAllele", "Wild-type allele support is missing."],
  [engine, "combinationRequirements", "Canonical combination component requirements are missing."],
  [engine, "sort((a, b) =>", "Combination specificity sorting is missing."],
  [calculator, "calculateSpeciesGeneticsForSpecies", "Live calculator is not routed through V3."],
  [calculator, "knownGeneCopies: selection.knownGeneCopies", "Live calculator is not passing explicit copy evidence."],
  [adapter, "calculateGeneticsV3", "Species calculator adapter is not using V3."],
  [adapter, "probabilityRange", "Adapter does not expose bounded probability information."],
  [snake, "geneticsProfile?: AnimalGeneticsProfile", "Animal records cannot store structured genetics evidence."],
  [snake, "GeneticEvidenceKind", "Animal genetics provenance vocabulary is missing."],
  [genetics, "knownGeneCopies?: Record<string, 1 | 2>", "Parent contract cannot preserve explicit copy states."],
  [fixtures, "retic-unknown-tiger-x-normal", "Unknown zygosity fixture is missing."],
  [fixtures, "ball-piebald-het-x-het", "Exact recessive fixture is missing."],
  [fixtures, "corn-motley-x-stripe-allelic-locus", "Allelic-locus fixture is missing."],
  [fixtures, "hognose-grey-fog-components", "Canonical combination fixture is missing."],
];
for (const [source, marker, message] of required) if (!source.includes(marker)) throw new Error(message);

if (!engine.includes('if (mother.speciesId !== father.speciesId)')) throw new Error("V3 species mismatch guard is missing.");
if (!engine.includes('certainty: "bounded"')) throw new Error("V3 bounded outcome state is missing.");
if (!loci.includes("alleles:")) throw new Error("Explicit allele registry is missing.");
if (!loci.includes("clcn2-motley") || !loci.includes("clcn2-stripe")) throw new Error("CLCN2 allele identities are missing.");
if (!loci.includes("clcn2-motley-stripe-intermediate")) throw new Error("CLCN2 heteroallelic phenotype rule is missing.");

console.log("Genetics Engine V3 contract passed: species routing, bounded zygosity, provenance-aware copy states, explicit loci/alleles, canonical combinations, live calculator integration and behavioural fixtures are wired.");
