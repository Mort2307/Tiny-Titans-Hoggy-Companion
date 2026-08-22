import fs from 'node:fs';

const catalogPath = 'src/data/hognoseMorphCatalog.ts';
const auditPath = 'src/data/morphSourceAudit.ts';
const masterPath = 'src/data/masterMorphDatabase.ts';

const catalog = fs.readFileSync(catalogPath, 'utf8');
const audit = fs.readFileSync(auditPath, 'utf8');
const master = fs.readFileSync(masterPath, 'utf8');

const requiredTerms = [
  'Albino', 'Axanthic', 'Lavender', 'Arctic', 'Anaconda', 'Superconda',
  'Caramel', 'Cinnamon', 'Evan\'s Hypo', 'Dutch Hypo', 'True Hypo',
  'Sable', 'Swiss Chocolate', 'Pistachio', 'Extreme Red', 'Purple Line',
  'RBE Pastel', 'Toffeebelly', 'Antarctic', 'Woma', 'Shadow', 'Skullface',
];

const failures = [];
for (const term of requiredTerms) {
  if (!catalog.includes(`gene('${term}'`) && !catalog.includes(`gene("${term}"`) && !catalog.includes(`gene(\'${term}\'`)) {
    failures.push(`Reference catalogue is missing: ${term}`);
  }
  if (!audit.includes(`name: '${term}'`) && !audit.includes(`name: "${term}"`) && !audit.includes(`name: '${term.replace("'", "\\'")}'`)) {
    failures.push(`Evidence audit is missing: ${term}`);
  }
}

if (!/gene\('Cinnamon',\s*'Dominant'/.test(catalog)) failures.push('Cinnamon must be represented as Dominant in the external reference catalogue.');
if (!/status:\s*'debated'/.test(audit)) failures.push('Evidence audit must contain debated/controversial terminology.');
if (!/MorphReferenceEntry/.test(catalog)) failures.push('Reference catalogue type contract is missing.');
if (!/masterMorphs/.test(master)) failures.push('Master morph database contract is missing.');

const auditNames = [...audit.matchAll(/name:\s*['"]([^'"]+)['"]/g)].map((match) => match[1].toLowerCase());
const duplicates = auditNames.filter((name, index) => auditNames.indexOf(name) !== index);
if (duplicates.length) failures.push(`Duplicate evidence-audit names: ${[...new Set(duplicates)].join(', ')}`);

if (failures.length) {
  console.error('MORPH SOURCE AUDIT FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Morph source audit passed: ${auditNames.length} evidence entries checked; required core terminology present; Cinnamon classification verified.`);
