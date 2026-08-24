export type SpatialUnit = "mm" | "cm" | "m" | "in" | "ft";

export type SpatialObjectKind =
  | "room"
  | "wall"
  | "door"
  | "window"
  | "vivarium"
  | "rack"
  | "tub"
  | "workbench"
  | "storage"
  | "incubator"
  | "equipment"
  | "custom";

export interface DimensionsMm {
  width: number;
  depth: number;
  height: number;
}

export interface SpatialPositionMm {
  x: number;
  y: number;
  z: number;
  rotationDeg: number;
}

export interface SpatialObjectBase {
  id: string;
  kind: SpatialObjectKind;
  name: string;
  dimensions: DimensionsMm;
  position: SpatialPositionMm;
  locked?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface VivariumSpatialObject extends SpatialObjectBase {
  kind: "vivarium";
  enclosureId?: string | null;
  snakeId?: string | null;
}

export interface RackSpatialObject extends SpatialObjectBase {
  kind: "rack";
  containerCount: number;
  columns: number;
  rows: number;
  levels: number;
  containerDimensions?: DimensionsMm;
}

export interface ReptileRoomWall {
  id: string;
  name: string;
  lengthMm: number;
  heightMm: number;
  thicknessMm: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface ReptileRoomOpening {
  id: string;
  kind: "door" | "window";
  name: string;
  widthMm: number;
  heightMm: number;
  wallId?: string;
  offsetMm: number;
}

export interface ReptileSpace {
  id: string;
  name: string;
  description?: string;
  templateId?: string | null;
  dimensions: DimensionsMm;
  preferredUnit: SpatialUnit;
  walls: ReptileRoomWall[];
  openings: ReptileRoomOpening[];
  objects: SpatialObjectBase[];
  version: 2;
  createdAt: string;
  updatedAt: string;
}

export interface ReptileSpaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "blank" | "preset" | "custom";
  defaultDimensions: DimensionsMm;
  objects: Array<Omit<SpatialObjectBase, "id">>;
  tags: string[];
}
