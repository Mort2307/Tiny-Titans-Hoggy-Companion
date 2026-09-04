import fs from 'node:fs';

const master = fs.readFileSync('src/data/masterMorphDatabase.ts', 'utf8');
const audit = fs.readFileSync('src/data/morphSourceAudit.ts', 'utf8');
const sources = fs.readFileSync('src/data/morphEvidenceSources.ts', 'utf8');
const canonical = fs.readFileSync('src/data/morphs.ts', 'utf8');
const catalog = fs.readFileSync('src/data/hognoseMorphCatalog.ts', 'utf8');

const failures = [];

const sourceLabels = [...sources.matchAll(/['"]([^'"]+)['"]:\s*\{/g)].map((match) => match[1]);
const sourceLabelSet = new Set(sourceLabels);
const auditSourceLabels = [...audit.matchAll(/sources:\s*\[([^\]]+)\]/g)]
  .flatMap((match) => [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]));
for (const label of [...new Set(auditSourceLabels)]) {
  if (!sourceLabelSet.has(label)) failures.push(`Evidence source label has no registered link: ${label}`);
}

if (!master.includes('morphSourceAuditByName')) failures.push('Master morph database is not linked to the evidence audit.');
if (!master.includes('resolveMorphEvidenceSources')) failures.push('Master morph database is not linked to the source registry.');
if (!master.includes('getMorphEvidence')) failures.push('Master morph evidence accessor is missing.');
if (!master.includes('evidenceStatus === "confirmed"')) failures.push('Calculator eligibility is not evidence-gated.');
if (!canonical.includes('name: "Cinnamon"') && !canonical.includes("name: 'Cinnamon'")) failures.push('Canonical Cinnamon record is missing.');
if (/name:\s*["']Cinnamon["'][\s\S]{0,500}?inheritance:\s*["']Recessive["']/.test(canonical)) failures.push('Canonical Cinnamon record still contains Recessive inheritance.');
if (!catalog.includes('gene(\'Cinnamon\', \'Dominant\'')) failures.push('Reference Hognose catalog does not record Cinnamon as Dominant.');
if (!audit.includes("name: 'Cinnamon', status: 'recognised', inheritance: 'Dominant'")) failures.push('Morph evidence audit does not record Cinnamon as Dominant.');

if (!master.includes('function isCalculatorEligible')) failures.push('Calculator eligibility helper is missing.');
if (!master.includes('morph.kind === "Line-bred"') || !master.includes('morph.kind === "Polygenic"')) failures.push('Non-Mendelian morph classes are not explicitly excluded from calculation.');

if (failures.length) {
  console.error('TINY TITANS MORPH INTEGRITY FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Tiny Titans morph integrity passed: source labels resolve, evidence gating is present, Cinnamon inheritance is consistent, and non-Mendelian classes are excluded from calculator eligibility.`);
