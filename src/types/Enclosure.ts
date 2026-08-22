import type { EquipmentMaintenanceItem } from "./EquipmentMaintenance";

export type HeatingType =
  | "Heat Mat"
  | "CHE"
  | "Halogen"
  | "Deep Heat Projector"
  | "Radiant Heat Panel"
  | "Other";

export type SubstrateType =
  | "Aspen"
  | "Coco Fibre"
  | "Bioactive"
  | "Soil Mix"
  | "Sand Mix"
  | "Other";

export type SubstrateMixPart = {
  material: string;
  percentage: number;
};

export type EnvironmentHistoryEntry = {
  id: string;
  snakeId: string;
  enclosureId: string;
  recordedAt: string;
  source: "manual" | "device";
  warmSideTemperature?: number;
  coolSideTemperature?: number;
  ambientTemperature?: number;
  baskingTemperature?: number;
  nightTemperature?: number;
  humidity?: number;
  heatingType: HeatingType;
  heatingDevice?: string;
  thermostat?: string;
};

export type Enclosure = {
  id: string;
  snakeId: string;

  length: number;
  width: number;
  height: number;

  enclosureType: string;
  substrate: SubstrateType;
  customSubstrate?: string;
  substrateMix?: SubstrateMixPart[];

  heatingType: HeatingType;
  heatingDevice?: string;
  thermostat?: string;

  warmSideTemperature?: number;
  coolSideTemperature?: number;
  ambientTemperature?: number;
  baskingTemperature?: number;
  nightTemperature?: number;
  humidity?: number;
  environmentHistory?: EnvironmentHistoryEntry[];

  uvbEnabled: boolean;
  uvbDetails?: string;
  uvbPhotoperiodHours?: number;

  hides: number;
  waterBowl: boolean;
  plants?: string[];
  decorations?: string[];

  bioactive: boolean;
  cleanupCrew?: string[];

  lastCleanedDate?: string;
  equipmentMaintenance?: EquipmentMaintenanceItem[];
  notes?: string;
};
