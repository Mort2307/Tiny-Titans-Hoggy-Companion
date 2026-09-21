import type {
  UniversalDietaryGuild,
  UniversalLifestyle,
  UniversalSpeciesClass,
} from './universalSpeciesTypes';

export type UniversalCareStatus =
  | 'baseline'
  | 'sourced-profile'
  | 'specialist-reviewed'
  | 'needs-review';

export type UniversalCareBasis =
  | 'species-specific'
  | 'locality-specific'
  | 'taxon-level'
  | 'genus-level'
  | 'class-level'
  | 'general-veterinary'
  | 'ecology-only';

export type CarePriority = 'essential' | 'important' | 'conditional';
export type HealthPriority = 'monitor' | 'prompt-vet' | 'urgent-vet';
export type RequirementDomain =
  | 'housing'
  | 'environment'
  | 'water'
  | 'lighting'
  | 'substrate'
  | 'feeding'
  | 'social'
  | 'enrichment'
  | 'biosecurity'
  | 'monitoring'
  | 'legal';

export interface UniversalCareEvidence {
  basis: UniversalCareBasis;
  sourceIds: string[];
  caveat: string;
  reviewedOn: string;
}

export interface UniversalCareRequirement {
  id: string;
  domain: RequirementDomain;
  label: string;
  guidance: string;
  priority: CarePriority;
  conditional?: string;
  evidence: UniversalCareEvidence;
}

export interface UniversalHusbandryProfile {
  status: UniversalCareStatus;
  scopeKey: string;
  title: string;
  overview: string;
  ecologyContext: {
    className: UniversalSpeciesClass;
    lifestyle: UniversalLifestyle[];
    dietaryGuild: UniversalDietaryGuild;
  };
  requirements: UniversalCareRequirement[];
  numericGuidance: {
    available: boolean;
    note: string;
  };
  unresolved: string[];
  sourceIds: string[];
  reviewedOn: string;
}

export interface UniversalHealthWatch {
  id: string;
  concern: string;
  watchFor: string[];
  riskFactors: string[];
  prevention: string;
  priority: HealthPriority;
  evidence: UniversalCareEvidence;
}

export interface UniversalHealthProfile {
  status: UniversalCareStatus;
  scopeKey: string;
  baseline: string[];
  watches: UniversalHealthWatch[];
  quarantine: {
    guidance: string;
    separateTools: boolean;
    separateEquipment: boolean;
    sourceIds: string[];
  };
  veterinary: {
    guidance: string;
    speciesSpecificVetRecommended: boolean;
    emergencyNote: string;
  };
  unresolved: string[];
  sourceIds: string[];
  reviewedOn: string;
}

export interface UniversalSpeciesCare {
  status: UniversalCareStatus;
  resolvedFrom: string[];
  husbandry: UniversalHusbandryProfile;
  health: UniversalHealthProfile;
  summary: string;
}
