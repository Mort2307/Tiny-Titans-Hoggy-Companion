import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const calculator = read("src/pages/Calculator.tsx");
const expandedLoader = read("src/data/loadExpandedMorphDatabase.ts");
const selector = read("src/components/ParentSelector.tsx");
const engine = read("src/utils/geneticsCalculator.ts");
const reversal = read("src/utils/geneticsReversal.ts");
const comboRegistry = read("src/data/geneticsComboRegistry.ts");
const comboActivation = read("src/data/expandGeneticsComboRegistry.ts");
const reversalPanel = read("src/components/MorphReversalPanel.tsx");
const reversalCss = read("src/components/MorphReversalTheme.css");
const resultCard = read("src/components/ResultCard.tsx");
const geneticsTypes = read("src/types/genetics.ts");
const morphDatabase = read("src/data/morphs.ts");

function normaliseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getNamedCombinationSignature(source, geneId) {
  const match = source.match(
    new RegExp(`geneId:\\s*"${geneId}"[\\s\\S]*?components:\\s*\\[([\\s\\S]*?)\\]`, "m"),
  );
  if (!match) return null;

  const components = [...match[1].matchAll(
    /\{\s*morphId:\s*"([^"]+)"\s*,\s*type:\s*"Gene"\s*,\s*copies:\s*(\d+)\s*\}/g,
  )].map((component) => `${component[1]}:${component[2]}`);

  return components.join("|");
}

function matchesNamedCombination(source, geneId, expectedSignature) {
  return getNamedCombinationSignature(source, geneId) === expectedSignature;
}

function getCoreGeneBlock(source, geneId) {
  const match = source.match(
    new RegExp(`geneId:\\s*"${geneId}"[\\s\\S]*?(?=\\n\\s*\\{\\n\\s*geneId:|\\n\\s*// ={20,})`, "m"),
  );
  return match?.[0] ?? "";
}

const sableBlock = getCoreGeneBlock(morphDatabase, "sable");
const arcticBlock = getCoreGeneBlock(morphDatabase, "arctic");
const condaBlock = getCoreGeneBlock(morphDatabase, "conda");

