import fs from 'node:fs';
import path from 'node:path';

const speciesDir = path.resolve('src/data/species');
const excluded = new Set(['speciesTypes.ts', 'speciesSources.ts', 'index.ts']);
const files = fs.readdirSync(speciesDir)
  .filter((name) => name.endsWith('.ts') && !excluded.has(name))
  .map((name) => path.join(speciesDir, name));

const declarations = [];
const errors = [];

for (const file of files) {
  const fileName = path.basename(file);
  const source = fs.readFileSync(file, 'utf8');
  const helperIds = [...source.matchAll(/\b(?:p|taxonomyOnly|cared|record)\(\s*'([^']+)'/g)].map((match) => match[1]);
  const directIds = fileName === 'speciesRegistryBase.ts'
    ? [...source.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1])
    : [];
  const ids = [...new Set([...helperIds, ...directIds])];

  if (!ids.length) continue;

  declarations.push(...ids.map((id) => ({ id, fileName, source })));

  if (!/\breviewedOn\b/.test(source)) {
    errors.push(`${fileName}: species declarations have no review date.`);
  }

  if (fileName === 'speciesRegistryBase.ts') {
    const sourceIdsCount = (source.match(/\bsourceIds:/g) ?? []).length;
    if (sourceIdsCount < directIds.length) {
      errors.push(`${fileName}: ${sourceIdsCount} sourceIds declarations for ${directIds.length} direct species records.`);
    }
  } else if (helperIds.length && !/\bsourceIds:/.test(source)) {
    errors.push(`${fileName}: helper-generated species do not expose source provenance.`);
  }

  if (/riskClass:\s*'venomous'/.test(source) && !/handlingNotes:/.test(source)) {
    errors.push(`${fileName}: venomous species data is missing safety handlingNotes.`);
  }
  if (/riskClass:\s*'high-risk'/.test(source) && !/handlingNotes:/.test(source)) {
    errors.push(`${fileName}: high-risk species data is missing safety handlingNotes.`);
  }
}

if (!declarations.length) throw new Error('Species data contains no discoverable species declarations.');

const ids = declarations.map(({ id }) => id);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) errors.push(`Duplicate species IDs: ${duplicates.join(', ')}`);

const expectedSpeciesCount = 101;
if (new Set(ids).size !== expectedSpeciesCount) {
  errors.push(`Expected exactly ${expectedSpeciesCount} unique snake species; discovered ${new Set(ids).size}.`);
}

const directHusbandry = declarations.filter(({ fileName }) => fileName === 'speciesRegistryBase.ts').length;
const helperHusbandry = files.reduce((count, file) => {
  const source = fs.readFileSync(file, 'utf8');
  return count + (source.match(/\bp\(/g) ?? []).length + (source.match(/\bcared\(/g) ?? []).length;
}, 0);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Species husbandry integrity OK: ${new Set(ids).size} unique species declarations scanned.`);
console.log(`Keeper-facing husbandry records detected in base/helper pathways: ${directHusbandry + helperHusbandry}.`);
console.log('Policy: taxonomy-first species must not inherit generic husbandry from another taxon.');
console.log('Policy: every modular species pathway must carry source provenance and a review date.');