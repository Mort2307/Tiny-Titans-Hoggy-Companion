import type { Het } from "./genetics";
import type { WeightRecord } from "./Weight";
import type { FeedingRecord } from "./Feeding";
import type { ShedRecord } from "./Shed";
import type { HealthRecord } from "./Health";
import type { BreedingPairing } from "./Breeding";
import type { Enclosure } from "./Enclosure";
import type { TimelineEvent } from "./Timeline";

export type WeightTrackingFrequency = "Weekly" | "Fortnightly" | "Every 3 Weeks" | "Monthly";
export type SnakeSex = "Male" | "Female" | "Unknown";
export type SnakeStatus = "Active" | "Sold" | "Deceased" | "Archived";

export type GeneticEvidenceKind =
  | "genetic-test"
  | "breeder-documented"
  | "parent-derived"
  | "offspring-confirmed"
  | "keeper-recorded"
  | "community-observation";
export type GeneticConfidence = "high" | "medium" | "low" | "unknown";
export type AnimalGeneStatus = "confirmed" | "probable" | "possible" | "excluded";
export type AnimalGeneCopies = 0 | 1 | 2 | "unknown";

export type AnimalGeneticEvidence = {
  geneId: string;
  copies: AnimalGeneCopies;
  status: AnimalGeneStatus;
  evidence: GeneticEvidenceKind;
  confidence: GeneticConfidence;
  note?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  recordedAt?: string;
};

export type AnimalGeneticLocusState = {
  locusId: string;
  alleleA: string;
  alleleB: string;
  status: Extract<AnimalGeneStatus, "confirmed" | "probable" | "possible">;
  confidence: GeneticConfidence;
  evidence?: GeneticEvidenceKind;
  note?: string;
};

export type AnimalGeneticsProfile = {
  speciesId: string;
  visualMorphs: string[];
  genes: AnimalGeneticEvidence[];
  loci?: AnimalGeneticLocusState[];
  updatedAt?: string;
  notes?: string;
};

export type FeedingSchedule = {
  enabled: boolean;
  intervalDays: number;
  nextFeedingDate: string;
  notificationsEnabled: boolean;
  preparationReminderEnabled: boolean;
  preparationReminderDaysBefore: number;
  preparationReminderTime: string;
};

export type Snake = {
  id: string;
  name: string;
  species: string;
  photo: string;
  imageUrl?: string;
  photoUrl?: string;
  sex: SnakeSex;
  nickname?: string;
  breeder?: string;
  origin?: string;
  acquisitionDate?: string;
  morphs: string[];
  customMorph: string;
  hets: Het[];
  customHets: string;
  /** Structured genetics provenance. Legacy morphs/hets remain supported during migration. */
  geneticsProfile?: AnimalGeneticsProfile;
  startingWeight: number | null;
  startingWeightDate: string;
  weight: number | null;
  lastWeighedDate: string;
  weightHistory: WeightRecord[];
  weightTracking: { enabled: boolean; frequency: WeightTrackingFrequency };
  lengthCm?: number | null;
  feedingHistory?: FeedingRecord[];
  feedingSchedule?: FeedingSchedule;
  shedHistory?: ShedRecord[];
  healthHistory?: HealthRecord[];
  enclosure?: Enclosure;
  breedingHistory?: BreedingPairing[];
  timeline?: TimelineEvent[];
  hatchDate: string;
  arrivalDate: string;
  temperatureNotes?: string;
  humidityNotes?: string;
  lastMealDate?: string;
  feedingNotes?: string;
  healthNotes?: string;
  medicationNotes?: string;
  breedingEligible?: boolean;
  breedingNotes?: string;
  notes: string;
  status?: SnakeStatus;
};
