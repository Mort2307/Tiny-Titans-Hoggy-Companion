import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SPECIES_DIR = path.join(ROOT, 'src', 'data', 'species');
const BASELINE_PATH = path.join(SPECIES_DIR, 'speciesIntegrationBaseline.json');
const MANIFEST_PATH = path.join(SPECIES_DIR, 'speciesIntegrationManifest.json');

const REQUIRED_SURFACES = [
  'reminders', 'husbandry', 'weights', 'feeding', 'shedding', 'behaviour', 'health',
  'enclosure-intelligence', 'morph-library', 'genetics-calculator', 'breeding-planner',
  'breeding-academy', 'keeper-handbook', 'behaviour-observatory', 'make-contribution',
  'knowledge-base', 'titans-challenge', 'community-hub', 'mentorship', 'wall-of-titans',
  'account', 'family', 'become-a-titan', 'educator-centre', 'creator-centre',
  'morph-library-editor', 'community-manager', 'mentor-review', 'tester-centre',
];

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.ts') ? [full] : [];
  });
}

function extractSpeciesIds() {
  const ids = new Set();
  const files = walk(SPECIES_DIR).sort();
  const helperNames = new Set();

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\b(?:const|let|function)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*)?\([\s\S]{0,500}?\bid\s*:\s*string\b[\s\S]{0,900}?\)\s*:\s*SnakeSpeciesRecord/g)) {
      helperNames.add(match[1]);
    }
    for (const match of source.matchAll(/^\s*id\s*:\s*['"]([^'"]+)['"]/gm)) {
      ids.add(match[1]);
    }
  }

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const helper of helperNames) {
      const escaped = helper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escaped}\\(\\s*['\"]([^'\"]+)['\"]`, 'g');
      for (const match of source.matchAll(pattern)) ids.add(match[1]);
    }
  }

  return [...ids].sort();
}

function bootstrap(currentIds) {
  const baseline = {
    version: 1,
    generatedOn: new Date().toISOString().slice(0, 10),
    speciesCount: currentIds.length,
    speciesIds: currentIds,
    fingerprint: sha256(currentIds.join('\n')),
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(`Species integration baseline created: ${currentIds.length} species.`);
  console.log(`Committed baseline: ${path.relative(ROOT, BASELINE_PATH)}`);
}

function fail(messages) {
  console.error('\nSPECIES INTEGRATION GATE: FAILED\n');
  for (const message of messages) console.error(`- ${message}`);
  process.exitCode = 1;
}

const currentIds = extractSpeciesIds();
if (currentIds.length === 0) {
  fail(['No species IDs could be extracted from the species registry sources. Refusing to validate an empty registry.']);
  process.exit();
}

if (process.argv.includes('--bootstrap')) {
  bootstrap(currentIds);
  process.exit();
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.warn('\nSPECIES INTEGRATION GATE: BASELINE NOT INITIALISED');
  console.warn(`Run: npm run validate:species-integration -- --bootstrap`);
  console.warn('The baseline is intentionally created once from the current registry, then committed.');
  process.exit();
}

if (!fs.existsSync(MANIFEST_PATH)) {
  fail([`Missing release manifest: ${path.relative(ROOT, MANIFEST_PATH)}`]);
  process.exit();
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const baselineIds = [...new Set(baseline.speciesIds ?? [])].sort();
const baselineFingerprint = sha256(baselineIds.join('\n'));
const currentFingerprint = sha256(currentIds.join('\n'));
const currentSet = new Set(currentIds);
const baselineSet = new Set(baselineIds);
const messages = [];

if (baselineFingerprint !== baseline.fingerprint) {
  messages.push('Baseline fingerprint is internally inconsistent. Regenerate the baseline rather than editing it manually.');
}

const added = currentIds.filter((id) => !baselineSet.has(id));
const removed = baselineIds.filter((id) => !currentSet.has(id));
if (removed.length) messages.push(`Species removed from the registry: ${removed.join(', ')}`);

const released = manifest.fullyIntegratedSpecies ?? {};
for (const [speciesId, entry] of Object.entries(released)) {
  if (!currentSet.has(speciesId)) {
    messages.push(`Release manifest references species not present in registry: ${speciesId}`);
    continue;
  }
  if (entry?.status !== 'fully-integrated') {
    messages.push(`${speciesId} is present in the release manifest but is not marked fully-integrated.`);
  }
  const surfaces = Array.isArray(entry?.surfaces) ? [...new Set(entry.surfaces)].sort() : [];
  const expected = [...REQUIRED_SURFACES].sort();
  if (JSON.stringify(surfaces) !== JSON.stringify(expected)) {
    messages.push(`${speciesId} does not declare the complete ${REQUIRED_SURFACES.length}-surface integration contract.`);
  }
}

for (const speciesId of added) {
  const entry = released[speciesId];
  if (!entry) {
    messages.push(`NEW SPECIES ${speciesId} was added without a full integration release record. Add it to speciesIntegrationManifest.json only after every required surface is implemented and reviewed.`);
    continue;
  }
  if (entry.status !== 'fully-integrated') {
    messages.push(`NEW SPECIES ${speciesId} cannot be released with status ${entry.status}; new species must be fully-integrated.`);
  }
  const surfaces = Array.isArray(entry.surfaces) ? new Set(entry.surfaces) : new Set();
  const missing = REQUIRED_SURFACES.filter((surface) => !surfaces.has(surface));
  if (missing.length) messages.push(`NEW SPECIES ${speciesId} is missing integration surfaces: ${missing.join(', ')}`);
}

console.log(`Species integration audit: ${currentIds.length} current species; baseline ${baselineIds.length}.`);
console.log(`Required integration surfaces: ${REQUIRED_SURFACES.length}.`);
console.log(`Legacy species pending explicit audit: ${currentIds.filter((id) => baselineSet.has(id) && !released[id]).length}.`);
console.log(`Fully integrated release records: ${Object.keys(released).length}.`);

if (currentFingerprint !== baselineFingerprint && added.length === 0 && removed.length === 0) {
  messages.push('Species fingerprint changed without an identifiable add/remove. Investigate the registry extraction or baseline before release.');
}

if (messages.length) fail(messages);
else console.log('SPECIES INTEGRATION GATE: PASS');
