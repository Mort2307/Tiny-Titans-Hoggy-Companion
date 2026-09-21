import { INITIAL_SNAKE_SPECIES } from './speciesRegistry';
import { UNIVERSAL_TAXON_SOURCE_BY_CLASS } from './universalSpeciesSources';
import type { UniversalSpeciesRecord, UniversalSpeciesGroup, UniversalSpeciesRisk } from './universalSpeciesTypes';
import type { UniversalSpeciesSeed } from './universalSpeciesSeedTypes';
import { UNIVERSAL_REPTILE_SEEDS } from './universalSpeciesSeedReptiles';
import { UNIVERSAL_AMPHIBIAN_SEEDS } from './universalSpeciesSeedAmphibians';
import { UNIVERSAL_ARACHNID_SEEDS } from './universalSpeciesSeedArachnids';
import { UNIVERSAL_INVERTEBRATE_SEEDS } from './universalSpeciesSeedInvertebrates';
import { UNIVERSAL_EXOTIC_SEEDS } from './universalSpeciesSeedExotics';
import { rankSearchResults } from '../../utils/searchRanking';

const CLASS_LABELS: Record<UniversalSpeciesRecord['className'], string> = {
  reptile: 'Reptiles',
  amphibian: 'Amphibians',
  arachnid: 'Arachnids',
  insect: 'Insects',
  myriapod: 'Myriapods',
  mollusc: 'Molluscs',
  crustacean: 'Crustaceans',
  mammal: 'Mammals',
  bird: 'Birds',
  fish: 'Fish',
  cephalopod: 'Cephalopods',
};

const CLASS_SUMMARIES: Record<UniversalSpeciesRecord['className'], string> = {
  reptile: 'Taxonomy-first reptile record. Species-specific husbandry is only enabled when an explicit evidence profile has been reviewed.',
  amphibian: 'Taxonomy-first amphibian record. Amphibian husbandry is highly species- and life-stage-dependent and must be evidence-led.',
  arachnid: 'Taxonomy-first arachnid record. Spider/scorpion husbandry varies substantially by species, locality and life history.',
  insect: 'Taxonomy-first insect record. Husbandry should follow the species ecology, lifecycle and verified captive evidence.',
  myriapod: 'Taxonomy-first myriapod record. Moisture, substrate chemistry and ventilation are species-dependent.',
  mollusc: 'Taxonomy-first mollusc record. Species, legal status and humidity requirements must be checked before acquisition.',
  crustacean: 'Taxonomy-first crustacean record. Aquatic or semi-aquatic parameters must not be inferred from a related species.',
  mammal: 'Taxonomy-first mammal record. Exotic mammal welfare requires species-specific diet, social, enrichment and veterinary review.',
  bird: 'Taxonomy-first bird record. Avian husbandry is species-specific and legal/conservation checks may apply.',
  fish: 'Taxonomy-first fish record. Water chemistry and system design require species-specific evidence.',
  cephalopod: 'Taxonomy-first cephalopod record. Specialist marine-system requirements and advanced husbandry evidence are required.',
};

const genericRegulationNote = 'Legal status is location-dependent. Check current CITES/Species+ records, UK Dangerous Wild Animals rules where relevant, invasive non-native species controls and local import/keeping requirements before acquisition or movement.';

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function deriveGenus(scientific: string): string {
  return scientific.trim().split(/\s+/)[0] ?? scientific;
}

function deriveEpithet(scientific: string): string {
  return scientific.trim().split(/\s+/)[1] ?? scientific;
}

function riskToDwa(risk: UniversalSpeciesRisk): 'check' | 'potentially-regulated' {
  return risk === 'venomous' || risk === 'high-risk' ? 'potentially-regulated' : 'check';
}

function buildSeedRecord(seed: UniversalSpeciesSeed): UniversalSpeciesRecord {
  const id = slug(seed.scientific);
  const taxonSourceId = UNIVERSAL_TAXON_SOURCE_BY_CLASS[seed.className];
  const aliases = [...seed.aliases, seed.common.toLowerCase(), seed.scientific.toLowerCase()];
  const invasiveSpecies = ['trachemys scripta', 'procambarus clarkii', 'lissachatina fulica', 'pacifastacus leniusculus'].includes(seed.scientific.toLowerCase())
    ? 'potentially-regulated' as const
    : 'check' as const;

  return {
    id,
    acceptedScientificName: seed.scientific,
    commonNames: [seed.common],
    searchAliases: [...new Set(aliases)],
    className: seed.className,
    taxonomicClass: seed.taxonomicClass,
    order: seed.order || 'not-recorded',
    family: seed.family,
    genus: deriveGenus(seed.scientific),
    speciesEpithet: deriveEpithet(seed.scientific),
    taxonStatus: 'provisional',
    taxonSourceId,
    evidenceStatus: 'needs-review',
    riskClass: seed.riskClass,
    lifestyle: seed.lifestyle,
    dietaryGuild: seed.dietaryGuild,
    summary: CLASS_SUMMARIES[seed.className],
    husbandryStatus: 'taxonomy-only',
    husbandryNotes: 'No numeric husbandry targets are published from this universal seed record. Promote only after species-specific evidence has been attached and reviewed.',
    regulatory: {
      ukDwa: riskToDwa(seed.riskClass),
      cites: 'check',
      invasiveSpecies,
      locationDependent: true,
      note: genericRegulationNote,
    },
    sourceIds: [taxonSourceId],
    reviewedOn: '2026-09-21',
  };
}

