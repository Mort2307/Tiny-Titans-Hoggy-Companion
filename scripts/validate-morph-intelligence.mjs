import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const morphs = read("src/data/morphs.ts");
const combos = read("src/data/geneticsComboRegistry.ts");
const catalog = read("src/data/hognoseMorphCatalog.ts");
const intelligence = read("src/data/morphIntelligence.ts");
const master = read("src/data/masterMorphDatabase.ts");
const library = read("src/pages/MorphLibrary.tsx");

const failures = [];

for (const required of [
  "geneticSignature",
  "geneticFormula",
  "recognisedNames",
  "searchTerms",
  "evidenceLevel",
  "compositionStatus",
  "unresolvedComponents",
  "inferNameComponents",
  "compositionForEntry",
]) {
  if (!intelligence.includes(required)) failures.push(`Morph intelligence is missing ${required}.`);
}

if (!catalog.includes("combination('Grey Fog', ['Arctic', 'Anaconda'")) failures.push("Grey Fog is not mapped to Arctic + Anaconda in the Hognose reference catalogue.");
if (!combos.includes('name: "Grey Fog"') && !combos.includes('name: \'Grey Fog\'')) failures.push("Grey Fog is missing from the recognised combination registry.");
if (!combos.includes('inheritance: "Unknown"')) failures.push("Named calculator combinations should not claim a single inheritance mode.");
if (!master.includes("enrichMorphDatabase")) failures.push("Master morph database is not wired to morph intelligence enrichment.");
if (!master.includes("searchTerms")) failures.push("Master morph resolver is missing intelligent search terms.");
if (!library.includes("typed.geneticFormula")) failures.push("Morph Library does not surface canonical genetic formulas.");
if (!library.includes("typed.recognisedNames")) failures.push("Morph Library does not surface recognised combination names.");
if (!library.includes("typed.searchTerms")) failures.push("Morph Library search does not consume intelligence search terms.");
if (morphs.includes('Grey Fog') && !morphs.includes('InheritanceType')) failures.push("Canonical morph type definitions could not be inspected.");

if (failures.length) {
  console.error(`Morph intelligence validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Morph intelligence validation passed: canonical composition, safe name inference, evidence/search metadata, Grey Fog mapping and Morph Library integration are present.");
