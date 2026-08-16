export type ShedQuality = "Perfect" | "Good" | "Partial" | "Difficult" | "Unknown";
export type ShedStatus = "Complete" | "Partial" | "Problematic";
export type RetainedShedArea = "Eye Cap" | "Head" | "Tail Tip" | "Body" | "Other";
export type ShedAssistance = "None" | "Monitoring Only" | "Humidity Adjustment" | "Keeper Intervention" | "Veterinary Assistance";

export type ShedPhoto = {
  id: string;
  url: string;
  storagePath: string;
  name?: string;
  uploadedAt: string;
};

export type ShedRecord = {
  id: string;
  snakeId: string;
  date: string;
  bluePhaseStarted: boolean;
  eyesSkinCleared: boolean;
  shedCompleted: boolean;
  retainedShedArea: RetainedShedArea | "None" | "Multiple Areas";
  retainedAreas: RetainedShedArea[];
  retainedEyeCaps: boolean;
  retainedTailTip: boolean;
  status: ShedStatus;
  quality: ShedQuality;
  assistance: ShedAssistance;
  shedLength?: number;
  snakeWeight?: number;
  notes: string;
  photos?: ShedPhoto[];
  deletedAt?: string;
};
