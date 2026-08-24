export type SpatialUnit = "mm" | "cm" | "m" | "in" | "ft";

export interface DimensionsMm {
  width: number;
  depth: number;
  height: number;
}

export interface SpatialPosition {
  x: number;
  y: number;
  z: number;
  rotationDeg: number;
}

export type ReptileSpaceObjectKind = "vivarium" | "rack" | "storage" | "workbench" | "equipment" | "custom";

export interface ReptileSpaceObject {
  id: string;
  kind: ReptileSpaceObjectKind;
  name: string;
  dimensions: DimensionsMm;
  position: SpatialPosition;
  metadata?: Record<string, unknown>;
  enclosureId?: string | null;
  snakeId?: string | null;
}

export interface RackSpatialObject extends ReptileSpaceObject {
  kind: "rack";
  containerCount: number;
  columns: number;
  rows: number;
  levels: number;
  containerDimensions: DimensionsMm;
}

export interface ReptileSpace {
  id: string;
  name: string;
  templateId: string | null;
  dimensions: DimensionsMm;
  preferredUnit: SpatialUnit;
  walls: ReptileSpaceObject[];
  openings: ReptileSpaceObject[];
  objects: ReptileSpaceObject[];
  version: 2;
  createdAt: string;
  updatedAt: string;
}
