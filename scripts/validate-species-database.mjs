import fs from 'node:fs';
import path from 'node:path';

const speciesDir = path.resolve('src/data/species');
const speciesTypes = path.join(speciesDir, 'speciesTypes.ts');
const speciesRegistry = path.join(speciesDir, 'speciesRegistry.ts');
const speciesSources = path.join(speciesDir, 'speciesSources.ts');

for (const file of [speciesTypes, speciesRegistry, speciesSources]) {
  if (!fs.existsSync(file)) throw new Error(`Missing species database file: ${file}`);
}

const sourceFiles = fs.readdirSync(speciesDir)
  .filter((name) => name.endsWith('.ts') && !['speciesTypes.ts', 'speciesSources.ts', 'index.ts'].includes(name))
  .map((name) => path.join(speciesDir, name));
const sourceText = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const ids = [...sourceText.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate species IDs: ${[...new Set(duplicateIds)].join(', ')}`);

for (const required of ['acceptedScientificName', 'commonNames', 'searchAliases', 'family', 'genus', 'speciesEpithet', 'taxonStatus', 'taxonSource', 'knowledge']) {
  if (!sourceText.includes(`${required}:`)) throw new Error(`Species data is missing required field pattern: ${required}`);
}

if (!sourceText.includes('sourceIds:')) throw new Error('Species data must carry source provenance.');
if (!/reviewedOn\b/.test(sourceText)) throw new Error('Species data must carry review dates.');
if (!speciesTypes) throw new Error('Species type model did not load.');

console.log(`Species database contract OK: ${ids.length} declared species records across modular sources.`);
console.log('Policy: do not publish species-specific husbandry values without explicit source provenance.');
console.log('Policy: unsupported species may be represented in the taxonomy layer before keeper-facing husbandry is enabled.');
