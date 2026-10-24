import {
  UNIVERSAL_SPECIES,
  UNIVERSAL_SPECIES_GROUPS,
  UNIVERSAL_SPECIES_BY_ID,
  findUniversalSpecies,
  searchUniversalSpecies,
} from '../src/data/species/universalSpeciesRegistry';
import { UNIVERSAL_SPECIES_SOURCES } from '../src/data/species/universalSpeciesSources';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[universal-species] ${message}`);
}

const ids = UNIVERSAL_SPECIES.map((species) => species.id);
const scientificNames = UNIVERSAL_SPECIES.map((species) => species.acceptedScientificName.toLowerCase());

assert(UNIVERSAL_SPECIES.length >= 500, `Universal catalogue unexpectedly small: ${UNIVERSAL_SPECIES.length}. The expansion should remain a genuinely broad cross-animal catalogue.`);
assert(new Set(ids).size === ids.length, 'Duplicate universal species IDs detected.');
assert(new Set(scientificNames).size === scientificNames.length, 'Duplicate accepted scientific names detected.');
assert(UNIVERSAL_SPECIES_GROUPS.length >= 10, `Expected broad animal-group coverage, found ${UNIVERSAL_SPECIES_GROUPS.length} groups.`);

for (const species of UNIVERSAL_SPECIES) {
  assert(species.id === species.id.trim() && species.id.length > 0, 'A species has an empty/invalid ID.');
  assert(species.acceptedScientificName.trim().length > 0, `${species.id} has no scientific name.`);
  assert(species.commonNames.length > 0 && species.commonNames.every((name) => name.trim().length > 0), `${species.id} has no usable common name.`);
  assert(species.genus.trim().length > 0, `${species.id} has no genus.`);
  assert(species.speciesEpithet.trim().length > 0, `${species.id} has no species epithet.`);
  assert(species.family.trim().length > 0, `${species.id} has no family.`);
  assert(species.order.trim().length > 0, `${species.id} has no order.`);
  assert(UNIVERSAL_SPECIES_SOURCES[species.taxonSourceId], `${species.id} references missing taxonomy source ${species.taxonSourceId}.`);
  assert(species.sourceIds.length > 0, `${species.id} has no provenance IDs.`);
  assert(species.reviewedOn === '2026-09-21' || species.reviewedOn.startsWith('2026-09-'), `${species.id} has no current expansion review date.`);
  assert(!/\\bsp\\.?\\b/i.test(species.acceptedScientificName), `${species.id} is a genus-level/spec placeholder rather than a species-level record.`);
  assert(species.husbandryStatus !== 'taxonomy-only' || species.husbandryNotes?.includes('numeric husbandry targets'), `${species.id} taxonomy-only state is missing its no-fabrication guard.`);
  assert(species.regulatory.locationDependent === true, `${species.id} regulatory state must remain location-dependent.`);
  assert(species.browseGroup.trim().length > 0, `${species.id} has no human-facing browse group.`);
}

const counts = Object.fromEntries(
  UNIVERSAL_SPECIES_GROUPS.map((group) => [group.className, group.count]),
);

const minimums: Record<string, number> = {
  reptile: 200,
  amphibian: 60,
  arachnid: 60,
  insect: 40,
  myriapod: 8,
  mollusc: 8,
  crustacean: 8,
  mammal: 20,
  bird: 15,
  fish: 20,
  cephalopod: 4,
};

for (const [className, minimum] of Object.entries(minimums)) {
  assert((counts[className] ?? 0) >= minimum, `${className} coverage fell below ${minimum}; found ${counts[className] ?? 0}.`);
}

assert(UNIVERSAL_SPECIES_BY_ID['heterodon-nasicus'], 'Existing canonical Western Hognose record was not bridged into the universal catalogue.');
assert(UNIVERSAL_SPECIES_BY_ID['eublepharis-macularius'], 'Leopard Gecko expansion is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['testudo-hermanni'], 'Hermann’s Tortoise expansion is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['ambystoma-mexicanum'], 'Axolotl expansion is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['brachypelma-hamorii'], 'Curated tarantula expansion is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['blaptica-dubia'], 'Feeder/insect expansion is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['chinchilla-lanigera'], 'Exotic mammal expansion is missing.');

// Companion and aviary birds are real species records, not morph names.
const birds = UNIVERSAL_SPECIES.filter((species) => species.className === 'bird');
assert(birds.length >= 130, 'Bird expansion unexpectedly small: ' + birds.length + '; expected broad common-captive coverage.');
assert(UNIVERSAL_SPECIES_BY_ID['psittacula-krameri'], 'Indian Ringneck / Rose-ringed Parakeet is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['chloebia-gouldiae'], 'Gouldian Finch is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['synoicus-chinensis'], 'King Quail is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['geopelia-cuneata'], 'Diamond Dove is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['trichoglossus-moluccanus'] === undefined, 'Unrecognised Rainbow Lorikeet identity leaked into the registry.');
assert(UNIVERSAL_SPECIES_BY_ID['trichoglossus-moluccanus'], 'Rainbow Lorikeet is missing.');
assert(UNIVERSAL_SPECIES_BY_ID['ara-macao'], 'Scarlet Macaw is missing.');
assert(birds.every((bird) => bird.browseGroup === 'birds' && bird.taxonomicClass === 'Aves'), 'Bird browse group/class drift detected.');
assert(birds.every((bird) => bird.husbandryStatus !== 'taxonomy-only' || bird.husbandryNotes?.includes('No numeric husbandry targets')), 'Bird catalogue contains unsourced numeric care claims.');
assert(searchUniversalSpecies('Indian Ringneck').some((species) => species.id === 'psittacula-krameri'), 'Indian Ringneck keeper search alias is missing.');


assert(searchUniversalSpecies('leopard gecko')[0]?.id === 'eublepharis-macularius', 'Universal search does not resolve a common keeper name.');
assert(searchUniversalSpecies('Ambystoma mexicanum')[0]?.id === 'ambystoma-mexicanum', 'Universal search does not resolve a scientific name.');
assert(searchUniversalSpecies('tarantula').length > 0, 'Universal search does not expose arachnid records.');
assert(findUniversalSpecies('heterodon-nasicus')?.id === 'heterodon-nasicus', 'Exact universal species ID resolution failed.');
assert(findUniversalSpecies('Heterodon nasicus')?.id === 'heterodon-nasicus', 'Exact scientific-name resolution failed.');
assert(findUniversalSpecies('hetrodon nasicus') === undefined, 'A fuzzy typo must not become identity resolution; use searchUniversalSpecies for suggestions.');

console.log(`Universal species database OK: ${UNIVERSAL_SPECIES.length} total records across ${UNIVERSAL_SPECIES_GROUPS.length} animal groups.`);
for (const group of UNIVERSAL_SPECIES_GROUPS) {
  console.log(`  ${group.label}: ${group.count}`);
}
console.log('Policy: universal expansion records default to taxonomy-first/research-needed until species-specific husbandry evidence is reviewed.');
console.log('Policy: legal fields are checks, not legal conclusions; current CITES/DWA/invasive status must be rechecked for the user’s jurisdiction.');

const browseGroups = new Set(UNIVERSAL_SPECIES.map((species) => species.browseGroup));
assert(browseGroups.has('snakes') && browseGroups.has('lizards'), 'Reptile browse groups do not expose both snakes and lizards.');
assert(browseGroups.has('frogs-toads'), 'Amphibian browse groups do not expose frogs/toads.');
assert(browseGroups.has('salamanders-newts'), 'Amphibian browse groups do not expose salamanders/newts.');
assert(browseGroups.has('insects') && browseGroups.has('spiders'), 'Invertebrate browse groups do not expose insects and spiders.');
