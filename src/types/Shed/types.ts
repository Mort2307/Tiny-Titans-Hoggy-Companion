export type ShedQuality =
  | "Perfect"
  | "Good"
  | "Partial"
  | "Difficult"
  | "Unknown";


export type ShedRecord = {

  id: string;

  snakeId: string;


  // Date shed occurred
  date: string;


  // Shed information

  quality: ShedQuality;


  // Whether the eye caps/tail came off
  complete: boolean;


  retainedEyeCaps: boolean;

  retainedTailTip: boolean;


  // Length tracking

  snakeLength?: number;


  // Notes

  notes: string;

};