const checks = [
  ["Calculator mode switch", calculator.includes("Morph Reversal") && calculator.includes("switchMode")],
  ["Reversal panel wired", calculator.includes("<MorphReversalPanel morphs={allMorphs} />")],
  ["Canonical output presentation", resultCard.includes("getCanonicalOffspringPresentation")],
  ["Calculator uses named combo registry", calculator.includes("loadExpandedMorphDatabase") && calculator.includes("expandedRegistryReady") && engine.includes("calculatorNamedCombinations")],
  ["Named combinations are activated lazily at runtime", expandedLoader.includes('import("./expandGeneticsComboRegistry")') && calculator.includes("loadExpandedMorphDatabase()") && comboActivation.includes("morphs.push(combination)")],
  ["Female saved snakes are sex-filtered", selector.includes('snakes.filter((snake) => String(snake.sex).trim().toLowerCase() === sex.toLowerCase())')],
  ["Correct-sex query preload", calculator.includes('snake.id === requestedFemaleId && snake.sex === "Female"') && calculator.includes('snake.id === requestedMaleId && snake.sex === "Male"')],
  ["Calculator engine resolves combinations", engine.includes("function getAllRecognisedCombinations") && engine.includes("getCombinations()") && engine.includes("calculatorNamedCombinations")],
  ["Reversal engine", reversal.includes("export function reverseMorph")],
  ["Reversal panel resolver", reversalPanel.includes("reverseMorph")],
  ["Reversal picker shows complete option set", reversalPanel.includes("return needle ? rankMorphSearch(options, pickerQuery, \"strict\") : options") && !reversalPanel.includes("pickerResults.slice(0, 12)")],
  ["Reversal picker is scrollable", reversalCss.includes(".morph-reversal-suggestions") && reversalCss.includes("max-height: 360px") && reversalCss.includes("overflow-y: auto")],
  ["Dedicated free-type input", reversalPanel.includes('label htmlFor="morph-reversal-input"') && reversalPanel.includes('id="morph-reversal-input"')],
  ["Free-type input is independently editable", reversalPanel.includes("clearStateForEdit") && reversalPanel.includes('onChange={(event) => clearStateForEdit(event.target.value)}')],
  ["Free-type input has clear control", reversalPanel.includes("clearFreeType") && reversalPanel.includes("morph-reversal-free-clear")],
  ["Reversal URL sync does not overwrite local typing", reversalPanel.includes("lastUrlMorphRef") && reversalPanel.includes("clearStateForEdit")],
  ["Reversal avoids fake non-Mendelian probabilities", reversal.includes("supportsMendelianRoutes") && reversal.includes("return []")],
  ["Named combo registry", comboRegistry.includes("calculatorNamedCombinations")],
  ["Bub's Daddy signature", matchesNamedCombination(comboRegistry, "bubs-daddy", "albino:2|arctic:2|conda:1")],
  ["Super Daddy signature", matchesNamedCombination(comboRegistry, "super-daddy", "albino:2|arctic:2|conda:2")],
  ["Super Arctic Super Conda distinct from Super Daddy", comboRegistry.includes('geneId: "super-arctic-super-conda"') && comboRegistry.includes("it is not Super Daddy without Albino")],
  ["Moonstone Conda signature", matchesNamedCombination(comboRegistry, "moonstone-conda", "arctic:2|conda:1|lavender:2") && comboRegistry.includes('name: "Moonstone Conda"')],
  ["Grey Fog Lavender signature", matchesNamedCombination(comboRegistry, "grey-fog-lavender", "arctic:1|conda:1|lavender:2") && comboRegistry.includes('name: "Grey Fog Lavender"')],
  ["Dedicated reversal theme", reversalCss.includes(".morph-reversal-panel") && reversalCss.includes("var(--accent)")],
  ["Build gate", read("package.json").includes("validate:genetics-calculator-v2")],

  // Genetics correctness contracts.
  ["Sable is explicitly recessive", sableBlock.includes('inheritance: "Recessive"') && sableBlock.includes("hetPossible: true")],
  ["Arctic is explicitly incomplete dominant", arcticBlock.includes('inheritance: "Incomplete Dominant"') && arcticBlock.includes("hetPossible: false")],
  ["Conda is explicitly incomplete dominant", condaBlock.includes('inheritance: "Incomplete Dominant"') && condaBlock.includes("hetPossible: false")],
  ["Visual standalone recessives resolve to two copies", engine.includes("const isStandaloneVisualGene") && engine.includes('morph.inheritance === "Recessive"') && engine.includes("return 2")],
  ["Dominant one-copy animals are visual, not het", engine.includes('case "Dominant":') && engine.includes('return "Visual"') && engine.includes("One copy already expresses a dominant trait")],
  ["100/66/50 het confidence affects gamete probability", engine.includes('percentage === "66%"') && engine.includes('percentage === "50%"') && engine.includes("1 / 3") && engine.includes("1 / 4")],
  ["Calculator preserves het percentages", calculator.includes("hetPercentages") && geneticsTypes.includes("hetPercentages?: Record<string, HetPercentage>")],
  ["Exact outcomes do not invent possible hets", engine.includes("Exact Mendelian outcomes have a known genotype") && /function getPossibleHetComponents[\s\S]*?return \[\];/.test(engine)],
  ["Breeding summary supports non-50/66/100 probabilities", geneticsTypes.includes("export type GeneticHetPercentage = number") && engine.includes("percentage: value.percentage")],
  ["No legacy mutation-probability copies shortcut remains", !engine.includes("function getMutationAlleleProbability") && engine.includes("mutationAlleleProbability")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
if (failed.length) {
  console.error(`\nGenetics calculator v2 validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nGenetics calculator v2 validation passed.");
