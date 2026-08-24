export type SpatialUnit = "mm" | "cm" | "m" | "in" | "ft";
export type RoomTemplateId =
  | "blank"
  | "breeding"
  | "hatchling"
  | "medical"
  | "brumation"
  | "bioactive";
export type SpatialObjectKind =
  | "vivarium"
  | "rack"
  | "tub"
  | "shelf"
  | "workbench"
  | "incubator"
  | "equipment"
  | "custom";

export interface Dimension3D {
  width: number;
  depth: number;
  height: number;
  unit: SpatialUnit;
}

export interface RoomWall {
  id: string;
  length: number;
  height: number;
  unit: SpatialUnit;
  position: "north" | "east" | "south" | "west";
}

export interface RoomOpening {
  id: string;
  wallId: string;
  kind: "door" | "window";
  offset: number;
  width: number;
  height: number;
  unit: SpatialUnit;
}

export interface SpatialObject {
  id: string;
  kind: SpatialObjectKind;
  label: string;
  position: { x: number; y: number; z?: number; unit: SpatialUnit };
  dimensions: Dimension3D;
  snakeId?: string | null;
  enclosureId?: string | null;
  parentId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RackSpec {
  tubsAcross: number;
  tubsDown: number;
  levels: number;
  tubDimensions: Dimension3D;
  frameDimensions?: Dimension3D;
  calculateFrameFromTubs?: boolean;
}

export interface SpatialRoom {
  id: string;
  name: string;
  templateId: RoomTemplateId;
  dimensions: Dimension3D;
  walls: RoomWall[];
  openings: RoomOpening[];
  objects: SpatialObject[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

export interface RoomTemplateDefinition {
  id: RoomTemplateId;
  name: string;
  description: string;
  suggestedDimensions: Dimension3D;
  suggestedObjects: Array<Pick<SpatialObject, "kind" | "label" | "dimensions" | "position">>;
}

const UNIT_TO_MM: Record<SpatialUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export function toMillimetres(value: number, unit: SpatialUnit): number {
  return value * UNIT_TO_MM[unit];
}

export function fromMillimetres(value: number, unit: SpatialUnit): number {
  return value / UNIT_TO_MM[unit];
}

export function convertDimension(value: number, from: SpatialUnit, to: SpatialUnit): number {
  return fromMillimetres(toMillimetres(value, from), to);
}

export function formatDimension(value: number, unit: SpatialUnit, precision = 2): string {
  const rounded = Number(value.toFixed(precision));
  return `${rounded} ${unit}`;
}

export function rackCapacity(spec: RackSpec): number {
  return Math.max(0, spec.tubsAcross) * Math.max(0, spec.tubsDown) * Math.max(0, spec.levels);
}

export function rackDimensions(spec: RackSpec): Dimension3D {
  const tub = spec.tubDimensions;
  const frame = spec.frameDimensions;
  if (frame && !spec.calculateFrameFromTubs) return frame;
  return {
    width: tub.width * Math.max(1, spec.tubsAcross),
    depth: tub.depth,
    height: tub.height * Math.max(1, spec.levels),
    unit: tub.unit,
  };
}

export function makeRoomWalls(dimensions: Dimension3D): RoomWall[] {
  return [
    { id: "wall-north", length: dimensions.width, height: dimensions.height, unit: dimensions.unit, position: "north" },
    { id: "wall-east", length: dimensions.depth, height: dimensions.height, unit: dimensions.unit, position: "east" },
    { id: "wall-south", length: dimensions.width, height: dimensions.height, unit: dimensions.unit, position: "south" },
    { id: "wall-west", length: dimensions.depth, height: dimensions.height, unit: dimensions.unit, position: "west" },
  ];
}

const baseRoom: Dimension3D = { width: 4, depth: 3, height: 2.4, unit: "m" };
const standardViv: Dimension3D = { width: 120, depth: 60, height: 60, unit: "cm" };
const smallRack: Dimension3D = { width: 120, depth: 60, height: 180, unit: "cm" };

export const ROOM_TEMPLATES: RoomTemplateDefinition[] = [
  { id: "blank", name: "Blank Room", description: "A clean scaled room with no assumptions.", suggestedDimensions: baseRoom, suggestedObjects: [] },
  { id: "breeding", name: "Breeding Room", description: "A starting layout for adult enclosures, pairing space and incubation equipment.", suggestedDimensions: baseRoom, suggestedObjects: [
    { kind: "vivarium", label: "Adult Vivarium Zone", dimensions: standardViv, position: { x: 0.2, y: 0.2, unit: "m" } },
    { kind: "incubator", label: "Incubation Station", dimensions: { width: 0.8, depth: 0.6, height: 1.2, unit: "m" }, position: { x: 2.9, y: 0.2, unit: "m" } },
  ] },
  { id: "hatchling", name: "Hatchling Room", description: "Rack-focused starting layout for hatchlings and small tubs.", suggestedDimensions: baseRoom, suggestedObjects: [
    { kind: "rack", label: "Hatchling Rack", dimensions: smallRack, position: { x: 0.2, y: 0.2, unit: "m" } },
    { kind: "workbench", label: "Feeding / Prep Bench", dimensions: { width: 1.2, depth: 0.6, height: 0.9, unit: "m" }, position: { x: 2.1, y: 0.2, unit: "m" } },
  ] },
  { id: "medical", name: "Medical / Quarantine", description: "A deliberately simple isolated-care layout.", suggestedDimensions: baseRoom, suggestedObjects: [
    { kind: "vivarium", label: "Quarantine Vivarium", dimensions: standardViv, position: { x: 0.2, y: 0.2, unit: "m" } },
    { kind: "workbench", label: "Care Station", dimensions: { width: 1.2, depth: 0.6, height: 0.9, unit: "m" }, position: { x: 2.1, y: 0.2, unit: "m" } },
  ] },
  { id: "brumation", name: "Brumation Room", description: "A monitoring-first room template for separated enclosures.", suggestedDimensions: baseRoom, suggestedObjects: [
    { kind: "shelf", label: "Brumation Shelf", dimensions: { width: 1.8, depth: 0.5, height: 1.8, unit: "m" }, position: { x: 0.2, y: 0.2, unit: "m" } },
  ] },
  { id: "bioactive", name: "Bioactive Collection", description: "A larger-display starting point for planted enclosures and workspace.", suggestedDimensions: baseRoom, suggestedObjects: [
    { kind: "vivarium", label: "Display Vivarium", dimensions: { width: 1.5, depth: 0.6, height: 0.8, unit: "m" }, position: { x: 0.2, y: 0.2, unit: "m" } },
    { kind: "workbench", label: "Plant / Substrate Bench", dimensions: { width: 1.2, depth: 0.6, height: 0.9, unit: "m" }, position: { x: 2.1, y: 0.2, unit: "m" } },
  ] },
];

export function createSpatialRoom(name: string, templateId: RoomTemplateId = "blank", now = new Date().toISOString()): SpatialRoom {
  const template = ROOM_TEMPLATES.find((item) => item.id === templateId) ?? ROOM_TEMPLATES[0];
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    templateId: template.id,
    dimensions: { ...template.suggestedDimensions },
    walls: makeRoomWalls(template.suggestedDimensions),
    openings: [],
    objects: template.suggestedObjects.map((object, index) => ({
      ...object,
      id: `${template.id}-object-${index + 1}`,
      position: { ...object.position },
    })),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
}
