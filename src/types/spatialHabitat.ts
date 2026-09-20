import type { ReptileFurnitureKind } from "../services/reptileRoomService";

export type SpatialBuilderMode = "room" | "vivarium";
export type SpatialNodeKind = ReptileFurnitureKind | "vivarium" | "substrate" | "background" | "partition" | "custom";
export type SpatialNodeCategory = "construction" | "enclosure" | "storage" | "keeper" | "heating" | "lighting" | "power" | "monitoring" | "enrichment" | "water";
export type SpatialDimensionsCm = { width: number; depth: number; height: number };
export type SpatialFloorPoint = { x: number; z: number };
export type SpatialRoomWall = { id: string; start: SpatialFloorPoint; end: SpatialFloorPoint; height?: number; thickness?: number; material?: string; colour?: string; textureUrl?: string; imageUrl?: string };
export type SpatialRoomSocket = { id: string; wallId: string | null; x: number; z: number; height: number; outlets: number; label?: string; switchable?: boolean; enabled?: boolean; circuit?: string; maxLoadWatts?: number };
export type SpatialPositionCm = { x: number; y: number; z: number };
export type SpatialRotation = { x: number; y: number; z: number };
export type SpatialClearanceCm = { front: number; rear: number; left: number; right: number; top: number };
export type SpatialNodeCapabilities = {
  container?: boolean;
  wallMountable?: boolean;
  ceilingMountable?: boolean;
  powerConsumer?: boolean;
  heatSource?: boolean;
  lightSource?: boolean;
  uvbSource?: boolean;
  sensor?: boolean;
  waterSource?: boolean;
};
export type SpatialNodeConfig = Record<string, string | number | boolean | null>;
export type SpatialNode = {
  id: string;
  parentId: string;
  kind: SpatialNodeKind;
  category: SpatialNodeCategory;
  label: string;
  assetId?: string;
  dimensions: SpatialDimensionsCm;
  position: SpatialPositionCm;
  rotation: SpatialRotation;
  clearance: SpatialClearanceCm;
  capabilities: SpatialNodeCapabilities;
  config: SpatialNodeConfig;
  notes?: string;
  visible?: boolean;
};
export type SpatialHabitatScene = {
  schemaVersion: 1;
  units: "metric" | "imperial";
  root: {
    id: "root";
    kind: "room";
    label: string;
    dimensions: SpatialDimensionsCm;
    floorPlan?: SpatialFloorPoint[];
    walls?: SpatialRoomWall[];
    sockets?: SpatialRoomSocket[];
    roomPhotoUrl?: string;
    logoUrl?: string;
  };
  nodes: SpatialNode[];
  updatedAt: string;
};
export type SpatialValidationIssue = {
  severity: "error" | "warning" | "info";
  code: "outside-container" | "orphaned-node" | "collision" | "clearance" | "power-load" | "missing-monitoring" | "empty-vivarium";
  message: string;
  nodeIds: string[];
};
export type SpatialAssetPreset = {
  assetId: string;
  kind: SpatialNodeKind;
  category: SpatialNodeCategory;
  label: string;
  icon?: string;
  width: number;
  depth: number;
  height: number;
  capabilities?: SpatialNodeCapabilities;
  config?: SpatialNodeConfig;
  description?: string;
};