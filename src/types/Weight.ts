export type WeightUnit =
  | "g"
  | "kg";



export type WeightRecord = {

  id: string;

  date: string;

  weight: number;

  unit: WeightUnit;


  // Optional notes for unusual events
  notes?: string;


  // Context of weighing
  reason?:
    | "Routine"
    | "Post Feed"
    | "Pre Brumation"
    | "Post Brumation"
    | "Health Check"
    | "Other";

};