import type { DimensionsMm, SpatialObjectBase, SpatialUnit } from "../types/ReptileSpace";

const MM_PER_UNIT: Record<SpatialUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export function toMillimetres(value: number, unit: SpatialUnit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMillimetres(value: number, unit: SpatialUnit): number {
  return value / MM_PER_UNIT[unit];
}

export function convertDimensionsToMm(
  dimensions: DimensionsMm,
  unit: SpatialUnit,
): DimensionsMm {
  return {
    width: toMillimetres(dimensions.width, unit),
    depth: toMillimetres(dimensions.depth, unit),
    height: toMillimetres(dimensions.height, unit),
  };
}

export function clampObjectToRoom(
  object: SpatialObjectBase,
  room: DimensionsMm,
): SpatialObjectBase {
  return {
    ...object,
    position: {
      ...object.position,
      x: Math.max(0, Math.min(object.position.x, Math.max(0, room.width - object.dimensions.width))),
      y: Math.max(0, Math.min(object.position.y, Math.max(0, room.depth - object.dimensions.depth))),
      z: Math.max(0, Math.min(object.position.z, Math.max(0, room.height - object.dimensions.height))),
    },
  };
}

export function rectanglesOverlap(a: SpatialObjectBase, b: SpatialObjectBase): boolean {
  return (
    a.position.x < b.position.x + b.dimensions.width &&
    a.position.x + a.dimensions.width > b.position.x &&
    a.position.y < b.position.y + b.dimensions.depth &&
    a.position.y + a.dimensions.depth > b.position.y
  );
}

export function rackCapacity(columns: number, rows: number, levels = 1): number {
  return Math.max(0, Math.floor(columns)) * Math.max(0, Math.floor(rows)) * Math.max(1, Math.floor(levels));
}

export function scaleToViewport(
  room: DimensionsMm,
  viewportWidthPx: number,
  viewportHeightPx: number,
  paddingPx = 32,
): number {
  if (room.width <= 0 || room.depth <= 0) return 1;
  return Math.min(
    Math.max(1, viewportWidthPx - paddingPx * 2) / room.width,
    Math.max(1, viewportHeightPx - paddingPx * 2) / room.depth,
  );
}

export function formatMeasurement(mm: number, unit: SpatialUnit): string {
  const value = fromMillimetres(mm, unit);
  const precision = unit === "mm" ? 0 : unit === "cm" ? 1 : 2;
  return `${value.toFixed(precision).replace(/\.0+$/, "")} ${unit}`;
}
