import type { DimensionsMm, SpatialUnit } from "../types/ReptileSpace";

const MILLIMETRES: Record<SpatialUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export function toMillimetres(value: number, unit: SpatialUnit): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric * MILLIMETRES[unit];
}

export function fromMillimetres(value: number, unit: SpatialUnit): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric / MILLIMETRES[unit];
}

export function convertDimensions(dimensions: DimensionsMm, unit: SpatialUnit): DimensionsMm {
  return {
    width: toMillimetres(dimensions.width, unit),
    depth: toMillimetres(dimensions.depth, unit),
    height: toMillimetres(dimensions.height, unit),
  };
}

export function rackCapacity(columns: number, rows: number, levels = 1): number {
  return Math.max(0, Math.floor(columns)) * Math.max(0, Math.floor(rows)) * Math.max(1, Math.floor(levels));
}
