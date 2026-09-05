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

function extractSpeciesIds() {
  const sourceFiles = fs.readdirSync(SPECIES_DIR)
    .filter((name) => name.endsWith('.ts') && !['speciesTypes.ts', 'speciesSources.ts', 'index.ts'].includes(name))
    .map((name) => path.join(SPECIES_DIR, name));
  const declaredSpeciesIds = [];

  // Keep discovery aligned with validate-species-database.mjs. Species records
  // are declared either as direct object records in speciesRegistryBase.ts or
  // through the known modular expansion helpers.
  const helperPattern = /\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g;
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, 'utf8');
    declaredSpeciesIds.push(...[...text.matchAll(helperPattern)].map((m) => m[1]));
    if (path.basename(file) === 'speciesRegistryBase.ts') {
      declaredSpeciesIds.push(...[...text.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]));
    }
  }

  const duplicateIds = declaredSpeciesIds.filter((id, index) => declaredSpeciesIds.indexOf(id) !== index);
  if (duplicateIds.length) throw new Error(`Duplicate species IDs discovered: ${[...new Set(duplicateIds)].join(', ')}`);
  return declaredSpeciesIds.sort();
}

function bootstrap(currentIds, manifest) {
  const existingBaseline = fs.existsSync(BASELINE_PATH)
    ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
    : null;
  const currentManifestCount = Object.keys(manifest.fullyIntegratedSpecies ?? {}).length;
  const previousCount = Number(existingBaseline?.speciesCount ?? 0);
  const previousManifestCount = Number(existingBaseline?.releaseManifestCount ?? 0);
  const delta = Math.max(0, currentIds.length - previousCount);

  if (existingBaseline && delta > 0 && currentManifestCount < previousManifestCount + delta) {
    console.error('\nSPECIES INTEGRATION BOOTSTRAP: BLOCKED\n');
    console.error(`- Registry grew by ${delta} species.`);
    console.error(`- At least ${previousManifestCount + delta} fully integrated release record(s) are required before the baseline can be advanced.`);
    console.error('- Complete the new species integration manifest first; do not bypass the release gate by refreshing the baseline.');
    process.exitCode = 1;
    return;
  }

  const baseline = {
    version: 1,
    generatedOn: new Date().toISOString().slice(0, 10),
    speciesCount: currentIds.length,
    speciesIds: currentIds,
    fingerprint: sha256(currentIds.join('\n')),
    releaseManifestCount: currentManifestCount,
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(`Species integration baseline created: ${currentIds.length} species.`);
  console.log(`Fully integrated release records captured: ${currentManifestCount}.`);
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

if (!fs.existsSync(MANIFEST_PATH)) {
  fail([`Missing release manifest: ${path.relative(ROOT, MANIFEST_PATH)}`]);
  process.exit();
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const released = manifest.fullyIntegratedSpecies ?? {};

if (process.argv.includes('--bootstrap')) {
  bootstrap(currentIds, manifest);
  process.exit();
}

if (!fs.existsSync(BASELINE_PATH)) {
  fail([
    `Missing integration baseline: ${path.relative(ROOT, BASELINE_PATH)}`,
    'Create the initial baseline with npm run validate:species-integration -- --bootstrap.',
  ]);
  process.exit();
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const baselineIds = Array.isArray(baseline.speciesIds) ? [...new Set(baseline.speciesIds)].sort() : [];
const baselineFingerprint = baselineIds.length ? sha256(baselineIds.join('\n')) : null;
const currentFingerprint = sha256(currentIds.join('\n'));
const currentSet = new Set(currentIds);
const baselineSet = new Set(baselineIds);
const messages = [];

if (baselineIds.length > 0) {
  if (baselineFingerprint !== baseline.fingerprint) {
    messages.push('Baseline fingerprint is internally inconsistent. Regenerate the baseline rather than editing it manually.');
  }

  const added = currentIds.filter((id) => !baselineSet.has(id));
  const removed = baselineIds.filter((id) => !currentSet.has(id));
  if (removed.length) messages.push(`Species removed from the registry: ${removed.join(', ')}`);
  for (const speciesId of added) {
    const entry = released[speciesId];
    if (!entry) {
      messages.push(`NEW SPECIES ${speciesId} was added without a full integration release record. Complete all ${REQUIRED_SURFACES.length} surfaces before advancing the baseline.`);
      continue;
    }
    if (entry.status !== 'fully-integrated') {
      messages.push(`NEW SPECIES ${speciesId} cannot be released with status ${entry.status}; new species must be fully-integrated.`);
    }
    const surfaces = Array.isArray(entry.surfaces) ? new Set(entry.surfaces) : new Set();
    const missing = REQUIRED_SURFACES.filter((surface) => !surfaces.has(surface));
    if (missing.length) messages.push(`NEW SPECIES ${speciesId} is missing integration surfaces: ${missing.join(', ')}`);
  }

  if (currentIds.length !== baseline.speciesCount || added.length || removed.length) {
    messages.push(`Species registry changed from baseline ${baseline.speciesCount} to ${currentIds.length}. Run the bootstrap command only after all newly added species have fully integrated release records.`);
  }

  if (currentFingerprint !== baselineFingerprint && added.length === 0 && removed.length === 0) {
    messages.push('Species fingerprint changed without an identifiable add/remove. Investigate the registry extraction or baseline before release.');
  }
} else {
  if (currentIds.length !== Number(baseline.speciesCount)) {
    messages.push(`Species registry count changed from baseline ${baseline.speciesCount} to ${currentIds.length}. An exact ID baseline must be generated before release.`);
  }
}

for (const [speciesId, entry] of Object.entries(released)) {
  if (!currentSet.has(speciesId)) {
    messages.push(`Release manifest references species not present in registry: ${speciesId}`);
    continue;
  }
  if (entry?.status !== 'fully-integrated') {
    messages.push(`${speciesId} is present in the release manifest but is not marked fully-integrated.`);
  }
  const surfaces = Array.isArray(entry.surfaces) ? [...new Set(entry.surfaces)].sort() : [];
  const expected = [...REQUIRED_SURFACES].sort();
  if (JSON.stringify(surfaces) !== JSON.stringify(expected)) {
    messages.push(`${speciesId} does not declare the complete ${REQUIRED_SURFACES.length}-surface integration contract.`);
  }
}

const baselineKnownIds = baselineIds.length ? baselineSet : currentSet;
console.log(`Species integration audit: ${currentIds.length} current species; baseline ${baseline.speciesCount}.`);
console.log(`Required integration surfaces: ${REQUIRED_SURFACES.length}.`);
console.log(`Legacy species pending explicit audit: ${currentIds.filter((id) => baselineKnownIds.has(id) && !released[id]).length}.`);
console.log(`Fully integrated release records: ${Object.keys(released).length}.`);

if (messages.length) fail(messages);
else console.log('SPECIES INTEGRATION GATE: PASS');
