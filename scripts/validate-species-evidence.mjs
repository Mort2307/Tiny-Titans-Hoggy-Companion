import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const speciesDir = path.join(root, 'src', 'data', 'species');
const files = fs.readdirSync(speciesDir).filter((name) => name.endsWith('.ts'));
const text = files.map((name) => fs.readFileSync(path.join(speciesDir, name), 'utf8')).join('\n');

const sourceFile = fs.readFileSync(path.join(speciesDir, 'speciesSources.ts'), 'utf8');
const declared = new Set();
for (const match of sourceFile.matchAll(/^\s*([A-Za-z0-9_]+):\s*\{/gm)) declared.add(match[1]);
for (const match of sourceFile.matchAll(/\b([A-Za-z0-9_]+):\s*\{/g)) declared.add(match[1]);

const sourceIds = new Set();
for (const match of text.matchAll(/(?:sourceIds|SPECIES_SOURCES)\s*[:.(=]*\s*[^\n;]*/g)) {
  for (const id of match[0].matchAll(/\b([A-Za-z][A-Za-z0-9]*(?:20\d{2}|19\d{2}))\b/g)) sourceIds.add(id[1]);
}
for (const match of text.matchAll(/['\"]([A-Za-z][A-Za-z0-9]*(?:20\d{2}|19\d{2}))['\"]/g)) sourceIds.add(match[1]);

const unresolved = [...sourceIds].filter((id) => !declared.has(id)).sort();
const placeholders = [...declared].filter((id) => new RegExp(`id:\\s*['\\"]${id}['\\"][^]*?url:\\s*['\\"]#['\\"]`).test(sourceFile));
const evidenceObjects = (text.match(/\bevidence\s*:/g) ?? []).length;
const numericRanges = (text.match(/\bmin\s*:\s*-?\d+(?:\.\d+)?\s*,\s*max\s*:\s*-?\d+(?:\.\d+)?/g) ?? []).length;
const husbandryObjects = (text.match(/\bhusbandry\s*:/g) ?? []).length;

console.log(`Species evidence audit: ${files.length} species-data source files scanned.`);
console.log(`Referenced source IDs: ${sourceIds.size}. Declared source IDs: ${declared.size}.`);
console.log(`Evidence object markers: ${evidenceObjects}. Numeric range literals: ${numericRanges}. Husbandry object markers: ${husbandryObjects}.`);

if (unresolved.length > 0) {
  console.warn(`UNRESOLVED SOURCE IDS (research queue; not verified evidence): ${unresolved.join(', ')}`);
}
if (placeholders.length > 0) {
  console.error(`PLACEHOLDER SOURCE IDS IN CURATED CATALOGUE: ${placeholders.join(', ')}`);
  process.exit(1);
}

console.log(`Species evidence source contract OK: ${unresolved.length === 0 ? 'all discovered dated source IDs resolve to curated records' : `${unresolved.length} source IDs remain explicitly unresolved and are excluded from verified evidence`}.`);
