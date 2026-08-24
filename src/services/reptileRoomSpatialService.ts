import type {
  ReptileRoomObject,
  ReptileRoomSlot,
  ReptileWall,
} from "./reptileRoomService";

export const ROOM_SNAP_CM = 5;
export const WALL_SNAP_CM = 18;
export const DEFAULT_CLEARANCE_CM = 5;

export type SpatialRect = { x: number; y: number; w: number; h: number; z: number; height: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapNumber(value: number, step = ROOM_SNAP_CM): number {
  return Math.round(value / step) * step;
}

export function normalizeRotation(rotation: number): number {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized === 270 ? 270 : normalized === 180 ? 180 : normalized === 90 ? 90 : 0;
}

export function worldSize(object: Pick<ReptileRoomObject, "width" | "depth" | "rotation">): { w: number; d: number } {
  const rotation = normalizeRotation(object.rotation);
  return rotation === 90 || rotation === 270
    ? { w: object.depth, d: object.width }
    : { w: object.width, d: object.depth };
}

export function snapWallObject(
  object: ReptileRoomObject,
  wall: ReptileWall,
  roomWidth: number,
  roomDepth: number,
): ReptileRoomObject {
  const next = { ...object, wall };
  const horizontal = wall === "north" || wall === "south";
  next.rotation = horizontal ? 0 : 90;
  const size = worldSize(next);

  if (wall === "north") {
    next.x = clamp(snapNumber(next.x), 0, Math.max(0, roomWidth - size.w));
    next.y = 0;
  } else if (wall === "south") {
    next.x = clamp(snapNumber(next.x), 0, Math.max(0, roomWidth - size.w));
    next.y = Math.max(0, roomDepth - size.d);
  } else if (wall === "west") {
    next.x = 0;
    next.y = clamp(snapNumber(next.y), 0, Math.max(0, roomDepth - size.d));
  } else {
    next.x = Math.max(0, roomWidth - size.w);
    next.y = clamp(snapNumber(next.y), 0, Math.max(0, roomDepth - size.d));
  }
  return next;
}

export function nearestWallForObject(
  object: ReptileRoomObject,
  roomWidth: number,
  roomDepth: number,
): { wall: ReptileWall; distance: number } {
  const size = worldSize(object);
  const distances = [
    { wall: "north" as ReptileWall, distance: Math.abs(object.y) },
    { wall: "south" as ReptileWall, distance: Math.abs(roomDepth - (object.y + size.d)) },
    { wall: "west" as ReptileWall, distance: Math.abs(object.x) },
    { wall: "east" as ReptileWall, distance: Math.abs(roomWidth - (object.x + size.w)) },
  ];
  return distances.sort((a, b) => a.distance - b.distance)[0];
}

export function snapArchitecturalObject(
  object: ReptileRoomObject,
  roomWidth: number,
  roomDepth: number,
): ReptileRoomObject {
  const nearest = nearestWallForObject(object, roomWidth, roomDepth);
  return nearest.distance <= WALL_SNAP_CM
    ? snapWallObject(object, nearest.wall, roomWidth, roomDepth)
    : { ...object, wall: null, x: clamp(snapNumber(object.x), 0, Math.max(0, roomWidth - worldSize(object).w)), y: clamp(snapNumber(object.y), 0, Math.max(0, roomDepth - worldSize(object).d)) };
}

export function slotRect(slot: ReptileRoomSlot): SpatialRect {
  return { x: slot.x, y: slot.y, w: slot.w, h: slot.h, z: slot.z ?? 0, height: slot.height ?? 30 };
}

export function objectRect(object: ReptileRoomObject): SpatialRect {
  const size = worldSize(object);
  return { x: object.x, y: object.y, w: size.w, h: size.d, z: object.z ?? 0, height: object.height };
}

export function intersects2D(a: SpatialRect, b: SpatialRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function intersects3D(a: SpatialRect, b: SpatialRect): boolean {
  const horizontal = intersects2D(a, b);
  const vertical = a.z < b.z + b.height && a.z + a.height > b.z;
  return horizontal && vertical;
}

export function clearanceGap(a: SpatialRect, b: SpatialRect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  return Math.sqrt(dx * dx + dy * dy);
}

export function stackZ(
  lower: ReptileRoomSlot,
  gap = DEFAULT_CLEARANCE_CM,
): number {
  return (lower.z ?? 0) + (lower.height ?? 30) + gap;
}

export function roomObjectFootprint(object: ReptileRoomObject): SpatialRect {
  return objectRect(object);
}

export function roomSlotFootprint(slot: ReptileRoomSlot): SpatialRect {
  return slotRect(slot);
}