function adaptSnakeRecord(snake: (typeof INITIAL_SNAKE_SPECIES)[number]): UniversalSpeciesRecord {
  const feedingMap: Record<string, UniversalSpeciesRecord['dietaryGuild']> = {
    carnivore: 'carnivore',
    insectivore: 'insectivore',
    herbivore: 'herbivore',
    omnivore: 'omnivore',
    piscivore: 'piscivore',
    'amphibian-specialist': 'amphibian-specialist' as UniversalSpeciesRecord['dietaryGuild'],
  };
  const sourceId = snake.taxonSource || UNIVERSAL_TAXON_SOURCE_BY_CLASS.reptile;
  const husbandry = snake.knowledge.husbandry;
  const risk = snake.knowledge.riskClass;
  return {
    id: snake.id,
    acceptedScientificName: snake.acceptedScientificName,
    commonNames: snake.commonNames,
    searchAliases: [...snake.searchAliases, ...(snake.synonyms ?? [])],
    className: 'reptile',
    taxonomicClass: 'Reptilia',
    order: 'Squamata',
    family: snake.family,
    genus: snake.genus,
    speciesEpithet: snake.speciesEpithet,
    synonyms: snake.synonyms,
    taxonStatus: snake.taxonStatus === 'accepted' ? 'accepted' : 'provisional',
    taxonSourceId: sourceId,
    evidenceStatus: husbandry?.evidenceLevel === 'high' ? 'husbandry-sourced' : 'ecology-verified',
    riskClass: risk,
    lifestyle: snake.knowledge.lifestyle ?? [],
    dietaryGuild: feedingMap[snake.knowledge.feeding?.dietaryGuild ?? 'generalist'] ?? 'generalist',
    summary: snake.knowledge.summary,
    distribution: snake.knowledge.distribution,
    habitat: snake.knowledge.habitat,
    activityPattern: snake.knowledge.activityPattern,
    husbandryStatus: husbandry ? (husbandry.evidenceLevel === 'limited' ? 'sourced-profile' : 'specialist-profile') : 'taxonomy-only',
    husbandryNotes: husbandry?.enclosure?.notes,
    regulatory: {
      ukDwa: riskToDwa(risk),
      cites: 'check',
      invasiveSpecies: 'check',
      locationDependent: true,
      note: genericRegulationNote,
    },
    sourceIds: [...new Set([sourceId, ...snake.knowledge.sourceIds])],
    reviewedOn: snake.knowledge.reviewedOn,
  };
}

const SEEDS: UniversalSpeciesSeed[] = [
  ...UNIVERSAL_REPTILE_SEEDS,
  ...UNIVERSAL_AMPHIBIAN_SEEDS,
  ...UNIVERSAL_ARACHNID_SEEDS,
  ...UNIVERSAL_INVERTEBRATE_SEEDS,
  ...UNIVERSAL_EXOTIC_SEEDS,
];

const existingSnakeRecords = INITIAL_SNAKE_SPECIES.map(adaptSnakeRecord);
const existingIds = new Set(existingSnakeRecords.map((species) => species.id));

const seededRecords = SEEDS
  .map(buildSeedRecord)
  .filter((species) => !existingIds.has(species.id));

export const UNIVERSAL_SPECIES: UniversalSpeciesRecord[] = [
  ...existingSnakeRecords,
  ...seededRecords,
];

export const UNIVERSAL_SPECIES_BY_ID = Object.fromEntries(
  UNIVERSAL_SPECIES.map((species) => [species.id, species]),
) as Record<string, UniversalSpeciesRecord>;

export function searchUniversalSpecies(query: string): UniversalSpeciesRecord[] {
  const raw = query.trim();
  if (!raw) return UNIVERSAL_SPECIES;
  return rankSearchResults(raw, UNIVERSAL_SPECIES, (species) => ({
    canonical: [species.commonNames[0] ?? '', species.acceptedScientificName, species.id],
    aliases: species.searchAliases,
    secondary: [species.genus, species.speciesEpithet, species.family, species.order, species.className],
  })).map(({ item }) => item);
}

export function findUniversalSpecies(value: string | null | undefined): UniversalSpeciesRecord | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return searchUniversalSpecies(raw)[0];
}

export function buildUniversalSpeciesGroups(species = UNIVERSAL_SPECIES): UniversalSpeciesGroup[] {
  const groups = new Map<string, UniversalSpeciesRecord[]>();
  for (const record of species) {
    const key = record.className;
    const bucket = groups.get(key) ?? [];
    bucket.push(record);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries())
    .map(([className, records]) => ({
      id: className,
      label: CLASS_LABELS[className as UniversalSpeciesRecord['className']],
      className: className as UniversalSpeciesRecord['className'],
      count: records.length,
      species: [...records].sort((a, b) =>
        (a.commonNames[0] ?? a.acceptedScientificName).localeCompare(b.commonNames[0] ?? b.acceptedScientificName),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const UNIVERSAL_SPECIES_GROUPS = buildUniversalSpeciesGroups();
export const UNIVERSAL_SPECIES_STATS = Object.fromEntries(
  Object.entries(CLASS_LABELS).map(([className, label]) => [
    className,
    {
      className,
      label,
      count: UNIVERSAL_SPECIES.filter((species) => species.className === className).length,
      taxonomyOnly: UNIVERSAL_SPECIES.filter((species) => species.className === className && species.husbandryStatus === 'taxonomy-only').length,
    },
  ]),
);
