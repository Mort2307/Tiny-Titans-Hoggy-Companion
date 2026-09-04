import type { SnakeSpeciesRecord } from './speciesTypes';
import { SPECIES_SOURCES } from './speciesSources';

const reviewedOn = '2026-09-04';
const taxonomySource = SPECIES_SOURCES.reptileDatabase2026.id;
const base = {
  kingdom: 'Animalia' as const,
  phylum: 'Chordata' as const,
  class: 'Reptilia' as const,
  order: 'Squamata' as const
};

export const INITIAL_SNAKE_SPECIES: SnakeSpeciesRecord[] = [
  {
    ...base, id: 'heterodon-nasicus', acceptedScientificName: 'Heterodon nasicus', authorYear: 'BAIRD & GIRARD, 1852',
    commonNames: ['Western Hognose Snake', 'Plains Hognose Snake', 'Dusty Hognose Snake'],
    searchAliases: ['western hognose', 'plains hognose', 'dusty hognose', 'heterodon nasicus'],
    family: 'Colubridae', genus: 'Heterodon', speciesEpithet: 'nasicus',
    synonyms: ['Heterodon nasicus nasicus', 'Heterodon nasicus gloydi'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American hognose snake. H. nasicus is the canonical species context for Western Hognose keepers.',
      distribution: 'Canada and the United States.', activityPattern: 'diurnal', lifestyle: ['terrestrial', 'semi-fossorial'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'moderate', notes: 'Species-specific dataset required; no automatic inheritance from other hognoses.', cohabitation: { recommendation: 'generally-single', rationale: 'General veterinary guidance favours solitary maintenance for pet snakes.' } },
      feeding: { evidenceLevel: 'moderate', dietaryGuild: 'generalist', preyCategories: ['amphibians', 'reptiles', 'birds', 'invertebrates'] },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    ...base, id: 'heterodon-platirhinos', acceptedScientificName: 'Heterodon platirhinos', authorYear: 'LATREILLE, 1801',
    commonNames: ['Eastern Hognose Snake'], searchAliases: ['eastern hognose', 'heterodon platirhinos'],
    family: 'Colubridae', genus: 'Heterodon', speciesEpithet: 'platirhinos', taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Distinct North American Heterodon species; do not apply Western Hognose parameters automatically.',
      distribution: 'Eastern and central North America.', activityPattern: 'diurnal', lifestyle: ['terrestrial', 'semi-fossorial'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'limited', cohabitation: { recommendation: 'generally-single', rationale: 'Use species-specific evidence before recommending group housing.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    ...base, id: 'leioheterodon-modestus', acceptedScientificName: 'Leioheterodon modestus', authorYear: '(GÜNTHER, 1863)',
    commonNames: ['Malagasy Golden Hognose'], searchAliases: ['leioheterodon modestus', 'malagasy golden hognose', 'golden hognose'],
    family: 'Pseudoxyrhophiidae', genus: 'Leioheterodon', speciesEpithet: 'modestus', synonyms: ['Heterodon modestus'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Madagascar endemic Leioheterodon; a hognose by common name but not a Heterodon species.',
      distribution: 'Madagascar.', activityPattern: 'diurnal', lifestyle: ['terrestrial', 'semi-fossorial'], riskClass: 'specialist',
      husbandry: { evidenceLevel: 'limited', notes: 'Research independently from Heterodon husbandry.', cohabitation: { recommendation: 'species-specific', rationale: 'Reported group maintenance does not establish a universal social requirement.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: true },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    ...base, id: 'xenodon-pulcher', acceptedScientificName: 'Xenodon pulcher', authorYear: '(JAN, 1863)',
    commonNames: ['Tricolour Hognose', 'False Coral Snake'], searchAliases: ['tricolour hognose', 'tricolor hognose', 'xenodon pulcher'],
    family: 'Colubridae', genus: 'Xenodon', speciesEpithet: 'pulcher', synonyms: ['Heterodon pulcher'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'South American species historically placed in Heterodon; currently recognised as Xenodon pulcher.',
      distribution: 'Brazil, Bolivia, Paraguay and Argentina.', lifestyle: ['terrestrial'], riskClass: 'specialist',
      husbandry: { evidenceLevel: 'limited', notes: 'Do not inherit North American hognose parameters.', cohabitation: { recommendation: 'unknown', rationale: 'Species-specific evidence required.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    ...base, id: 'python-regius', acceptedScientificName: 'Python regius', authorYear: '(SHAW, 1802)',
    commonNames: ['Ball Python', 'Royal Python'], searchAliases: ['ball python', 'royal python', 'python regius'],
    family: 'Pythonidae', genus: 'Python', speciesEpithet: 'regius', synonyms: ['Boa regia'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'African python commonly kept as the Ball or Royal Python.', distribution: 'West and central Africa.', lifestyle: ['terrestrial'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'high', temperature: { warmSide: { min: 25, max: 30, unit: '°C', context: 'POTZ reference range' } }, humidity: { acceptable: { min: 50, max: 80, unit: '%', context: 'veterinary reference range' } }, cohabitation: { recommendation: 'generally-single', rationale: 'General veterinary guidance states most nonbreeding pet snakes are best maintained singly.' } },
      feeding: { evidenceLevel: 'high', dietaryGuild: 'carnivore', preyCategories: ['vertebrate prey'] }, breeding: { evidenceLevel: 'moderate' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    ...base, id: 'pantherophis-guttatus', acceptedScientificName: 'Pantherophis guttatus', authorYear: '(LINNAEUS, 1766)',
    commonNames: ['Red Cornsnake', 'Eastern Corn Snake'], searchAliases: ['corn snake', 'cornsnake', 'pantherophis guttatus'],
    family: 'Colubridae', genus: 'Pantherophis', speciesEpithet: 'guttatus', synonyms: ['Coluber guttatus', 'Pantherophis guttata'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American colubrid commonly kept as the Corn Snake.', distribution: 'United States and associated records.', lifestyle: ['terrestrial', 'semi-arboreal'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'high', temperature: { warmSide: { min: 25, max: 30, unit: '°C', context: 'POTZ reference range for corn/rat snakes' } }, humidity: { acceptable: { min: 30, max: 70, unit: '%', context: 'veterinary reference range for corn/rat snakes' } }, cohabitation: { recommendation: 'generally-single', rationale: 'General veterinary guidance favours solitary maintenance for nonbreeding pet snakes.' } },
      feeding: { evidenceLevel: 'high', dietaryGuild: 'carnivore', preyCategories: ['vertebrate prey'] }, breeding: { evidenceLevel: 'moderate' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    ...base, id: 'lampropeltis-nigrita', acceptedScientificName: 'Lampropeltis nigrita', authorYear: '(ZWEIFEL & NORRIS, 1955)',
    commonNames: ['Mexican Black Kingsnake', 'Black Desert Kingsnake'], searchAliases: ['mbk', 'mexican black kingsnake', 'lampropeltis nigrita'],
    family: 'Colubridae', genus: 'Lampropeltis', speciesEpithet: 'nigrita', synonyms: ['Lampropeltis getula nigrita'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Mexican Black Kingsnake; current taxonomy recognises Lampropeltis nigrita as a species.', distribution: 'Mexico and southeastern Arizona.', lifestyle: ['terrestrial'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'limited', notes: 'Species-specific husbandry must be researched independently.', cohabitation: { recommendation: 'generally-single', rationale: 'Individual housing is the default until species-specific evidence supports otherwise.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    ...base, id: 'eunectes-murinus', acceptedScientificName: 'Eunectes murinus', authorYear: '(LINNAEUS, 1758)',
    commonNames: ['Green Anaconda', 'Anaconda'], searchAliases: ['green anaconda', 'anaconda', 'eunectes murinus'],
    family: 'Boidae', genus: 'Eunectes', speciesEpithet: 'murinus', synonyms: ['Boa murina'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Large South American semi-aquatic boid.', lifestyle: ['semi-aquatic', 'terrestrial'], riskClass: 'specialist',
      husbandry: { evidenceLevel: 'limited', notes: 'Requires dedicated large-bodied semi-aquatic research before keeper-facing parameters are published.', cohabitation: { recommendation: 'generally-single', rationale: 'Individual housing is the default without authoritative species-specific evidence.' } },
      feeding: { evidenceLevel: 'moderate', dietaryGuild: 'generalist' }, breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    ...base, id: 'crotalus-atrox', acceptedScientificName: 'Crotalus atrox', authorYear: 'BAIRD & GIRARD, 1853',
    commonNames: ['Western Diamond-backed Rattlesnake'], searchAliases: ['western diamondback', 'crotalus atrox'],
    family: 'Viperidae', genus: 'Crotalus', speciesEpithet: 'atrox', synonyms: ['Crotalus tortugensis'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American rattlesnake species in Viperidae.', lifestyle: ['terrestrial'], riskClass: 'venomous',
      husbandry: { evidenceLevel: 'limited', notes: 'Keeper-facing operational guidance requires specialist venomous-snake safety review.', cohabitation: { recommendation: 'generally-single', rationale: 'Individual housing is the safe default for high-risk venomous snakes.' } },
      breeding: { evidenceLevel: 'moderate' }, safety: { medicallySignificantVenom: true, rearFangedOrVenomDelivery: false, handlingNotes: 'Specialist venomous-snake protocols apply.' }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    ...base, id: 'bitis-gabonica', acceptedScientificName: 'Bitis gabonica', authorYear: '(DUMÉRIL, BIBRON & DUMÉRIL, 1854)',
    commonNames: ['Gaboon Viper', 'Gaboon Adder'], searchAliases: ['gaboon viper', 'gaboon adder', 'bitis gabonica'],
    family: 'Viperidae', genus: 'Bitis', speciesEpithet: 'gabonica', synonyms: ['Bitis gabonica gabonica'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Large African viper explicitly identified as venomous by the Reptile Database.', distribution: 'Sub-Saharan Africa.', lifestyle: ['terrestrial'], riskClass: 'venomous',
      husbandry: { evidenceLevel: 'limited', notes: 'Specialist venomous-snake husbandry and safety review required.', cohabitation: { recommendation: 'generally-single', rationale: 'Individual housing is the safe default for high-risk venomous snakes.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: true, rearFangedOrVenomDelivery: false, handlingNotes: 'Venomous species. Do not provide casual handling procedures.' }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  }
];

export const SNAKE_SPECIES_BY_ID = Object.fromEntries(INITIAL_SNAKE_SPECIES.map((species) => [species.id, species])) as Record<string, SnakeSpeciesRecord>;

export function searchSnakeSpecies(query: string): SnakeSpeciesRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return INITIAL_SNAKE_SPECIES;
  return INITIAL_SNAKE_SPECIES.filter((species) =>
    [species.acceptedScientificName, ...species.commonNames, ...species.searchAliases, ...(species.synonyms ?? [])]
      .some((value) => value.toLowerCase().includes(normalized))
  );
}
