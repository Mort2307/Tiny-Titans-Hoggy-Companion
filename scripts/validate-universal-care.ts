import { UNIVERSAL_SPECIES, UNIVERSAL_SPECIES_BY_ID } from '../src/data/species/universalSpeciesRegistry';
import { UNIVERSAL_SPECIES_SOURCES } from '../src/data/species/universalSpeciesSources';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[universal-care] ${message}`);
}

const allowedRequirementPriorities = new Set(['essential', 'important', 'conditional']);
const allowedHealthPriorities = new Set(['monitor', 'prompt-vet', 'urgent-vet']);

assert(UNIVERSAL_SPECIES.length >= 500, 'Universal species registry is below the broad-catalogue threshold.');
assert(Object.keys(UNIVERSAL_SPECIES_BY_ID).length === UNIVERSAL_SPECIES.length, 'Universal species ID index is not one-to-one.');

let fullyResolved = 0;
let taxonomyFirst = 0;

for (const species of UNIVERSAL_SPECIES) {
  const care = species.care;
  assert(care, `${species.id} has no resolved care object.`);
  assert(care.husbandry.requirements.length >= 6, `${species.id} has too few baseline husbandry requirements.`);
  assert(care.health.watches.length >= 2, `${species.id} has too few health watch records.`);
  assert(care.husbandry.reviewedOn === '2026-09-21', `${species.id} care review date is stale.`);
  assert(care.health.reviewedOn === '2026-09-21', `${species.id} health review date is stale.`);
  if (!care.husbandry.numericGuidance.available) assert(!care.husbandry.numericGuidance.ranges?.length, `${species.id} has hidden numeric ranges while marking them unavailable.`);
  if (care.husbandry.numericGuidance.available) assert((care.husbandry.numericGuidance.ranges ?? []).every((range) => range.evidence.sourceIds.every((id) => Boolean(UNIVERSAL_SPECIES_SOURCES[id]))), `${species.id} has an invalid numeric evidence reference.`);
  assert(care.resolvedFrom.length >= 3, `${species.id} has no complete species/genus/class provenance chain.`);
  assert(['species','genus','taxon','class','ecology-only','not-verified'].includes(care.husbandry.coverage), `${species.id} has an invalid husbandry coverage level.`);
  assert(care.husbandry.unresolved.length > 0, `${species.id} must expose remaining species-specific research gaps.`);
  assert(care.health.unresolved.length > 0, `${species.id} must expose remaining health research gaps.`);

  for (const requirement of care.husbandry.requirements) {
    assert(allowedRequirementPriorities.has(requirement.priority), `${species.id}/${requirement.id} has an invalid care priority.`);
    assert(requirement.evidence.sourceIds.every((id) => Boolean(UNIVERSAL_SPECIES_SOURCES[id])), `${species.id}/${requirement.id} references an unknown source.`);
    assert(requirement.evidence.caveat.trim().length > 0, `${species.id}/${requirement.id} has no evidence caveat.`);
  }

  for (const watch of care.health.watches) {
    assert(allowedHealthPriorities.has(watch.priority), `${species.id}/${watch.id} has an invalid health priority.`);
    assert(watch.watchFor.length > 0 && watch.riskFactors.length > 0, `${species.id}/${watch.id} is missing watch/risk context.`);
    assert(watch.prevention.trim().length > 0, `${species.id}/${watch.id} has no prevention guidance.`);
    assert(watch.evidence.caveat.trim().length > 0, `${species.id}/${watch.id} has no evidence caveat.`);
    assert(watch.evidence.sourceIds.every((id) => Boolean(UNIVERSAL_SPECIES_SOURCES[id])), `${species.id}/${watch.id} references an unknown source.`);
  }

  if (care.status === 'needs-review') taxonomyFirst += 1;
  else fullyResolved += 1;
}

assert(fullyResolved > 0, 'No care profiles have any mapped veterinary/class-level evidence.');
assert(taxonomyFirst > 0, 'Research-needed profiles unexpectedly disappeared; specialist groups need an explicit evidence queue.');

for (const speciesId of ['dendrobates-tinctorius', 'pelodryas-caerulea', 'ceratophrys-cranwelli', 'ambystoma-mexicanum']) {
  const species = UNIVERSAL_SPECIES_BY_ID[speciesId];
  assert(species?.care?.husbandry.coverage === 'species', `${speciesId} must have a species-scoped care profile.`);
  assert((species.care.husbandry.numericGuidance.ranges ?? []).every((range) => range.evidence.basis === 'species-specific'), `${speciesId} numeric ranges must retain species-specific evidence scope.`);
}

const requiredGroups = ['reptile', 'amphibian', 'arachnid', 'insect', 'myriapod', 'mollusc', 'crustacean', 'mammal', 'bird', 'fish', 'cephalopod'];
for (const group of requiredGroups) {
  assert(UNIVERSAL_SPECIES.some((species) => species.className === group), `Missing universal animal group: ${group}`);
}

assert(
  UNIVERSAL_SPECIES.some((species) => species.className === 'reptile' && species.care?.husbandry.requirements.some((item) => item.id === 'thermal-environment')),
  'Reptile care baseline lost its thermal requirement.',
);
assert(
  UNIVERSAL_SPECIES.some((species) => species.className === 'amphibian' && species.care?.health.watches.some((item) => item.id === 'pathogen')),
  'Amphibian health baseline lost its pathogen watch.',
);
assert(
  UNIVERSAL_SPECIES.some((species) => species.className === 'fish' && species.care?.husbandry.requirements.some((item) => item.id === 'water-quality')),
  'Fish care baseline lost water-quality management.',
);
assert(
  UNIVERSAL_SPECIES.some((species) => species.className === 'bird' && species.care?.husbandry.requirements.some((item) => item.id === 'foraging')),
  'Bird care baseline lost enrichment/foraging guidance.',
);
assert(
  UNIVERSAL_SPECIES.some((species) => species.riskClass === 'venomous' && species.care?.health.veterinary.speciesSpecificVetRecommended === true),
  'Venomous species are missing specialist-vet routing.',
);

console.log(`Universal care database OK: ${UNIVERSAL_SPECIES.length} records, ${fullyResolved} evidence-backed baseline profiles, ${taxonomyFirst} research-needed specialist/ecology profiles.`);
console.log('Policy: class/genus baselines are not species care sheets; exact numeric targets require species-scoped evidence.');
console.log('Policy: health watch points are informational risk flags, not diagnoses.');
