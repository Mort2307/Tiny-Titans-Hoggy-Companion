import type { DimensionsMm, RackSpatialObject, SpatialUnit } from "../types/ReptileSpace";
import { rackCapacity, toMillimetres } from "./spatialEngine";

export interface RackByCountInput {
  name: string;
  columns: number;
  rows: number;
  levels?: number;
  tubWidth: number;
  tubDepth: number;
  tubHeight: number;
  unit: SpatialUnit;
  clearanceMm?: number;
}

export interface RackByDimensionInput {
  name: string;
  width: number;
  depth: number;
  height: number;
  unit: SpatialUnit;
  tubWidth: number;
  tubDepth: number;
  tubHeight: number;
  clearanceMm?: number;
}

function positiveInt(value: number, fallback = 1) {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : fallback));
}

function positive(value: number, fallback = 1) {
  return Math.max(1, Number.isFinite(value) ? value : fallback);
}

export function buildRackFromCounts(input: RackByCountInput, id = `rack-${Date.now()}`): RackSpatialObject {
  const columns = positiveInt(input.columns);
  const rows = positiveInt(input.rows);
  const levels = positiveInt(input.levels ?? 1);
  const tubWidth = toMillimetres(positive(input.tubWidth), input.unit);
  const tubDepth = toMillimetres(positive(input.tubDepth), input.unit);
  const tubHeight = toMillimetres(positive(input.tubHeight), input.unit);
  const clearance = Math.max(0, input.clearanceMm ?? 10);

  return {
    id,
    kind: "rack",
    name: input.name.trim() || "Rack",
    dimensions: {
      width: columns * tubWidth + Math.max(0, columns - 1) * clearance,
      depth: tubDepth,
      height: levels * tubHeight + Math.max(0, levels - 1) * clearance,
    },
    position: { x: 0, y: 0, z: 0, rotationDeg: 0 },
    containerCount: rackCapacity(columns, rows, levels),
    columns,
    rows,
    levels,
    containerDimensions: { width: tubWidth, depth: tubDepth, height: tubHeight },
  };
}

export function buildRackFromDimensions(input: RackByDimensionInput, id = `rack-${Date.now()}`): RackSpatialObject {
  const width = toMillimetres(positive(input.width), input.unit);
  const depth = toMillimetres(positive(input.depth), input.unit);
  const height = toMillimetres(positive(input.height), input.unit);
  const tubWidth = toMillimetres(positive(input.tubWidth), input.unit);
  const tubDepth = toMillimetres(positive(input.tubDepth), input.unit);
  const tubHeight = toMillimetres(positive(input.tubHeight), input.unit);
  const clearance = Math.max(0, input.clearanceMm ?? 10);
  const columns = Math.max(1, Math.floor((width + clearance) / (tubWidth + clearance)));
  const rows = Math.max(1, Math.floor((depth + clearance) / (tubDepth + clearance)));
  const levels = Math.max(1, Math.floor((height + clearance) / (tubHeight + clearance)));

  const dimensions: DimensionsMm = { width, depth, height };
  return {
    id,
    kind: "rack",
    name: input.name.trim() || "Rack",
    dimensions,
    position: { x: 0, y: 0, z: 0, rotationDeg: 0 },
    containerCount: rackCapacity(columns, rows, levels),
    columns,
    rows,
    levels,
    containerDimensions: { width: tubWidth, depth: tubDepth, height: tubHeight },
  };
}

export function describeRack(rack: RackSpatialObject) {
  return `${rack.containerCount} tubs · ${rack.columns} across × ${rack.rows} deep × ${rack.levels} levels`;
}
