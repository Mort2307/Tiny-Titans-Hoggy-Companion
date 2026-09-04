import type { SnakeSpeciesRecord } from './speciesTypes';
import { SPECIES_SOURCES } from './speciesSources';

const reviewedOn = '2026-09-04';
const taxonomySource = SPECIES_SOURCES.reptileDatabase2026.id;

export const INITIAL_SNAKE_SPECIES: SnakeSpeciesRecord[] = [
  {
    id: 'heterodon-nasicus',
    acceptedScientificName: 'Heterodon nasicus',
    authorYear: 'BAIRD & GIRARD, 1852',
    commonNames: ['Western Hognose Snake', 'Plains Hognose Snake', 'Dusty Hognose Snake'],
    searchAliases: ['western hognose', 'plains hognose', 'dusty hognose', 'h. nasicus', 'heterodon nasicus'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Colubridae', genus: 'Heterodon', speciesEpithet: 'nasicus',
    synonyms: ['Heterodon nasicus nasicus', 'Heterodon nasicus gloydi'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American hognose snake. Current taxonomy treats Heterodon nasicus as an accepted species and records H. n. gloydi as a subspecific taxon/usage in its synonymy history.',
      distribution: 'Canada and the United States; distribution is documented by the Reptile Database and should be rendered from current taxonomic data.',
      habitat: 'Predominantly terrestrial and fossorial/semi-fossorial habitats; species-specific enclosure guidance requires evidence-backed husbandry data.',
      activityPattern: 'diurnal',
      lifestyle: ['terrestrial', 'semi-fossorial'],
      riskClass: 'companion',
      husbandry: {
        evidenceLevel: 'moderate',
        notes: 'Use the validated Tiny Titans H. nasicus husbandry dataset when populated. Do not infer parameters from another hognose species.',
        cohabitation: { recommendation: 'generally-single', rationale: 'General veterinary guidance favours solitary maintenance for pet snakes; any species-specific exception must be supported by evidence.' }
      },
      feeding: { evidenceLevel: 'moderate', dietaryGuild: 'generalist', preyCategories: ['amphibians', 'reptiles', 'birds', 'invertebrates'], notes: 'Natural diet information is species-specific and should not be replaced by generic snake-feeding assumptions.' },
      breeding: { evidenceLevel: 'limited', seasonalCycling: 'Species-specific reproductive and seasonal data to be populated from primary literature and specialist veterinary references.' },
      safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id],
      reviewedOn
    }
  },
  {
    id: 'heterodon-platirhinos',
    acceptedScientificName: 'Heterodon platirhinos',
    authorYear: 'LATREILLE, 1801',
    commonNames: ['Eastern Hognose Snake'],
    searchAliases: ['eastern hognose', 'eastern hog nose', 'h. platirhinos', 'heterodon platirhinos'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Colubridae', genus: 'Heterodon', speciesEpithet: 'platirhinos',
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American hognose snake recognised as a distinct species from Heterodon nasicus.',
      distribution: 'Eastern and central regions of North America; current distribution should be rendered from the taxonomy dataset.',
      activityPattern: 'diurnal', lifestyle: ['terrestrial', 'semi-fossorial'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'limited', notes: 'Species-specific captive parameters are intentionally left unset until sourced rather than copied from Western Hognose care guidance.', cohabitation: { recommendation: 'generally-single', rationale: 'Use species-specific evidence before recommending social housing.' } },
      breeding: { evidenceLevel: 'limited' },
      safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    id: 'leioheterodon-modestus',
    acceptedScientificName: 'Leioheterodon modestus',
    authorYear: '(GÜNTHER, 1863)',
    commonNames: ['Malagasy Golden Hognose'],
    searchAliases: ['leioheterodon modestus', 'malagasy golden hognose', 'golden hognose'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Pseudoxyrhophiidae', genus: 'Leioheterodon', speciesEpithet: 'modestus',
    synonyms: ['Heterodon modestus'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Madagascar endemic hognose species in the genus Leioheterodon; it is not a Heterodon species.',
      distribution: 'Madagascar.', habitat: 'Species-specific habitat and captive-environment data must be sourced separately from Heterodon husbandry.',
      activityPattern: 'diurnal', lifestyle: ['terrestrial', 'semi-fossorial'], riskClass: 'specialist',
      husbandry: { evidenceLevel: 'limited', notes: 'No automatic inheritance from Western Hognose parameters. Research separately.', cohabitation: { recommendation: 'species-specific', rationale: 'Keeper reports of group maintenance do not by themselves establish a social requirement or general welfare benefit; evidence must be evaluated before recommendations are published.' } },
      breeding: { evidenceLevel: 'limited' },
      safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: true, handlingNotes: 'Rear-fanged/venom-delivery status must be treated as a species-specific safety field and not conflated with Heterodon.' },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    id: 'xenodon-pulcher',
    acceptedScientificName: 'Xenodon pulcher',
    authorYear: '(JAN, 1863)',
    commonNames: ['Tricolour Hognose', 'False Coral Snake'],
    searchAliases: ['tricolour hognose', 'tricolor hognose', 'xenodon pulcher', 'false coral snake'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Colubridae', genus: 'Xenodon', speciesEpithet: 'pulcher', synonyms: ['Heterodon pulcher'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'South American species historically placed in Heterodon; currently recognised as Xenodon pulcher.',
      distribution: 'Brazil, Bolivia, Paraguay and Argentina; exact current distribution should follow the taxonomy source.',
      lifestyle: ['terrestrial'], riskClass: 'specialist', husbandry: { evidenceLevel: 'limited', notes: 'Do not inherit North American hognose parameters.', cohabitation: { recommendation: 'unknown', rationale: 'Species-specific evidence required.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    id: 'python-regius',
    acceptedScientificName: 'Python regius',
    authorYear: '(SHAW, 1802)',
    commonNames: ['Ball Python', 'Royal Python'],
    searchAliases: ['ball python', 'royal python', 'python regius', 'royal'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Pythonidae', genus: 'Python', speciesEpithet: 'regius',
    synonyms: ['Boa regia'], taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'African python species widely maintained in captivity as the Ball Python or Royal Python.',
      distribution: 'West and central Africa; current taxonomic distribution should be rendered from the taxonomy dataset.',
      habitat: 'Terrestrial/scrubland-associated according to general veterinary husbandry references; species-specific environmental data will be maintained separately.',
      lifestyle: ['terrestrial'], riskClass: 'companion',
      husbandry: {
        evidenceLevel: 'high',
        temperature: { warmSide: { min: 25, max: 30, unit: '°C', context: 'POTZ reference range' } },
        humidity: { acceptable: { min: 50, max: 80, unit: '%', context: 'veterinary reference range' } },
        enclosure: { habitatType: ['terrestrial'], notes: 'Merck Veterinary Manual lists Ball Python as terrestrial/scrubland and provides the cited POTZ/humidity ranges.' },
        cohabitation: { recommendation: 'generally-single', rationale: 'General veterinary guidance states most nonbreeding pet snakes are best maintained singly.' }
      },
      feeding: { evidenceLevel: 'high', dietaryGuild: 'carnivore', preyCategories: ['vertebrate prey'] },
      breeding: { evidenceLevel: 'moderate' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    id: 'pantherophis-guttatus',
    acceptedScientificName: 'Pantherophis guttatus',
    authorYear: '(LINNAEUS, 1766)',
    commonNames: ['Red Cornsnake', 'Eastern Corn Snake'],
    searchAliases: ['corn snake', 'cornsnake', 'pantherophis guttatus', 'red corn snake'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Colubridae', genus: 'Pantherophis', speciesEpithet: 'guttatus', synonyms: ['Coluber guttatus', 'Pantherophis guttata'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American colubrid commonly kept as the Corn Snake.',
      distribution: 'United States and associated introduced/island records; use current taxonomy data for exact distribution.',
      lifestyle: ['terrestrial', 'semi-arboreal'], riskClass: 'companion',
      husbandry: {
        evidenceLevel: 'high',
        temperature: { warmSide: { min: 25, max: 30, unit: '°C', context: 'POTZ reference range for corn/rat snakes' } },
        humidity: { acceptable: { min: 30, max: 70, unit: '%', context: 'veterinary reference range for corn/rat snakes' } },
        enclosure: { habitatType: ['terrestrial', 'semi-arboreal'] },
        cohabitation: { recommendation: 'generally-single', rationale: 'General veterinary guidance favours solitary maintenance for nonbreeding pet snakes.' }
      },
      feeding: { evidenceLevel: 'high', dietaryGuild: 'carnivore', preyCategories: ['vertebrate prey'] }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false },
      breeding: { evidenceLevel: 'moderate' }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id, SPECIES_SOURCES.merckReptileHusbandry2025.id], reviewedOn
    }
  },
  {
    id: 'lampropeltis-nigrita',
    acceptedScientificName: 'Lampropeltis nigrita',
    authorYear: '(ZWEIFEL & NORRIS, 1955)',
    commonNames: ['Mexican Black Kingsnake', 'Black Desert Kingsnake'],
    searchAliases: ['mbk', 'mexican black kingsnake', 'black kingsnake', 'lampropeltis nigrita'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Colubridae', genus: 'Lampropeltis', speciesEpithet: 'nigrita', synonyms: ['Lampropeltis getula nigrita'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Mexican Black Kingsnake; current taxonomic treatment recognises Lampropeltis nigrita as a species.',
      distribution: 'Mexico and southeastern Arizona according to the Reptile Database.', lifestyle: ['terrestrial'], riskClass: 'companion',
      husbandry: { evidenceLevel: 'limited', notes: 'Species-specific husbandry dataset to be researched independently; do not blindly reuse generic kingsnake or corn snake parameters.', cohabitation: { recommendation: 'generally-single', rationale: 'Default to individual housing unless species-specific evidence supports another arrangement.' } },
      breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    id: 'eunectes-murinus',
    acceptedScientificName: 'Eunectes murinus',
    authorYear: '(LINNAEUS, 1758)',
    commonNames: ['Green Anaconda', 'Green Anaconda/Anaconda'],
    searchAliases: ['green anaconda', 'anaconda', 'eunectes murinus'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Boidae', genus: 'Eunectes', speciesEpithet: 'murinus', synonyms: ['Boa murina'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Large South American semi-aquatic boid; taxonomy and distribution should be maintained independently of generic “boa” care.',
      lifestyle: ['semi-aquatic', 'terrestrial'], riskClass: 'specialist', husbandry: { evidenceLevel: 'limited,', notes: 'Requires dedicated large-bodied semi-aquatic husbandry research before keeper-facing parameters are published.', cohabitation: { recommendation: 'generally-single', rationale: 'Default to individual housing unless authoritative species-specific evidence indicates otherwise.' } },
      feeding: { evidenceLevel: 'moderate', dietaryGuild: 'generalist' }, breeding: { evidenceLevel: 'limited' }, safety: { medicallySignificantVenom: false, rearFangedOrVenomDelivery: false }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    id: 'crotalus-atrox',
    acceptedScientificName: 'Crotalus atrox',
    authorYear: 'BAIRD & GIRARD, 1853',
    commonNames: ['Western Diamond-backed Rattlesnake'],
    searchAliases: ['western diamondback', 'western diamond-backed rattlesnake', 'crotalus atrox'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Viperidae', genus: 'Crotalus', speciesEpithet: 'atrox', synonyms: ['Crotalus tortugensis'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'North American rattlesnake species in Viperidae.',
      lifestyle: ['terrestrial'], riskClass: 'venomous', husbandry: { evidenceLevel: 'limited', notes: 'Keeper-facing operational husbandry and handling content requires specialist venomous-snake safety review.', cohabitation: { recommendation: 'generally-single', rationale: 'Individual housing is the safe default for high-risk venomous snakes.' } },
      breeding: { evidenceLevel: 'moderate' }, safety: { medicallySignificantVenom: true, rearFangedOrVenomDelivery: false, handlingNotes: 'Specialist venomous-snake protocols apply; Tiny Titans should not present casual handling instructions.' }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
    }
  },
  {
    id: 'bitis-gabonica',
    acceptedScientificName: 'Bitis gabonica',
    authorYear: '(DUMÉRIL, BIBRON & DUMÉRIL, 1854)',
    commonNames: ['Gaboon Viper', 'Gaboon Adder'],
    searchAliases: ['gaboon viper', 'gaboon adder', 'bitis gabonica'],
    kingdom: 'Animalia', phylum: 'Chordata', class: 'Reptilia', order: 'Squamata',
    family: 'Viperidae', genus: 'Bitis', speciesEpithet: 'gabonica', synonyms: ['Bitis gabonica gabonica'],
    taxonStatus: 'accepted', taxonSource: taxonomySource,
    knowledge: {
      summary: 'Large African viper species; the Reptile Database explicitly flags this species as venomous.',
      distribution: 'Sub-Saharan Africa across a broad documented range.', lifestyle: ['terrestrial'], riskClass: 'venomous', husbandry: { evidenceLevel: 'limited', notes: 'Specialist venomous-snake husbandry and safety review required.', cohabitation: { recommendation: 'generally-single', rationale: 'Individual housing is the safe default for high-risk venomous snakes.' } },
      safety: { medicallySignificantVenom: true, rearFangedOrVenomDelivery: false, handlingNotes: 'Venomous species. Do not provide casual handling or extraction procedures.' }, breeding: { evidenceLevel: 'limited' }, sourceIds: [SPECIES_SOURCES.reptileDatabase2026.id], reviewedOn
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
