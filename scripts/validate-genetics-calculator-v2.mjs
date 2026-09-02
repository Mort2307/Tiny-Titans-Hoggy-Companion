import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const calculator = read("src/pages/Calculator.tsx");
const selector = read("src/components/ParentSelector.tsx");
const reversal = read("src/utils/geneticsReversal.ts");
const comboRegistry = read("src/data/geneticsComboRegistry.ts");

const checks = [
  ["Calculator mode switch", calculator.includes("Morph Reversal") && calculator.includes("switchMode")],
  ["Reversal panel wired", calculator.includes("<MorphReversalPanel morphs={allMorphs} />")],
  ["Canonical output presentation", read("src/components/ResultCard.tsx").includes("getCanonicalOffspringPresentation")],
  ["Calculator uses named combo registry", calculator.includes("calculatorNamedCombinations")],
  ["Female saved snakes are sex-filtered", selector.includes('snakes.filter((snake) => snake.sex === sex)')],
  ["Correct-sex query preload", calculator.includes('snake.id === requestedFemaleId && snake.sex === "Female"') && calculator.includes('snake.id === requestedMaleId && snake.sex === "Male"')],
  ["Reversal engine", reversal.includes("export function reverseMorph")],
  ["Reversal panel resolver", read("src/components/MorphReversalPanel.tsx").includes("reverseMorph")],
  ["Reversal avoids fake non-Mendelian probabilities", reversal.includes("supportsMendelianRoutes") && reversal.includes("return []")],
  ["Named combo registry", comboRegistry.includes("calculatorNamedCombinations")],
  ["Bub's Daddy signature", comboRegistry.includes('geneId: "bubs-daddy"') && comboRegistry.includes('copies: 2 },\n      { morphId: "arctic", type: "Gene", copies: 2 }')],
  ["Super Daddy signature", comboRegistry.includes('geneId: "super-daddy"') && comboRegistry.includes('copies: 2 },\n      { morphId: "arctic", type: "Gene", copies: 2 },\n      { morphId: "conda", type: "Gene", copies: 2 }')],
  ["Super Arctic Super Conda distinct from Super Daddy", comboRegistry.includes('geneId: "super-arctic-super-conda"') && comboRegistry.includes("it is not Super Daddy without Albino")],
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
