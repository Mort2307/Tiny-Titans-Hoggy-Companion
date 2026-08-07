export type ShedQuality =
  | "Perfect"
  | "Good"
  | "Partial"
  | "Difficult"
  | "Unknown";


export type ShedRecord = {

  id: string;

  snakeId: string;

  date: string;

  quality: ShedQuality;

  complete: boolean;

  retainedEyeCaps: boolean;

  retainedTailTip: boolean;

  notes: string;

};