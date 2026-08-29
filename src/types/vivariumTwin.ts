export type VivariumRepresentationMode = "photo" | "manual" | "hybrid";

export type VivariumSubstrateType =
  | "aspen"
  | "bio"
  | "coco"
  | "sand"
  | "soil"
  | "paper"
  | "lignocel"
  | "mixed"
  | "other";

export type VivariumHeatingType = "heat-mat" | "che" | "halogen" | "dhp" | "rhp" | "other";
export type VivariumLightingType = "none" | "led" | "uvb" | "basking" | "halogen" | "mixed" | "other";
export type VivariumMonitoringType = "thermometer" | "hygrometer" | "temp-humidity";
export type VivariumAssetPlacement = "floor" | "wall" | "ceiling" | "glass" | "free";

export type VivariumTwinAsset = {
  id: string;
  assetId: string;
  label: string;
  category: "heating" | "lighting" | "monitoring" | "enrichment" | "water" | "substrate" | "other";
  placement: VivariumAssetPlacement;
  x: number;
  y: number;
  z: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  lockedToVivarium: true;
  config?: Record<string, string | number | boolean | null>;
};

export type VivariumTwinChecklist = {
  hideCount: number;
  waterBowlCount: number;
  substrateType: VivariumSubstrateType | "";
  substrateDepthMm?: number;
  heatingType: VivariumHeatingType | "";
  heatingDeviceCount: number;
  thermostatPresent: boolean;
  thermostatTargetC?: number;
  lightingType: VivariumLightingType | "";
  monitoring: VivariumMonitoringType[];
  enrichmentCount: number;
  plantCount: number;
  corkCount: number;
  branchCount: number;
  cleaningStationPresent: boolean;
  scalePresent: boolean;
};

export type VivariumDigitalTwin = {
  version: 1;
  representationMode: VivariumRepresentationMode;
  photoUrl?: string;
  checklist: VivariumTwinChecklist;
  assets: VivariumTwinAsset[];
  intelligence: {
    lastVerifiedAt: string;
    completenessScore: number;
    missing: string[];
    warnings: string[];
  };
  updatedAt: string;
};

export const DEFAULT_VIVARIUM_TWIN: VivariumDigitalTwin = {
  version: 1,
  representationMode: "manual",
  checklist: {
    hideCount: 0,
    waterBowlCount: 0,
    substrateType: "",
    substrateDepthMm: 0,
    heatingType: "",
    heatingDeviceCount: 0,
    thermostatPresent: false,
    thermostatTargetC: 30,
    lightingType: "none",
    monitoring: [],
    enrichmentCount: 0,
    plantCount: 0,
    corkCount: 0,
    branchCount: 0,
    cleaningStationPresent: false,
    scalePresent: false,
  },
  assets: [],
  intelligence: {
    lastVerifiedAt: "",
    completenessScore: 0,
    missing: [],
    warnings: [],
  },
  updatedAt: "",
};
