import fs from 'node:fs';
import path from 'node:path';

const speciesDir = path.resolve('src/data/species');
const files = fs.readdirSync(speciesDir)
  .filter((name) => name.endsWith('.ts') && !['speciesTypes.ts', 'speciesSources.ts', 'index.ts'].includes(name))
  .map((name) => path.join(speciesDir, name));
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const ids = [...source.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);

if (ids.length === 0) throw new Error('Species data contains no explicit species declarations.');
const errors = [];

for (const id of ids) {
  const start = source.indexOf(`id: '${id}'`);
  const next = source.indexOf("\n  },", start);
  const block = source.slice(start, next === -1 ? source.length : next);
  if (!source.includes('sourceIds:')) errors.push(`${id}: species data has no source provenance.`);
  if (!source.match(/reviewedOn\b/)) errors.push(`${id}: species data has no review date.`);
  if (block.includes("riskClass: 'venomous'") && !block.includes('handlingNotes:')) errors.push(`${id}: venomous species is missing safety handlingNotes.`);
  if (block.includes("riskClass: 'high-risk'") && !block.includes('handlingNotes:')) errors.push(`${id}: high-risk species is missing safety handlingNotes.`);
}

const speciesWithHusbandry = (source.match(/husbandry:/g) ?? []).length;
const speciesWithSources = (source.match(/sourceIds:/g) ?? []).length;
if (speciesWithSources < ids.length) errors.push(`Source provenance declarations (${speciesWithSources}) are fewer than species declarations (${ids.length}).`);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Species husbandry integrity OK: ${ids.length} species declarations scanned; ${speciesWithHusbandry} contain keeper-facing husbandry profiles and the remainder may remain taxonomy-first.`);
