export type EggStatus = "Unknown" | "Fertile" | "Infertile" | "Developing" | "Pipped" | "Hatched" | "Lost";

export type EggRecord = {
  id: string;
  projectId: string;
  clutchId: string;
  eggNumber: number;
  status: EggStatus;
  weightG?: number;
  incubationStart?: string;
  medium?: string;
  container?: string;
  targetTemperatureC?: number;
  observation?: string;
  lastChecked?: string;
  pipDate?: string;
  hatchDate?: string;
  outcome?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type IncubationPlan = {
  projectId: string;
  clutchId: string;
  method?: string;
  medium?: string;
  container?: string;
  targetTemperatureC?: number;
  monitoringFrequency?: string;
  backupPlan?: string;
  knownUncertainty?: string;
  startDate?: string;
  expectedWindowNote?: string;
  updatedAt?: unknown;
};
