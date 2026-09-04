import fs from 'node:fs';
import path from 'node:path';

const speciesDir = path.resolve('src/data/species');
const files = fs.readdirSync(speciesDir)
  .filter((name) => name.endsWith('.ts') && !['speciesTypes.ts', 'speciesSources.ts', 'index.ts'].includes(name))
  .map((name) => path.join(speciesDir, name));
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const ids = [...source.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);

if (ids.length === 0) throw new Error('Species data contains no species records.');
const errors = [];

for (const id of ids) {
  const start = source.indexOf(`id: '${id}'`);
  const next = source.indexOf("\n  },", start);
  const block = source.slice(start, next === -1 ? source.length : next);
  if (!block.includes('sourceIds:')) errors.push(`${id}: missing sourceIds.`);
  if (!/reviewedOn\b/.test(block)) errors.push(`${id}: missing reviewedOn.`);
  if (block.includes("riskClass: 'venomous'") && !block.includes('handlingNotes:')) errors.push(`${id}: venomous species is missing safety handlingNotes.`);
  if (block.includes("riskClass: 'high-risk'") && !block.includes('handlingNotes:')) errors.push(`${id}: high-risk species is missing safety handlingNotes.`);
  if (block.includes('husbandry:') && !block.includes('feeding:')) errors.push(`${id}: husbandry profile is missing feeding context.`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

const husbandryCount = (source.match(/husbandry:/g) ?? []).length;
console.log(`Species husbandry integrity OK: ${ids.length} species declarations checked; ${husbandryCount} include explicit husbandry profiles.`);
console.log('Taxonomy-only species are valid when source-backed taxonomy exists but keeper husbandry evidence is not yet strong enough.');
