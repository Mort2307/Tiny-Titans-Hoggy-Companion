export type ShedStage = "Blue" | "Clear" | "Complete";
export type ShedQuality = "Perfect" | "Good" | "Partial" | "Difficult" | "Unknown";
export type ShedStatus = "Complete" | "Partial" | "Problematic";
export type RetainedShedArea = "Eye Cap" | "Head" | "Tail Tip" | "Body" | "Other";
export type ShedAssistance = "None" | "Monitoring Only" | "Humidity Adjustment" | "Keeper Intervention" | "Veterinary Assistance";
export type ShedInsightSeverity = "info" | "watch" | "action";

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
  cycleStartedAt?: string;
  clearPhaseAt?: string;
  completedAt?: string;
  currentStage?: ShedStage;
  cycleDurationDays?: number;
  bluePhaseStarted?: boolean;
  eyesSkinCleared?: boolean;
  shedCompleted?: boolean;
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
  lastModifiedBy?: string;
};

export type ShedIntelligence = {
  completeness: number;
  headline: string;
  summary: string;
  severity: ShedInsightSeverity;
  cycleStage: ShedStage | "None";
  activeDays: number | null;
  averageIntervalDays: number | null;
  averageDurationDays: number | null;
  retainedAreaFrequency: number;
  problematicCycleCount: number;
  insights: string[];
};
