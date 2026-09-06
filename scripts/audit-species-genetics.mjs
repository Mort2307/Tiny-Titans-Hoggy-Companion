import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/data/species');
const registry = fs.readFileSync(path.join(root, 'speciesRegistry.ts'), 'utf8');
const catalogue = fs.readFileSync(path.join(root, 'speciesGeneticsCatalogues.ts'), 'utf8');

for (const required of [
  'export const SPECIES_GENETICS_CATALOGUES',
  '"Python regius"',
  '"Pantherophis guttatus"',
  'sourceUrl:',
  'sourceLabel:',
]) {
  if (!catalogue.includes(required)) throw new Error(`Species genetics catalogue is missing required contract: ${required}`);
}

const registrySpeciesIds = new Set([
  ...[...registry.matchAll(/\b(?:p|taxonomyOnly|cared|record|venomous)\(\s*'([^']+)'/g)].map((match) => match[1]),
  ...[...registry.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]),
]);
if (registrySpeciesIds.size < 100) throw new Error(`Expected 100+ registered species; detected ${registrySpeciesIds.size}.`);

const catalogueSpecies = [...catalogue.matchAll(/^\s*"([^"]+)":\s*\[/gm)].map((match) => match[1]);
const duplicateSpecies = catalogueSpecies.filter((name, index) => catalogueSpecies.indexOf(name) !== index);
if (duplicateSpecies.length) throw new Error(`Duplicate species catalogue keys: ${[...new Set(duplicateSpecies)].join(', ')}`);

const traitBlocks = [...catalogue.matchAll(/\[\"([^\"]+)\",\s*\"([^\"]+)\"/g)].map((match) => ({ name: match[1], inheritance: match[2] }));
if (!traitBlocks.length) throw new Error('No species genetics trait records detected.');

const mendelian = new Set(['Recessive', 'Incomplete Dominant', 'Dominant']);
if (traitBlocks.some((trait) => !trait.name || !trait.inheritance)) throw new Error('Malformed species genetics trait record detected.');
if (traitBlocks.filter((trait) => mendelian.has(trait.inheritance)).length === 0) throw new Error('No Mendelian species genetics traits detected.');

console.log(`Species genetics catalogue audit passed: ${catalogueSpecies.length} species catalogued, ${traitBlocks.length} trait rows detected.`);
