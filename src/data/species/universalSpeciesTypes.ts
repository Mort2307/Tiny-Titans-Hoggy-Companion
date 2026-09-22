export type UniversalSpeciesBrowseGroup =
  | 'snakes'
  | 'lizards'
  | 'turtles-tortoises'
  | 'crocodilians'
  | 'frogs-toads'
  | 'salamanders-newts'
  | 'caecilians'
  | 'spiders'
  | 'scorpions'
  | 'whip-spiders-vinegaroons'
  | 'insects'
  | 'millipedes'
  | 'centipedes'
  | 'molluscs'
  | 'crustaceans'
  | 'mammals'
  | 'birds'
  | 'fish'
  | 'cephalopods';

export type UniversalSpeciesClass =
  | 'reptile'
  | 'amphibian'
  | 'arachnid'
  | 'insect'
  | 'myriapod'
  | 'mollusc'
  | 'crustacean'
  | 'mammal'
  | 'bird'
  | 'fish'
  | 'cephalopod';

export type UniversalSpeciesRisk =
  | 'companion'
  | 'specialist'
  | 'venomous'
  | 'high-risk'
  | 'toxic';

export type UniversalLifestyle =
  | 'terrestrial'
  | 'arboreal'
  | 'semi-arboreal'
  | 'fossorial'
  | 'semi-fossorial'
  | 'aquatic'
  | 'semi-aquatic'
  | 'mixed';

export type UniversalDietaryGuild =
  | 'carnivore'
  | 'insectivore'
  | 'herbivore'
  | 'omnivore'
  | 'piscivore'
  | 'nectarivore'
  | 'granivore'
  | 'frugivore'
  | 'amphibian-specialist'
  | 'detritivore'
  | 'generalist';

export type UniversalEvidenceStatus =
  | 'taxonomy-verified'
  | 'ecology-verified'
  | 'husbandry-sourced'
  | 'specialist-reviewed'
  | 'needs-review';

export type RegulatoryCheckStatus =
  | 'not-assessed'
  | 'check'
  | 'potentially-regulated'
  | 'not-known-to-apply';

export interface UniversalSourceCitation {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedOn: string;
  purpose: 'taxonomy' | 'legislation' | 'conservation' | 'husbandry';
  notes?: string;
}

export interface UniversalSpeciesRecord {
  id: string;
  acceptedScientificName: string;
  commonNames: string[];
  searchAliases: string[];
  className: UniversalSpeciesClass;
  browseGroup: UniversalSpeciesBrowseGroup;
  taxonomicClass: string;
  order: string;
  family: string;
  genus: string;
  speciesEpithet: string;
  synonyms?: string[];
  taxonStatus: 'accepted' | 'provisional' | 'uncertain';
  taxonSourceId: string;
  evidenceStatus: UniversalEvidenceStatus;
  riskClass: UniversalSpeciesRisk;
  lifestyle: UniversalLifestyle[];
  dietaryGuild: UniversalDietaryGuild;
  summary: string;
  distribution?: string;
  habitat?: string;
  activityPattern?: 'diurnal' | 'nocturnal' | 'crepuscular' | 'cathemeral' | 'unknown';
  husbandryStatus: 'taxonomy-only' | 'ecology-only' | 'sourced-profile' | 'specialist-profile';
  husbandryNotes?: string;
  regulatory: {
    ukDwa: RegulatoryCheckStatus;
    cites: RegulatoryCheckStatus;
    invasiveSpecies: RegulatoryCheckStatus;
    locationDependent: boolean;
    note: string;
  };
  sourceIds: string[];
  reviewedOn: string;
  care?: import('./universalSpeciesCareTypes').UniversalSpeciesCare;
}

export interface UniversalSpeciesGroup {
  id: string;
  label: string;
  className: UniversalSpeciesClass;
  count: number;
  species: UniversalSpeciesRecord[];
}
