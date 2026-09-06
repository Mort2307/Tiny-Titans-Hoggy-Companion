import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const breeding = read('src/utils/breedingGenetics.ts');
const model = read('src/genetics/geneticsModel.ts');
const engine = read('src/genetics/geneticsEngine.ts');
const adapter = read('src/genetics/geneticsSnakeAdapter.ts');
const parentSelector = read('src/components/ParentSelector.tsx');

const checks = [
  ['Breeding planner uses canonical Snake genome adapter', breeding.includes('buildSnakeGenome') && breeding.includes('canonicalSpecies')],
  ['Breeding planner delegates to canonical locus engine', breeding.includes('calculateCanonicalBreeding') && breeding.includes('GENETICS_DATABASE')],
  ['Canonical engine is species-aware', model.includes('Cross-species genetics are not supported') && engine.includes('calculateGenome')],
  ['Persisted 50%/66% hets are not fabricated as exact genotypes', adapter.includes('probability-bearing uncertainty')],
  ['Supported super states are evidence-gated', model.includes('locus.superStatus === "supported"') && model.includes('superAlleleId')],
  ['Recessive states require two mutant copies', model.includes('paternal.isWildType || maternal.isWildType ? "heterozygous" : "visual"')],
  ['Allelic states distinguish mixed alleles from ordinary visual states', model.includes('GeneticPhenotypeStatus =') && model.includes('mixed_allelic') && model.includes('locus.inheritance === "allelic"')],
  ['One-parent loci are completed with wild type', model.includes('wildState(locus)') && model.includes('a ?? wildState(locus)') && model.includes('b ?? wildState(locus)')],
  ['Canonical result has a probability integrity guard', breeding.includes('Math.abs(adapted.totalProbability - 1)') && breeding.includes('Canonical breeding forecast failed')],
  ['Legacy bridge is explicitly labelled', breeding.includes('legacy-evidence-gated-bridge')],
  ['Sex selectors remain correctly filtered', parentSelector.includes('snake.sex')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
if (failed.length) {
  console.error(`\nBreeding genetics bridge validation failed: ${failed.length} contract(s).`);
  process.exit(1);
}
console.log('\nBreeding genetics bridge validation passed.');
