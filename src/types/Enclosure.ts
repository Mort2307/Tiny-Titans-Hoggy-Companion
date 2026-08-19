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

  // Size
  length: number;
  width: number;
  height: number;

  // Setup
  enclosureType: string;
  substrate: SubstrateType;
  customSubstrate?: string;
  substrateMix?: SubstrateMixPart[];

  // Heating
  heatingType: HeatingType;
  heatingDevice?: string;
  thermostat?: string;

  // Environment
  warmSideTemperature?: number;
  coolSideTemperature?: number;
  ambientTemperature?: number;
  baskingTemperature?: number;
  nightTemperature?: number;
  humidity?: number;
  environmentHistory?: EnvironmentHistoryEntry[];

  // Lighting
  uvbEnabled: boolean;
  uvbDetails?: string;
  uvbPhotoperiodHours?: number;

  // Enrichment
  hides: number;
  waterBowl: boolean;
  plants?: string[];
  decorations?: string[];

  // Bioactive
  bioactive: boolean;
  cleanupCrew?: string[];

  // Maintenance
  lastCleanedDate?: string;
  notes?: string;
};
