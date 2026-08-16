export type ShedQuality =
  | "Perfect"
  | "Good"
  | "Partial"
  | "Difficult"
  | "Unknown";

export type ShedStatus =
  | "Complete"
  | "Partial"
  | "Problematic";

export type RetainedShedArea =
  | "Eye Cap"
  | "Head"
  | "Tail Tip"
  | "Body"
  | "Other";

export type ShedAssistance =
  | "None"
  | "Monitoring Only"
  | "Humidity Adjustment"
  | "Keeper Intervention"
  | "Veterinary Assistance";

export type ShedRecord = {
  id: string;
  snakeId: string;
  date: string;

  // Shed cycle
  bluePhaseStarted: boolean;
  eyesSkinCleared: boolean;
  shedCompleted: boolean;

  // Inspection
  // retainedShedArea is kept for backwards compatibility with existing records.
  retainedShedArea: RetainedShedArea | "None" | "Multiple Areas";
  retainedAreas: RetainedShedArea[];
  retainedEyeCaps: boolean;
  retainedTailTip: boolean;

  // Overall assessment
  status: ShedStatus;
  quality: ShedQuality;
  assistance: ShedAssistance;

  // Measurements
  shedLength?: number;
  snakeWeight?: number;

  // Keeper observations
  notes: string;
};
