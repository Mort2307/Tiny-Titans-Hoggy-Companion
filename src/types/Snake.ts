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


export type SnakeSex =
  | "Male"
  | "Female"
  | "Unknown";


export type SnakeStatus =
  | "Active"
  | "Sold"
  | "Deceased"
  | "Archived";



export type Snake = {


id: string;



// Identity

name: string;

species: string;

photo: string;

sex: SnakeSex;


nickname?: string;

breeder?: string;

origin?: string;

acquisitionDate?: string;



// Genetics

morphs: string[];

customMorph: string;

hets: Het[];

customHets: string;



// Weight

startingWeight: number | null;

startingWeightDate: string;

weight: number | null;

lastWeighedDate: string;

weightHistory: WeightRecord[];



weightTracking: {

enabled: boolean;

frequency: WeightTrackingFrequency;

};



// Feeding

feedingHistory?: FeedingRecord[];



// Shedding

shedHistory?: ShedRecord[];



// Health

healthHistory?: HealthRecord[];



// Enclosure

enclosure?: Enclosure;



// Breeding

breedingHistory?: BreedingPairing[];



// Timeline

timeline?: TimelineEvent[];



// Timeline Dates

hatchDate: string;

arrivalDate: string;



// Husbandry notes

temperatureNotes?: string;

humidityNotes?: string;



// Feeding notes

lastMealDate?: string;

feedingNotes?: string;



// Health notes

healthNotes?: string;

medicationNotes?: string;



// Breeding notes

breedingEligible?: boolean;

breedingNotes?: string;



// General Notes

notes: string;



// Status

status?: SnakeStatus;


};