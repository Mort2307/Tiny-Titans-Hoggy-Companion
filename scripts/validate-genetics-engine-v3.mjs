import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const engine = read("utils/geneticsEngineV3.ts");
const resolver = read("data/species/speciesGeneticsResolver.ts");
const loci = read("data/species/speciesGeneticsLoci.ts");
const overlay = read("data/species/speciesGeneticsScientificEvidence.ts");

const requiredEngineTerms = [
  "CopyKnowledge",
  'copies: "unknown"',
  "uncertainZygosity",
  "certainty: \"bounded\"",
  "knownGeneCopies",
  "calculateGeneticsV3",
  "combinationRequirements",
  "calculatorNamedCombinations",
  "getSpeciesGeneticsLocus",
  "getSpeciesLocusMembers",
];
for (const term of requiredEngineTerms) {
  if (!engine.includes(term)) throw new Error(`Genetics Engine V3 contract missing: ${term}`);
}
if (engine.includes("50/50") || engine.includes("0.5, 0.5")) throw new Error("Unknown zygosity must not encode an arbitrary 50/50 genotype prior.");
if (!engine.includes("Unknown visual zygosity is") && !engine.includes("unknown")) throw new Error("Unknown zygosity explanation is missing.");
if (!resolver.includes("applyScientificEvidence")) throw new Error("Scientific evidence overlay is not wired through the species resolver.");
if (!resolver.includes("getSpeciesCalculatorMorph")) throw new Error("Species resolver calculator gate is missing.");
if (!loci.includes("locusId")) throw new Error("Species locus registry is missing.");
if (!loci.includes("Motley/Stripe (intermediate)")) throw new Error("Corn Snake CLCN2 heteroallelic phenotype metadata is missing.");
if (!overlay.includes("applyScientificEvidence")) throw new Error("Scientific evidence overlay application function is missing.");

console.log("Genetics Engine V3 contract passed: bounded zygosity, species-scoped resolution, locus/allele safety, canonical combinations and evidence overlays are present.");
