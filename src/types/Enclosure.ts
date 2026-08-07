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



  // Heating

  heatingType: HeatingType;


  heatingDevice?: string;


  thermostat?: string;



  // Environment

  warmSideTemperature?: number;


  coolSideTemperature?: number;


  baskingTemperature?: number;


  humidity?: number;



  // Lighting

  uvbEnabled: boolean;


  uvbDetails?: string;



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