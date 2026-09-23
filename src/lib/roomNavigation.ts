import type { ReptileRoomWorkspace } from "../services/reptileRoomService";

export const ROOM_NAVIGATION_SPACING_CM = 100;
const FLOOR_EDGE_MARGIN_CM = 45;
const MAX_NAVIGATION_AXIS_NODES = 32;

export type RoomNavigationNode = {
  id: string;
  xCm: number;
  zCm: number;
};

function buildAxisPositions(lengthCm: number): number[] {
  const usableMin = -lengthCm / 2 + FLOOR_EDGE_MARGIN_CM;
  const usableMax = lengthCm / 2 - FLOOR_EDGE_MARGIN_CM;
  if (usableMax <= usableMin) return [0];

  const span = usableMax - usableMin;
  const step = Math.max(
    ROOM_NAVIGATION_SPACING_CM,
    span / Math.max(1, MAX_NAVIGATION_AXIS_NODES - 1),
  );

  const positions: number[] = [];
  for (let index = 0; index < MAX_NAVIGATION_AXIS_NODES; index += 1) {
    const value = Math.min(usableMax, usableMin + index * step);
    positions.push(Math.round(value));
    if (value >= usableMax - 0.001) break;
  }

  if (positions.length === 0) return [0];
  if (positions[positions.length - 1] !== Math.round(usableMax)) {
    positions.push(Math.round(usableMax));
  }

  return [...new Set(positions)];
}

export function pointInRoomFloorPlan(
  x: number,
  z: number,
  points: { x: number; z: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const zi = points[i].z;
    const xj = points[j].x;
    const zj = points[j].z;
    const intersects =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function buildRoomNavigationNodes(
  room: ReptileRoomWorkspace,
): RoomNavigationNode[] {
  const widthCm = Math.max(1, room.width ?? 0);
  const depthCm = Math.max(1, room.depth ?? 0);
  const floorPlan = room.floorPlan;

  const xPositions = buildAxisPositions(widthCm);
  const zPositions = buildAxisPositions(depthCm);
  const nodes = zPositions.flatMap((zCm) =>
    xPositions.map((xCm) => ({
      id: `nav-${xCm}-${zCm}`,
      xCm,
      zCm,
    })),
  );

  if (!floorPlan || floorPlan.length < 3) return nodes;

  const offsetX = widthCm / 2;
  const offsetZ = depthCm / 2;
  return nodes.filter((node) =>
    pointInRoomFloorPlan(
      node.xCm + offsetX,
      node.zCm + offsetZ,
      floorPlan,
    ),
  );
}
