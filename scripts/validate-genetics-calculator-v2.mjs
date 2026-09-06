import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const calculator = read("src/pages/Calculator.tsx");
const app = read("src/App.tsx");
const selector = read("src/components/ParentSelector.tsx");
const legacyEngine = read("src/utils/geneticsCalculator.ts");
const v3Engine = read("src/utils/geneticsEngineV3.ts");
const v3Safety = read("src/utils/geneticsEngineV3Safety.ts");
const speciesAdapter = read("src/utils/speciesGeneticsCalculator.ts");
const reversal = read("src/utils/geneticsReversal.ts");
const comboRegistry = read("src/data/geneticsComboRegistry.ts");
const comboActivation = read("src/data/expandGeneticsComboRegistry.ts");
const reversalPanel = read("src/components/MorphReversalPanel.tsx");
const reversalCss = read("src/components/MorphReversalTheme.css");
const resultCard = read("src/components/ResultCard.tsx");
const geneticsTypes = read("src/types/genetics.ts");
const morphDatabase = read("src/data/morphs.ts");

function matchesNamedCombination(source, geneId, expectedSignature) {
  const match = source.match(new RegExp(`geneId:\\s*"${geneId}"[\\s\\S]*?components:\\s*\\[([\\s\\S]*?)\\]`, "m"));
  if (!match) return false;
  const components = [...match[1].matchAll(/\{\s*morphId:\s*"([^"]+)"\s*,\s*type:\s*"Gene"\s*,\s*copies:\s*(\d+)\s*\}/g)].map((component) => `${component[1]}:${component[2]}`);
  return components.join("|") === expectedSignature;
}

function getCoreGeneBlock(source, geneId) {
  return source.match(new RegExp(`geneId:\\s*"${geneId}"[\\s\\S]*?(?=\\n\\s*\\{\\n\\s*geneId:|\\n\\s*// ={20,})`, "m"))?.[0] ?? "";
}

const sableBlock = getCoreGeneBlock(morphDatabase, "sable");
const arcticBlock = getCoreGeneBlock(morphDatabase, "arctic");
const condaBlock = getCoreGeneBlock(morphDatabase, "conda");

const checks = [
  ["Calculator mode switch", calculator.includes("Morph Reversal") && calculator.includes("switchMode")],
  ["Reversal panel wired", calculator.includes("<MorphReversalPanel morphs={allMorphs} />")],
  ["Canonical output presentation", resultCard.includes("getCanonicalOffspringPresentation")],
  ["Calculator uses named combo registry", calculator.includes("calculatorNamedCombinations")],
  ["Named combinations activated at runtime", app.includes('import "./data/expandGeneticsComboRegistry";') && comboActivation.includes("morphs.push(combination)")],
  ["Female saved snakes are sex-filtered", selector.includes('snakes.filter((snake) => String(snake.sex).trim().toLowerCase() === sex.toLowerCase())')],
  ["Correct-sex query preload", calculator.includes('snake.id === requestedFemaleId && snake.sex === "Female"') && calculator.includes('snake.id === requestedMaleId && snake.sex === "Male"')],
  ["Authoritative V3 calculator", calculator.includes("calculateSpeciesGeneticsForSpecies") && speciesAdapter.includes("calculateGeneticsV3Safe")],
  ["Legacy engine retained only for compatibility", legacyEngine.includes("export function calculateGenetics") && v3Engine.includes("calculateGeneticsV3")],
  ["V3 reversal compatibility", reversal.includes("export function reverseMorph")],
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
  ["Dedicated reversal theme", reversalCss.includes(".morph-reversal-panel") && reversalCss.includes("var(--accent)" )],
  ["Build gate", read("package.json").includes("validate:genetics-calculator-v2")],

  // Genetics correctness contracts now target V3 rather than implementation-specific V2 helpers.
  ["Sable remains explicitly recessive", sableBlock.includes('inheritance: "Recessive"') && sableBlock.includes("hetPossible: true")],
  ["Arctic is explicitly incomplete dominant", arcticBlock.includes('inheritance: "Incomplete Dominant"') && arcticBlock.includes("hetPossible: false")],
  ["Conda is explicitly incomplete dominant", condaBlock.includes('inheritance: "Incomplete Dominant"') && condaBlock.includes("hetPossible: false")],
  ["Visual recessives normalise to two copies", v3Safety.includes('morph.inheritance === "Recessive"') && v3Safety.includes("known[geneId] = 2")],
  ["Dominant phenotype is one-copy visual and never a het", v3Engine.includes('if (morph.inheritance === "Dominant") return copies >= 1 ? { visual: morph.geneId } : {}')],
  ["Unknown dominant/ID zygosity is bounded, never assigned a prior", v3Engine.includes('copies: "unknown"') && v3Engine.includes('certainty: "bounded"') && !v3Engine.includes("0.5, 0.5")],
  ["100/66/50 het confidence is genotype uncertainty", v3Engine.includes('value === "100%" ? 1 : value === "66%" ? 2 / 3 : 0.5') && v3Engine.includes("genotypeScenarios")],
  ["Calculator preserves het percentages", calculator.includes("hetPercentages") && geneticsTypes.includes("hetPercentages?: Record<string, HetPercentage>")],
  ["Exact outcomes do not invent possible hets", legacyEngine.includes("function getPossibleHetComponents") && /function getPossibleHetComponents[\s\S]*?return \[\];/.test(legacyEngine)],
  ["Breeding summary supports non-fixed probabilities", geneticsTypes.includes("export type GeneticHetPercentage = number")],
  ["No obsolete mutation-probability helper remains", !legacyEngine.includes("function getMutationAlleleProbability")],
  ["Stored animal copy evidence reaches the calculator", selector.includes("profile.genes") && selector.includes("knownGeneCopies") && calculator.includes("knownGeneCopies: selection.knownGeneCopies")],
];

for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`\nGenetics calculator validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nGenetics calculator validation passed on the V3 authoritative engine.");