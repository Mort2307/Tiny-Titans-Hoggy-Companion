import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const calculator = read("src/pages/Calculator.tsx");
const app = read("src/App.tsx");
const selector = read("src/components/ParentSelector.tsx");
const engine = read("src/utils/geneticsCalculator.ts");
const reversal = read("src/utils/geneticsReversal.ts");
const comboRegistry = read("src/data/geneticsComboRegistry.ts");
const comboActivation = read("src/data/expandGeneticsComboRegistry.ts");
const reversalPanel = read("src/components/MorphReversalPanel.tsx");

const checks = [
  ["Calculator mode switch", calculator.includes("Morph Reversal") && calculator.includes("switchMode")],
  ["Reversal panel wired", calculator.includes("<MorphReversalPanel morphs={allMorphs} />")],
  ["Canonical output presentation", read("src/components/ResultCard.tsx").includes("getCanonicalOffspringPresentation")],
  ["Calculator uses named combo registry", calculator.includes("calculatorNamedCombinations")],
  ["Named combinations are activated at runtime", app.includes('import \"./data/expandGeneticsComboRegistry\";') && comboActivation.includes("morphs.push(combination)")],
  ["Female saved snakes are sex-filtered", selector.includes('snakes.filter((snake) => String(snake.sex).trim().toLowerCase() === sex.toLowerCase())')],
  ["Correct-sex query preload", calculator.includes('snake.id === requestedFemaleId && snake.sex === "Female"') && calculator.includes('snake.id === requestedMaleId && snake.sex === "Male"')],
  ["Calculator engine resolves combinations", engine.includes("function getAllRecognisedCombinations") && engine.includes("getCombinations()") && !engine.includes("return [];\\n}\\n\\nfunction matchesCombination")],
  ["Reversal engine", reversal.includes("export function reverseMorph")],
  ["Reversal panel resolver", reversalPanel.includes("reverseMorph")],
  ["Reversal picker shows complete option set", reversalPanel.includes("return needle ? rankMorphSearch(options, pickerQuery, \"strict\") : options") && !reversalPanel.includes("pickerResults.slice(0, 12)")],
  ["Reversal picker is scrollable", read("src/components/MorphReversalTheme.css").includes(".morph-reversal-suggestions") && read("src/components/MorphReversalTheme.css").includes("max-height: 360px") && read("src/components/MorphReversalTheme.css").includes("overflow-y: auto")],
  ["Dedicated free-type input", reversalPanel.includes('Or free-type a morph name') && reversalPanel.includes('id="morph-reversal-input"')],
  ["Free-type input has clear control", reversalPanel.includes("clearFreeType") && reversalPanel.includes("morph-reversal-free-clear")],
  ["Reversal URL sync does not overwrite local typing", reversalPanel.includes("lastUrlMorphRef") && !reversalPanel.includes('if (!requestedMorph || requestedMorph === query) return;')],
  ["Reversal avoids fake non-Mendelian probabilities", reversal.includes("supportsMendelianRoutes") && reversal.includes("return []")],
  ["Named combo registry", comboRegistry.includes("calculatorNamedCombinations")],
  ["Bub's Daddy signature", comboRegistry.includes('geneId: "bubs-daddy"') && comboRegistry.includes('copies: 2 },\\n      { morphId: "arctic", type: "Gene", copies: 2 }')],
  ["Super Daddy signature", comboRegistry.includes('geneId: "super-daddy"') && comboRegistry.includes('copies: 2 },\\n      { morphId: "arctic", type: "Gene", copies: 2 },\\n      { morphId: "conda", type: "Gene", copies: 2 }')],
  ["Super Arctic Super Conda distinct from Super Daddy", comboRegistry.includes('geneId: "super-arctic-super-conda"') && comboRegistry.includes("it is not Super Daddy without Albino")],
  ["Moonstone Conda signature", comboRegistry.includes('geneId: "moonstone-conda"') && comboRegistry.includes('name: "Moonstone Conda"') && comboRegistry.includes('{ morphId: "arctic", type: "Gene", copies: 2 }') && comboRegistry.includes('{ morphId: "conda", type: "Gene", copies: 1 }') && comboRegistry.includes('{ morphId: "lavender", type: "Gene", copies: 2 }')],
  ["Moonstone Conda alternate name", comboRegistry.includes('"Moonbeam"')],
  ["Grey Fog Lavender signature", comboRegistry.includes('geneId: "grey-fog-lavender"') && comboRegistry.includes('name: "Grey Fog Lavender"') && comboRegistry.includes('{ morphId: "arctic", type: "Gene", copies: 1 }') && comboRegistry.includes('{ morphId: "conda", type: "Gene", copies: 1 }') && comboRegistry.includes('{ morphId: "lavender", type: "Gene", copies: 2 }')],
  ["Dedicated reversal theme", read("src/components/MorphReversalTheme.css").includes(".morph-reversal-panel") && read("src/components/MorphReversalTheme.css").includes("var(--accent)")],
  ["Build gate", read("package.json").includes("validate:genetics-calculator-v2")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
if (failed.length) {
  console.error(`\nGenetics calculator v2 validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nGenetics calculator v2 validation passed.");
