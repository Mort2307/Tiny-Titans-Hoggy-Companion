export type HusbandrySafetyStatus = "safe" | "caution" | "avoid" | "unknown";

export type HusbandrySafetyEvidenceLevel =
  | "high"
  | "moderate"
  | "limited"
  | "anecdotal"
  | "unknown";

export type HusbandrySafetyRegion =
  | "uk"
  | "us"
  | "europe"
  | "north-america"
  | "global";

export type HusbandrySafetyCategory =
  | "leaf-litter"
  | "wood-branches"
  | "bark"
  | "live-plants"
  | "dried-plants"
  | "moss"
  | "substrate"
  | "soil"
  | "sand"
  | "rock-stone"
  | "decor"
  | "artificial-plants"
  | "adhesive"
  | "sealant"
  | "paint-coating"
  | "cleaner-disinfectant"
  | "water-treatment"
  | "heating-material"
  | "lighting-material"
  | "feeding-accessory"
  | "feeder-product"
  | "household-material"
  | "other";

export type HusbandrySafetyScope = "species" | "class" | "all";

export interface HusbandrySafetyAssessment {
  scope: HusbandrySafetyScope;
  scopeId?: string;
  status: HusbandrySafetyStatus;
  reason: string;
  risks: string[];
  preparation: string[];
  alternatives: string[];
  evidenceLevel: HusbandrySafetyEvidenceLevel;
  evidenceNote: string;
  sourceIds: string[];
  reviewedOn: string;
}

export interface HusbandrySafetyItem {
  id: string;
  commonName: string;
  scientificName?: string;
  aliases: string[];
  category: HusbandrySafetyCategory;
  regions: HusbandrySafetyRegion[];
  summary: string;
  identificationWarning?: string;
  assessments: HusbandrySafetyAssessment[];
  archived?: boolean;
  updatedAt?: unknown;
  updatedByUid?: string;
}

export interface HusbandrySafetySource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedOn: string;
  kind: "husbandry-practice" | "botanical-toxicology" | "veterinary-toxicology" | "public-health";
  note: string;
}
