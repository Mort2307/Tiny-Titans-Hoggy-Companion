import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const calculator = read("src/pages/Calculator.tsx");
const selector = read("src/components/ParentSelector.tsx");
const forecast = read("src/genetics/geneticsForecast.ts");
const model = read("src/genetics/geneticsModel.ts");
const snakeTypes = read("src/types/Snake.ts");
const geneticsTypes = read("src/types/genetics.ts");
const resultCard = read("src/components/ResultCard.tsx");
const bridge = read("src/utils/speciesGeneticsCalculator.ts");

const checks = [
  ["Live calculator uses authoritative forecast", calculator.includes("calculateSpeciesGeneticsForecast") && !calculator.includes("calculateSpeciesGenetics({")],
  ["Forecast is locus-based", forecast.includes("calculateLocus") && forecast.includes("GENETICS_DATABASE")],
  ["Unknown dominant zygosity is conditional", forecast.includes('knownCopy === 1') && forecast.includes('knownCopy === 2') && forecast.includes('unknown: true')],
  ["No arbitrary dominant 50/50 prior", forecast.includes('label: `${allele.name}: 1 copy`') && forecast.includes('label: `${allele.name}: 2 copies`') && !forecast.includes("weight: 0.5")],
  ["66% het uses two-thirds carrier probability", forecast.includes('value === "66%"') && forecast.includes("2 / 3")],
  ["50% het uses half carrier probability", forecast.includes('value === "50%"') && forecast.includes("return 0.5")],
  ["Recessive visual is treated as two copies", forecast.includes('locus.inheritance === "recessive" || knownCopy === 2')],
  ["Known copy numbers flow from parent selection", selector.includes("knownGeneCopies") && calculator.includes("knownGeneCopies: selection.knownGeneCopies")],
  ["Saved snake genetics profile is consumed", selector.includes("snake.geneticsProfile")],
  ["Structured animal genetics schema exists", snakeTypes.includes("export type AnimalGeneticsProfile") && snakeTypes.includes("GeneticConfidence")],
  ["Bounded results have an explicit range", geneticsTypes.includes("probabilityRange?: { min: number; max: number }") && forecast.includes("probabilityRange")],
  ["Result card never calls toFixed on undefined", resultCard.includes("result.percentage === undefined") && !resultCard.includes("result.percentage.toFixed")],
  ["Result card explains conditional outcomes", resultCard.includes("Conditional result") && resultCard.includes("genotypeScenarioLabels")],
  ["Species legacy bridge delegates to forecast", bridge.includes("calculateSpeciesGeneticsForecast")],
  ["Core model conserves locus probabilities", model.includes("existing.probability += 0.25")],
  ["Cross-species safety remains enforced", model.includes("Cross-species genetics are not supported")],
  ["Master Record calculator deep-link preserves context", calculator.includes('searchParams.get("snakeId")') && calculator.includes('`/snakes/${requestedSnake.id}/master-record`') && calculator.includes("requestedSnake ? `← Back to ${requestedSnake.name} Master Record` : \"← Back to Breeding Planner\"" )],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
if (failed.length) {
  console.error(`\nAuthoritative genetics validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log("\nAuthoritative genetics calculator validation passed.");
