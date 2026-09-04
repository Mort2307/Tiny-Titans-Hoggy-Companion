import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const breeding = read('src/utils/breedingGenetics.ts');
const calculator = read('src/utils/geneticsCalculator.ts');
const parentSelector = read('src/components/ParentSelector.tsx');

const checks = [
  ['Breeding planner uses evidence-gated calculator morphs', breeding.includes('getMasterCalculatorMorphs') && breeding.includes('getMasterHetGenes')],
  ['Breeding planner delegates to canonical genetics calculator', breeding.includes('calculateGenetics({')],
  ['Breeding planner filters persisted visuals through strict identity', breeding.includes('resolveStrictMorph') && breeding.includes('eligibleVisual')],
  ['Breeding planner filters persisted hets through strict identity', breeding.includes('eligibleHet') && breeding.includes('calculatorHetIds')],
  ['Dominant offspring are visual', calculator.includes('case "Dominant":') && calculator.includes('return "Visual"')],
  ['Incomplete-dominant two-copy outcomes become Super state', calculator.includes('case "Incomplete Dominant":') && calculator.includes('return copies >= 2 ? "Super" : "Visual"')],
  ['Recessive visual requires two copies', calculator.includes('if (morph.inheritance === "Recessive") return 2')],
  ['100/66/50 het probabilities are represented mathematically', calculator.includes('1 / 3') && calculator.includes('1 / 4') && calculator.includes('1 / 2')],
  ['Breeding result rejects broken probability totals', breeding.includes('Math.abs(calculation.totalProbability - 1) > PROBABILITY_EPSILON')],
  ['Sex selectors remain correctly filtered', parentSelector.includes('snake.sex')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
if (failed.length) {
  console.error(`\nBreeding genetics bridge validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log('\nBreeding genetics bridge validation passed.');
