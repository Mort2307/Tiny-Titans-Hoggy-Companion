import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const speciesDir = path.join(root, 'src', 'data', 'species');
const files = fs.readdirSync(speciesDir).filter((name) => name.endsWith('.ts'));
const text = files.map((name) => fs.readFileSync(path.join(speciesDir, name), 'utf8')).join('\n');

const sourceIds = new Set();
for (const match of text.matchAll(/sourceIds\s*:\s*\[([^\]]+)\]/g)) {
  for (const id of match[1].matchAll(/['\"]([^'\"]+)['\"]/g)) sourceIds.add(id[1]);
}
for (const match of text.matchAll(/SPECIES_SOURCES\.([A-Za-z0-9_]+)/g)) sourceIds.add(match[1]);

const sourceFile = fs.readFileSync(path.join(speciesDir, 'speciesSources.ts'), 'utf8');
const declared = new Set();
for (const match of sourceFile.matchAll(/^\s*([A-Za-z0-9_]+):\s*\{/gm)) declared.add(match[1]);
for (const match of sourceFile.matchAll(/\b([A-Za-z0-9_]+):\s*\{/g)) declared.add(match[1]);
const known = new Set(['reptileDatabase2026']);
for (const id of declared) known.add(id);

const unresolved = [...sourceIds].filter((id) => !known.has(id)).sort();
const husbandryFiles = files.filter((name) => /speciesRegistryBase|speciesExpansion/.test(name));
const taxonomyOnlyCount = (text.match(/taxonomyOnly\(/g) ?? []).length;
const numericRangeCount = (text.match(/min:\s*\d+(?:\.\d+)?\s*,\s*max:\s*\d+/g) ?? []).length;
const explicitEvidenceCount = (text.match(/evidence:\s*(?:\{[^{}]*\}|scope\()/g) ?? []).length;

console.log(`Species evidence audit: ${files.length} species-data source files scanned.`);
console.log(`Referenced source IDs: ${sourceIds.size}. Declared source IDs: ${known.size}.`);
console.log(`Numeric range literals detected: ${numericRangeCount}. Explicit evidence objects detected: ${explicitEvidenceCount}.`);
console.log(`Taxonomy-only constructor occurrences: ${taxonomyOnlyCount}.`);

if (unresolved.length > 0) {
  console.error(`UNRESOLVED SOURCE IDS: ${unresolved.join(', ')}`);
  process.exit(1);
}

console.log('Species evidence source contract OK: every statically referenced source ID resolves in the curated source catalogue.');
console.log(`Evidence mapping files scanned: ${husbandryFiles.length}.`);
