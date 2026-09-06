import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const intelligence = read("src/data/morphIntelligence.ts");
const master = read("src/data/masterMorphDatabase.ts");
const identity = read("src/utils/geneticsIdentity.ts");
const canonical = read("src/utils/canonicalGenetics.ts");
const resolver = read("src/utils/morphResolver.ts");
const calculator = read("src/utils/geneticsCalculator.ts");
const reversal = read("src/utils/geneticsReversal.ts");
const library = read("src/pages/MorphLibrary.tsx");
const morphs = read("src/data/morphs.ts");
const combos = read("src/data/geneticsComboRegistry.ts");
const catalog = read("src/data/hognoseMorphCatalog.ts");

const failures = [];
const required = [
  [intelligence, "geneticSignature", "Morph intelligence is missing geneticSignature."],
  [intelligence, "geneticFormula", "Morph intelligence is missing geneticFormula."],
  [intelligence, "compositionStatus", "Morph intelligence is missing compositionStatus."],
  [intelligence, "inferNameComponents", "Morph intelligence is missing safe name inference."],
  [intelligence, "unresolvedComponents", "Morph intelligence is missing unresolved-component tracking."],
  [master, "enrichMorphDatabase", "Master morph database is not enriched by the intelligence layer."],
  [identity, "resolveCanonicalGeneticIdentity", "Genetics identity layer is not exposing canonical resolution."],
  [canonical, "resolveCanonicalGenetics", "Canonical genetics adapter is missing."],
  [resolver, "getCanonicalComposition", "Morph resolver is not using canonical composition."],
  [calculator, "expandMorphToComponents", "Genetics calculator is not exposing canonical component expansion."],
  [calculator, "resolveCanonicalGenetics", "Genetics calculator is not resolving parent genetics through the canonical resolver."],
  [reversal, "resolveMasterMorph", "Morph reversal is not using the master identity resolver."],
  [library, "typed.geneticFormula", "Morph Library does not surface canonical formulas."],
  [library, "typed.recognisedNames", "Morph Library does not surface recognised names."],
];
for (const [source, needle, message] of required) if (!source.includes(needle)) failures.push(message);

if (!canonical.includes("findCanonicalMorphForComposition")) failures.push("Canonical adapter does not map compositions back to recognised names.");
if (!resolver.includes("findCanonicalMorphForComposition")) failures.push("Morph resolver does not map compositions back to recognised names.");
if (!reversal.includes("getCanonicalComposition")) failures.push("Morph reversal does not use canonical composition data.");
if (!reversal.includes("findCanonicalMorphForComposition")) failures.push("Morph reversal does not map compositions back to recognised names.");

const hasGreyFogCombo = combos.includes('name: "Grey Fog"') &&
  combos.includes('aliases: ["Arctic Conda", "Arctic Anaconda"') &&
  combos.includes('morphId: "arctic", type: "Gene", copies: 1') &&
  combos.includes('morphId: "conda", type: "Gene", copies: 1');
if (!hasGreyFogCombo) failures.push("Recognised Grey Fog contract must map Arctic ×1 + Conda ×1 and retain Arctic Conda aliases.");
if (!catalog.includes("combination('Grey Fog', ['Arctic', 'Anaconda'")) failures.push("Grey Fog is not mapped to Arctic + Anaconda in the Hognose reference catalogue.");
if (!combos.includes('inheritance: "Unknown"')) failures.push("Named combinations should not claim a single inheritance mode.");
if (!morphs.includes('geneId: "conda"') || !morphs.includes('"Anaconda"')) failures.push("Conda/Anaconda canonical alias contract is missing.");

if (failures.length) {
  console.error(`Morph intelligence validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Morph intelligence validation passed: canonical identity, composition inference, calculator/reversal wiring, search metadata and Hognose invariants are present.");
