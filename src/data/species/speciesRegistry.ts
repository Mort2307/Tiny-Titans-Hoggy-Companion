import { SPECIES_SOURCES } from './speciesSources';
import { INITIAL_SNAKE_SPECIES as BASE_SPECIES } from './speciesRegistryBase';
import { SPECIES_EXPANSION_CORE, SPECIES_EXPANSION_SOURCES } from './speciesExpansionCore';
import { SPECIES_EXPANSION_BATCH_3, SPECIES_EXPANSION_BATCH_3_SOURCES } from './speciesExpansionBatch3';
import type { SnakeSpeciesRecord } from './speciesTypes';

Object.assign(SPECIES_SOURCES, SPECIES_EXPANSION_SOURCES, SPECIES_EXPANSION_BATCH_3_SOURCES);

const ALL_SPECIES: SnakeSpeciesRecord[] = [...BASE_SPECIES, ...SPECIES_EXPANSION_CORE, ...SPECIES_EXPANSION_BATCH_3];
export const INITIAL_SNAKE_SPECIES = ALL_SPECIES;
export const SNAKE_SPECIES_BY_ID = Object.fromEntries(ALL_SPECIES.map((species) => [species.id, species])) as Record<string, SnakeSpeciesRecord>;

export function searchSnakeSpecies(query: string): SnakeSpeciesRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return ALL_SPECIES;
  return ALL_SPECIES.filter((species) => [species.acceptedScientificName, ...species.commonNames, ...species.searchAliases, ...(species.synonyms ?? [])].some((value) => value.toLowerCase().includes(normalized)));
}

export function findSnakeSpecies(value: string | null | undefined): SnakeSpeciesRecord | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return ALL_SPECIES.find((species) => [species.id, species.acceptedScientificName, ...species.commonNames, ...species.searchAliases, ...(species.synonyms ?? [])].some((candidate) => candidate.toLowerCase() === normalized))
    ?? ALL_SPECIES.find((species) => [species.acceptedScientificName, ...species.commonNames, ...species.searchAliases, ...(species.synonyms ?? [])].some((candidate) => candidate.toLowerCase().includes(normalized) || normalized.includes(candidate.toLowerCase())));
}
