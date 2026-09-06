import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/data/species');
const registryPath = path.join(root, 'speciesRegistry.ts');
const geneticsPath = path.join(root, 'speciesGenetics.ts');
const coveragePath = path.join(root, 'speciesGeneticsCoverage.ts');
const cataloguePath = path.join(root, 'speciesGeneticsCatalogues.ts');

for (const file of [registryPath, geneticsPath, coveragePath, cataloguePath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing species genetics framework file: ${file}`);
}

const registry = fs.readFileSync(registryPath, 'utf8');
const genetics = fs.readFileSync(geneticsPath, 'utf8');
const coverage = fs.readFileSync(coveragePath, 'utf8');
const catalogue = fs.readFileSync(cataloguePath, 'utf8');

if (!genetics.includes('getSpeciesGeneticsCoverage') || !genetics.includes('getSpeciesGeneticsCoverageSummary')) {
  throw new Error('speciesGenetics.ts is not wired to the shared coverage API.');
}
if (!coverage.includes('getAllSpeciesGeneticsCoverage') || !coverage.includes('getSpeciesGeneticsCoverage')) {
  throw new Error('Species genetics coverage API is incomplete.');
}
if (!coverage.includes('heterodon-nasicus') || !coverage.includes('"mapped"')) {
  throw new Error('Western Hognose mapped coverage contract is missing.');
}
if (!catalogue.includes('"Python regius"')) {
  throw new Error('Python regius is not present in the central species genetics catalogue.');
}
if (!catalogue.includes('"Pantherophis guttatus"')) {
  throw new Error('Corn Snake catalogue is missing from the central species genetics catalogue.');
}

const helperIds = [...registry.matchAll(/\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g)].map((match) => match[1]);
const baseIds = [...registry.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]);
const speciesCount = new Set([...helperIds, ...baseIds]).size;
if (speciesCount < 100) throw new Error(`Expected the expanded snake registry to contain 100+ species; detected ${speciesCount}.`);

console.log(`Species genetics coverage wiring OK: ${speciesCount} registered snake records and a central catalogue.`);
