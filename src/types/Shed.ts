export type ShedQuality =
  | "Perfect"
  | "Good"
  | "Partial"
  | "Difficult"
  | "Unknown";

export type ShedStatus =
  | "Complete"
  | "Partial";

export type RetainedShedArea =
  | "None"
  | "Eye Cap"
  | "Tail Tip"
  | "Body"
  | "Multiple Areas";

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
  retainedShedArea: RetainedShedArea;
  retainedEyeCaps: boolean;
  retainedTailTip: boolean;

  // Overall assessment
  quality: ShedQuality;
  assistance: ShedAssistance;

  // Measurements
  shedLength?: number;
  snakeWeight?: number;

  notes: string;
};