export type EvidenceLevel = 'high' | 'moderate' | 'limited' | 'unknown';
export type SpeciesRiskClass = 'companion' | 'specialist' | 'venomous' | 'high-risk';
export type ActivityPattern = 'diurnal' | 'nocturnal' | 'crepuscular' | 'cathemeral' | 'unknown';
export type Lifestyle = 'terrestrial' | 'arboreal' | 'semi-arboreal' | 'fossorial' | 'semi-fossorial' | 'aquatic' | 'semi-aquatic' | 'mixed' | 'unknown';

export interface SourceCitation {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedOn: string;
  evidenceLevel: EvidenceLevel;
  notes?: string;
}

export interface NumericRange {
  min: number;
  max: number;
  unit: string;
  context?: string;
}

export interface HusbandryProfile {
  evidenceLevel: EvidenceLevel;
  temperature?: {
    basking?: NumericRange;
    warmSide?: NumericRange;
    coolSide?: NumericRange;
    night?: NumericRange;
    seasonal?: string;
    notes?: string;
  };
  humidity?: {
    target?: NumericRange;
    acceptable?: NumericRange;
    seasonal?: string;
    notes?: string;
  };
  enclosure?: {
    habitatType?: Lifestyle[];
    substrate?: string[];
    hides?: string;
    climbing?: boolean;
    water?: string;
    ventilation?: string;
    lighting?: string;
    enrichment?: string[];
    notes?: string;
  };
  cohabitation?: {
    recommendation: 'avoid' | 'generally-single' | 'conditional' | 'species-specific' | 'unknown';
    rationale: string;
  };
}

export interface FeedingProfile {
  evidenceLevel: EvidenceLevel;
  dietaryGuild?: 'carnivore' | 'insectivore' | 'piscivore' | 'amphibian-specialist' | 'generalist' | 'unknown';
  preyCategories?: string[];
  notes?: string;
}

export interface SpeciesKnowledgeProfile {
  summary: string;
  distribution?: string;
  habitat?: string;
  activityPattern?: ActivityPattern;
  lifestyle?: Lifestyle[];
  riskClass: SpeciesRiskClass;
  husbandry?: HusbandryProfile;
  feeding?: FeedingProfile;
  breeding?: {
    notes?: string;
    seasonalCycling?: string;
    evidenceLevel: EvidenceLevel;
  };
  safety?: {
    medicallySignificantVenom?: boolean;
    rearFangedOrVenomDelivery?: boolean;
    handlingNotes?: string;
  };
  sourceIds: string[];
  reviewedOn: string;
}

export interface SnakeSpeciesRecord {
  id: string;
  acceptedScientificName: string;
  authorYear?: string;
  commonNames: string[];
  searchAliases: string[];
  kingdom: 'Animalia';
  phylum: 'Chordata';
  class: 'Reptilia';
  order: 'Squamata';
  family: string;
  genus: string;
  speciesEpithet: string;
  synonyms?: string[];
  taxonStatus: 'accepted' | 'provisional' | 'synonym' | 'uncertain';
  taxonSource: string;
  knowledge: SpeciesKnowledgeProfile;
}
