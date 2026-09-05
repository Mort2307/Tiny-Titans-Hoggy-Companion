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

// Species are declared either as direct object records (the original registry)
// or through expansion helpers (including venomous species). Do not scan every
// `id:` field because expansion modules also contain source-citation IDs.
const declaredSpeciesIds = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const helperIds = [...text.matchAll(/\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g)].map((m) => m[1]);
  declaredSpeciesIds.push(...helperIds);

  // The base registry uses literal `{ id: '...' }` records; source-citation
  // registries are excluded from this branch because they are not species data.
  if (path.basename(file) === 'speciesRegistryBase.ts') {
    declaredSpeciesIds.push(...[...text.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]));
  }
}

const duplicateIds = declaredSpeciesIds.filter((id, index) => declaredSpeciesIds.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate species IDs: ${[...new Set(duplicateIds)].join(', ')}`);
if (!declaredSpeciesIds.length) throw new Error('No species records were discovered in the modular species registry.');

for (const required of ['acceptedScientificName', 'commonNames', 'searchAliases', 'family', 'genus', 'speciesEpithet', 'taxonStatus', 'taxonSource', 'knowledge']) {
  if (!sourceText.includes(`${required}:`)) throw new Error(`Species data is missing required field pattern: ${required}`);
}

if (!sourceText.includes('sourceIds:')) throw new Error('Species data must carry source provenance.');
if (!/reviewedOn\b/.test(sourceText)) throw new Error('Species data must carry review dates.');
if (!speciesTypes) throw new Error('Species type model did not load.');

console.log(`Species database contract OK: ${declaredSpeciesIds.length} declared species records across modular sources.`);
console.log('Policy: do not publish species-specific husbandry values without explicit source provenance.');
console.log('Policy: unsupported species may be represented in the taxonomy layer before keeper-facing husbandry is enabled.');
