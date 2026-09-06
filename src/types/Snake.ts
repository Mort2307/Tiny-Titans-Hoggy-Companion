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

export type GeneticEvidenceKind = "scientific-literature" | "specialist-database" | "breeder-record" | "community" | "keeper-recorded";
export type GeneticConfidence = "high" | "moderate" | "low" | "unknown";

export type AnimalGeneticsGeneRecord = {
  geneId: string;
  status: "confirmed" | "probable" | "possible" | "unresolved" | "clear";
  copies?: 1 | 2;
  evidenceKind: GeneticEvidenceKind;
  confidence: GeneticConfidence;
  sources?: string[];
  notes?: string;
};

export type AnimalGeneticsLocusRecord = {
  locusId: string;
  alleleA: string;
  alleleB: string;
  status: "confirmed" | "probable" | "possible" | "unresolved";
  evidenceKind: GeneticEvidenceKind;
  confidence: GeneticConfidence;
  sources?: string[];
  notes?: string;
};

export type AnimalGeneticsProfile = {
  speciesId: string;
  genes?: AnimalGeneticsGeneRecord[];
  loci?: AnimalGeneticsLocusRecord[];
  visualMorphs?: string[];
  lastVerifiedAt?: string;
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
  /** Structured, evidence-aware genetics used by the authoritative calculator when present. */
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
