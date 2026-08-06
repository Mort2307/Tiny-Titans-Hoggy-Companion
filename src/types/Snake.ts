import type { Het } from "./genetics";
import type { WeightRecord } from "./Weight";


export type WeightTrackingFrequency =

  | "Weekly"

  | "Fortnightly"

  | "Every 3 Weeks"

  | "Monthly";



export type Snake = {


  id: string;


  name: string;


  species: string;


  photo: string;


  sex: "Male" | "Female" | "Unknown";



  // Genetics

  morphs: string[];

  customMorph: string;

  hets: Het[];

  customHets: string;




  // Weight Tracking

  startingWeight: number | null;

  startingWeightDate: string;

  weight: number | null;

  lastWeighedDate: string;

  weightHistory: WeightRecord[];




  // Growth Tracking Settings

  weightTracking: {

    enabled: boolean;

    frequency: WeightTrackingFrequency;

  };




  // Timeline

  hatchDate: string;

  arrivalDate: string;




  // Notes

  notes: string;


};