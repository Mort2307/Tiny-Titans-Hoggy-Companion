export type BreedingStatus =
  | "Planned"
  | "Paired"
  | "Locked"
  | "Gravid"
  | "Laid"
  | "Complete"
  | "Failed";



export type BreedingPairing = {

  id: string;


  maleId: string;


  femaleId: string;


  pairingDate: string;


  status: BreedingStatus;


  notes?: string;


  expectedTraits?: string[];

};




export type EggClutch = {

  id: string;


  pairingId: string;


  laidDate: string;


  eggCount: number;


  viableEggs?: number;


  infertileEggs?: number;


  incubatorTemperature?: number;


  incubationDays?: number;


  notes?: string;

};




export type HatchlingRecord = {

  id: string;


  clutchId: string;


  hatchDate: string;


  name?: string;


  sex:
    | "Male"
    | "Female"
    | "Unknown";


  morph?: string;


  hets?: string[];


  weightAtHatch?: number;


  notes?: string;

};