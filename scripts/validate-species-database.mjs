import fs from 'node:fs';
import path from 'node:path';

const speciesTypes = path.resolve('src/data/species/speciesTypes.ts');
const speciesRegistry = path.resolve('src/data/species/speciesRegistry.ts');
const speciesSources = path.resolve('src/data/species/speciesSources.ts');

for (const file of [speciesTypes, speciesRegistry, speciesSources]) {
  if (!fs.existsSync(file)) throw new Error(`Missing species database file: ${file}`);
}

const registryText = fs.readFileSync(speciesRegistry, 'utf8');
const ids = [...registryText.matchAll(/\n\s*id:\s*'([^']+)'/g)].map((m) => m[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate species IDs: ${[...new Set(duplicateIds)].join(', ')}`);

for (const required of ['acceptedScientificName', 'commonNames', 'searchAliases', 'family', 'genus', 'speciesEpithet', 'taxonStatus', 'taxonSource', 'knowledge']) {
  if (!registryText.includes(`${required}:`)) throw new Error(`Species registry is missing required field pattern: ${required}`);
}

if (!registryText.includes('sourceIds:')) throw new Error('Species registry must carry source provenance.');
if (!/reviewedOn\b/.test(registryText)) throw new Error('Species registry must carry review dates.');
if (!speciesTypes) throw new Error('Species type model did not load.');

console.log(`Species database contract OK: ${ids.length} seed species.`);
console.log('Policy: do not publish species-specific husbandry values without explicit source provenance.');
console.log('Policy: unsupported species may be represented in the taxonomy layer before keeper-facing husbandry is enabled.');
