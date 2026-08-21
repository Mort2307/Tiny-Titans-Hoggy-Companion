export type BreedingCyclePhase =
  | "Planning"
  | "Conditioning"
  | "Cooling"
  | "Rewarming"
  | "Pairing"
  | "Reproductive Monitoring"
  | "Gravid"
  | "Laying"
  | "Post-Lay Recovery"
  | "Incubation"
  | "Hatching"
  | "Complete";

export type BreedingCycleEventKind =
  | "note"
  | "weight"
  | "feeding"
  | "health"
  | "temperature"
  | "cooling-start"
  | "cooling-check"
  | "rewarming-start"
  | "pairing-observation"
  | "ovulation-observation"
  | "shed-observation"
  | "gravid-observation"
  | "laying-observation"
  | "recovery-check"
  | "incubation-check"
  | "hatch-observation"
  | "decision";

export type BreedingCycleEvent = {
  id: string;
  projectId: string;
  phase: BreedingCyclePhase;
  kind: BreedingCycleEventKind;
  date: string;
  animalId?: string;
  temperatureC?: number;
  weightG?: number;
  observation?: string;
  action?: string;
  concern?: string;
  confidence?: "High" | "Moderate" | "Low" | "Unknown";
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BreedingCyclePlan = {
  projectId: string;
  currentPhase: BreedingCyclePhase;
  method?: string;
  targetTemperatureC?: number;
  plannedStart?: string;
  plannedEnd?: string;
  monitoringFrequency?: string;
  equipment?: string;
  backupPlan?: string;
  keeperDecision?: string;
  uncertainty?: string;
  updatedAt?: unknown;
};
