export type ShedStage = "Blue" | "Clear" | "Complete";
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

/**
 * One physical shedding cycle. Blue, Clear and Complete are stages of the
 * same cycle, never separate shed events.
 *
 * Legacy fields remain optional so existing Firestore records continue to
 * render while new records use the lifecycle fields below.
 */
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
