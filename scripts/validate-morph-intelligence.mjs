import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const intelligence = read("src/data/morphIntelligence.ts");
const master = read("src/data/masterMorphDatabase.ts");
const identity = read("src/utils/geneticsIdentity.ts");
const resolver = read("src/utils/morphResolver.ts");
const calculator = read("src/utils/geneticsCalculator.ts");
const reversal = read("src/utils/geneticsReversal.ts");
const library = read("src/pages/MorphLibrary.tsx");

const failures = [];
const required = [
  [intelligence, "geneticSignature", "Morph intelligence is missing geneticSignature."],
  [intelligence, "geneticFormula", "Morph intelligence is missing geneticFormula."],
  [intelligence, "compositionStatus", "Morph intelligence is missing compositionStatus."],
  [intelligence, "inferNameComponents", "Morph intelligence is missing safe name inference."],
  [intelligence, "unresolvedComponents", "Morph intelligence is missing unresolved-component tracking."],
  [master, "enrichMorphDatabase", "Master morph database is not enriched by the intelligence layer."],
  [identity, "resolveCanonicalGeneticIdentity", "Genetics identity layer is not exposing canonical resolution."],
  [resolver, "getCanonicalComposition", "Morph resolver is not using canonical composition."],
  [calculator, "resolveCanonicalGenetics", "Genetics calculator is not consuming canonical genetics."],
  [library, "typed.geneticFormula", "Morph Library does not surface canonical formulas."],
  [library, "typed.recognisedNames", "Morph Library does not surface recognised names."],
];
for (const [source, needle, message] of required) if (!source.includes(needle)) failures.push(message);

if (!intelligence.includes('type MorphCompositionStatus = "exact" | "inferred" | "unresolved"')) failures.push("Morph composition status contract is incomplete.");
if (!identity.includes("resolveMasterMorph(value)")) failures.push("Human genetics input does not route through the master resolver.");
if (!resolver.includes("findCanonicalMorphForComposition")) failures.push("Morph resolver does not map compositions back to recognised names.");
if (!calculator.includes("findCanonicalMorphForComposition")) failures.push("Calculator does not map offspring signatures back to recognised combinations.");

if (reversal.includes("findCalculatorNamedCombination(query)")) failures.push("Morph reversal still uses the legacy calculator-only name lookup path.");
if (!reversal.includes("reverseMorph")) failures.push("Morph reversal entry point is missing.");

const morphs = read("src/data/morphs.ts");
const combos = read("src/data/geneticsComboRegistry.ts");
const catalog = read("src/data/hognoseMorphCatalog.ts");
if (!catalog.includes("combination('Grey Fog', ['Arctic', 'Anaconda'")) failures.push("Grey Fog is not mapped to Arctic + Anaconda in the Hognose reference catalogue.");
if (!combos.includes('name: "Grey Fog"')) failures.push("Grey Fog is missing from the recognised combination registry.");
if (!combos.includes('inheritance: "Unknown"')) failures.push("Named combinations should not claim a single inheritance mode.");
if (!morphs.includes('geneId: "conda"') || !morphs.includes('"Anaconda"')) failures.push("Conda/Anaconda canonical alias contract is missing.");

if (failures.length) {
  console.error(`Morph intelligence validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Morph intelligence validation passed: canonical identity, composition inference, calculator integration, search metadata and Hognose invariants are present.");
