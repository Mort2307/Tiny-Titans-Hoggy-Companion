import { INITIAL_SNAKE_SPECIES } from '../src/data/species/speciesRegistry';
import {
  buildSnakeSpeciesTaxonomy,
  flattenSnakeSpeciesTaxonomy,
} from '../src/data/species/speciesTaxonomy';

const taxonomy = buildSnakeSpeciesTaxonomy(INITIAL_SNAKE_SPECIES);
const flattened = flattenSnakeSpeciesTaxonomy(taxonomy);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[species-taxonomy] ${message}`);
}

const registryIds = INITIAL_SNAKE_SPECIES.map((species) => species.id);
const flattenedIds = flattened.map((species) => species.id);

assert(INITIAL_SNAKE_SPECIES.length > 0, 'The canonical species registry is empty.');
assert(new Set(registryIds).size === registryIds.length, 'The canonical species registry contains duplicate IDs.');
assert(flattened.length === INITIAL_SNAKE_SPECIES.length, `Taxonomy coverage mismatch: registry has ${INITIAL_SNAKE_SPECIES.length} species but taxonomy exposes ${flattened.length}.`);
assert(new Set(flattenedIds).size === flattenedIds.length, 'The taxonomy contains duplicate species IDs.');
assert(
  registryIds.every((id) => flattenedIds.includes(id)),
  'At least one canonical registry species is missing from the selector taxonomy.'
);
assert(
  taxonomy.every((group) => group.genera.length > 0 && group.genera.every((genus) => genus.species.length > 0)),
  'The taxonomy contains an empty group or genus node.'
);

for (const species of INITIAL_SNAKE_SPECIES) {
  assert(species.acceptedScientificName.trim().length > 0, `Species ${species.id} has no accepted scientific name.`);
  assert(species.genus.trim().length > 0, `Species ${species.id} has no genus.`);
  assert(species.speciesEpithet.trim().length > 0, `Species ${species.id} has no species epithet.`);
  assert(species.commonNames.length > 0, `Species ${species.id} has no common name.`);
}

const hognose = taxonomy.find((group) => group.id === 'hognose');
assert(hognose, 'Hognose group is missing.');
for (const expected of ['heterodon-nasicus', 'heterodon-platirhinos', 'leioheterodon-modestus', 'xenodon-pulcher']) {
  assert(hognose.genera.some((genus) => genus.species.some((species) => species.id === expected)), `Expected Hognose species ${expected} is not under the Hognose group.`);
}

console.log(`✓ hierarchical species taxonomy covers ${INITIAL_SNAKE_SPECIES.length} species across ${taxonomy.length} top-level groups and ${taxonomy.reduce((total, group) => total + group.genera.length, 0)} genera.`);
