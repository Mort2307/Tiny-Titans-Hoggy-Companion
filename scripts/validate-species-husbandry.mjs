import fs from 'node:fs';

const path = 'src/data/species/speciesRegistry.ts';
const source = fs.readFileSync(path, 'utf8');
const ids = [...source.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
const required = ['knowledge:', 'husbandry:', 'temperature:', 'humidity:', 'enclosure:', 'feeding:', 'breeding:', 'safety:', 'sourceIds:', 'reviewedOn:'];

if (ids.length === 0) throw new Error('Species registry contains no species records.');
const errors = [];
for (const token of required) {
  const count = (source.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
  if (count < ids.length) errors.push(`${token} appears ${count} times for ${ids.length} species.`);
}

for (const id of ids) {
  const start = source.indexOf(`id: '${id}'`);
  const next = source.indexOf("\n  },", start);
  const block = source.slice(start, next === -1 ? source.length : next);
  if (!block.includes('sourceIds:')) errors.push(`${id}: missing sourceIds.`);
  if (!block.includes('reviewedOn:')) errors.push(`${id}: missing reviewedOn.`);
  if (block.includes("riskClass: 'venomous'") && !block.includes('handlingNotes:')) errors.push(`${id}: venomous species is missing safety handlingNotes.`);
  if (block.includes("riskClass: 'high-risk'") && !block.includes('handlingNotes:')) errors.push(`${id}: high-risk species is missing safety handlingNotes.`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Species husbandry integrity OK: ${ids.length} species, complete welfare sections, sources and review dates present.`);
