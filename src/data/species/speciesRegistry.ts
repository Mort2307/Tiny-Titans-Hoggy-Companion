import { SPECIES_SOURCES } from './speciesSources';
import { INITIAL_SNAKE_SPECIES as BASE_SPECIES } from './speciesRegistryBase';
import { SPECIES_EXPANSION_CORE, SPECIES_EXPANSION_SOURCES } from './speciesExpansionCore';
import { SPECIES_EXPANSION_BATCH_3, SPECIES_EXPANSION_BATCH_3_SOURCES } from './speciesExpansionBatch3';
import { SPECIES_EXPANSION_BATCH_4 } from './speciesExpansionBatch4';
import { SPECIES_EXPANSION_BATCH_5 } from './speciesExpansionBatch5';
import { SPECIES_EXPANSION_BATCH_6 } from './speciesExpansionBatch6';
import { SPECIES_EXPANSION_BATCH_7 } from './speciesExpansionBatch7';
import { SPECIES_EXPANSION_BATCH_8 } from './speciesExpansionBatch8';
import { SPECIES_EXPANSION_BATCH_9 } from './speciesExpansionBatch9';
import { SPECIES_RESEARCH_SOURCES } from './speciesResearchSources';
import { enhanceVenomousSpecies } from './speciesVenomousEnhancement';
import { completeSpeciesHusbandry } from './speciesHusbandryCompletion';
import { ensureSpeciesHusbandryEvidence } from './speciesEvidence';
import { applySpeciesResearchOverrides } from './speciesResearchOverrides';
import type { SnakeSpeciesRecord } from './speciesTypes';

Object.assign(SPECIES_SOURCES, SPECIES_EXPANSION_SOURCES, SPECIES_EXPANSION_BATCH_3_SOURCES, SPECIES_RESEARCH_SOURCES);

const RAW_SPECIES: SnakeSpeciesRecord[] = [
  ...BASE_SPECIES,
  ...SPECIES_EXPANSION_CORE,
  ...SPECIES_EXPANSION_BATCH_3,
  ...SPECIES_EXPANSION_BATCH_4,
  ...SPECIES_EXPANSION_BATCH_5,
  ...SPECIES_EXPANSION_BATCH_6,
  ...SPECIES_EXPANSION_BATCH_7,
  ...SPECIES_EXPANSION_BATCH_8,
  ...SPECIES_EXPANSION_BATCH_9,
];

/** Every registered species leaves this boundary with explicit husbandry and evidence metadata. */
const ALL_SPECIES: SnakeSpeciesRecord[] = RAW_SPECIES
  .map(completeSpeciesHusbandry)
  .map(ensureSpeciesHusbandryEvidence)
  .map(applySpeciesResearchOverrides)
  .map(enhanceVenomousSpecies);

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
