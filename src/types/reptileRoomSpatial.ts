export type SpatialUnit = "mm" | "cm" | "m" | "in" | "ft";
export type RoomTemplateId = "blank" | "breeding" | "hatchling" | "medical" | "brumation" | "bioactive";
export type SpatialObjectKind = "vivarium" | "rack" | "tub" | "shelf" | "workbench" | "incubator" | "equipment" | "custom";

export type Dimension = { value: number; unit: SpatialUnit };
export type RoomOpening = { id: string; kind: "door" | "window"; wall: "north" | "east" | "south" | "west"; offset: Dimension; width: Dimension; height: Dimension };
export type SpatialObjectBase = { id: string; kind: SpatialObjectKind; label: string; x: Dimension; y: Dimension; width: Dimension; depth: Dimension; rotationDeg: number; snakeId?: string | null; visible?: boolean };
export type VivariumObject = SpatialObjectBase & { kind: "vivarium"; height: Dimension; enclosureId?: string | null };
export type RackObject = SpatialObjectBase & { kind: "rack"; height: Dimension; tubsAcross: number; tubsDown: number; levels: number; tubWidth: Dimension; tubDepth: Dimension; tubHeight: Dimension };
export type TubObject = SpatialObjectBase & { kind: "tub"; height: Dimension; rackId?: string | null };
export type GenericSpatialObject = SpatialObjectBase & { kind: Exclude<SpatialObjectKind, "vivarium" | "rack" | "tub">; height: Dimension };
export type SpatialRoomObject = VivariumObject | RackObject | TubObject | GenericSpatialObject;

export type SpatialRoom = {
  schemaVersion: 1;
  id: string;
  name: string;
  template: RoomTemplateId;
  width: Dimension;
  depth: Dimension;
  height: Dimension;
  openings: RoomOpening[];
  objects: SpatialRoomObject[];
  createdAt: string;
  updatedAt: string;
};

const MM_PER_UNIT: Record<SpatialUnit, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
export function toMm(dimension: Dimension): number { return dimension.value * MM_PER_UNIT[dimension.unit]; }
export function fromMm(mm: number, unit: SpatialUnit): Dimension { return { value: Number((mm / MM_PER_UNIT[unit]).toFixed(3)), unit }; }
export function convertDimension(dimension: Dimension, unit: SpatialUnit): Dimension { return fromMm(toMm(dimension), unit); }
export function objectCapacity(object: SpatialRoomObject): number { if (object.kind !== "rack") return 0; return Math.max(0, object.tubsAcross) * Math.max(0, object.tubsDown) * Math.max(0, object.levels); }
export function roomAreaMm2(room: SpatialRoom): number { return toMm(room.width) * toMm(room.depth); }
