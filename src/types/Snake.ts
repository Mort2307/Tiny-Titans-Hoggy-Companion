import type { Het } from "./genetics";
import type { WeightRecord } from "./Weight";
import type { FeedingRecord } from "./Feeding";
import type { ShedRecord } from "./Shed";
import type { HealthRecord } from "./Health";
import type { BreedingPairing } from "./Breeding";
import type { Enclosure } from "./Enclosure";
import type { TimelineEvent } from "./Timeline";

export type WeightTrackingFrequency =
  | "Weekly"
  | "Fortnightly"
  | "Every 3 Weeks"
  | "Monthly";

export type SnakeSex = "Male" | "Female" | "Unknown";
export type SnakeStatus = "Active" | "Sold" | "Deceased" | "Archived";

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
  sex: SnakeSex;
  nickname?: string;
  breeder?: string;
  origin?: string;
  acquisitionDate?: string;
  morphs: string[];
  customMorph: string;
  hets: Het[];
  customHets: string;
  startingWeight: number | null;
  startingWeightDate: string;
  weight: number | null;
  lastWeighedDate: string;
  weightHistory: WeightRecord[];
  weightTracking: { enabled: boolean; frequency: WeightTrackingFrequency };
  /** Most recently recorded body length in centimetres. Optional so older records remain valid. */
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
