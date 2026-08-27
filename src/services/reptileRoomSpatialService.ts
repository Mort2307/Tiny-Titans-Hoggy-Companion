import type { ReptileRoomObject, ReptileRoomSlot, ReptileWall } from "./reptileRoomService";

export const ROOM_SNAP_CM = 5;
export const WALL_SNAP_CM = 18;
export const DEFAULT_CLEARANCE_CM = 5;
export const FLOOR_EPSILON_CM = 0.5;

export type SpatialRect = { x: number; y: number; w: number; h: number; z: number; height: number };
export type SpatialIssue = { severity: "error" | "warning"; message: string; ids: string[] };

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function snapNumber(value: number, step = ROOM_SNAP_CM): number {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function normalizeRotation(rotation: number): number {
  const normalized = ((Number(rotation) || 0) % 360 + 360) % 360;
  if (normalized >= 315 || normalized < 45) return 0;
  if (normalized < 135) return 90;
  if (normalized < 225) return 180;
  return 270;
}

export function worldSize(object: Pick<ReptileRoomObject, "width" | "depth" | "rotation">): { w: number; d: number } {
  const rotation = normalizeRotation(object.rotation);
  return rotation === 90 || rotation === 270
    ? { w: Math.max(1, object.depth), d: Math.max(1, object.width) }
    : { w: Math.max(1, object.width), d: Math.max(1, object.depth) };
}

export function snapWallObject(object: ReptileRoomObject, wall: ReptileWall, roomWidth: number, roomDepth: number): ReptileRoomObject {
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

export function nearestWallForObject(object: ReptileRoomObject, roomWidth: number, roomDepth: number): { wall: ReptileWall; distance: number } {
  const size = worldSize(object);
  const distances = [
    { wall: "north" as ReptileWall, distance: Math.abs(object.y) },
    { wall: "south" as ReptileWall, distance: Math.abs(roomDepth - (object.y + size.d)) },
    { wall: "west" as ReptileWall, distance: Math.abs(object.x) },
    { wall: "east" as ReptileWall, distance: Math.abs(roomWidth - (object.x + size.w)) },
  ];
  return distances.sort((a, b) => a.distance - b.distance)[0];
}

export function snapArchitecturalObject(object: ReptileRoomObject, roomWidth: number, roomDepth: number): ReptileRoomObject {
  if (object.wall) return snapWallObject(object, object.wall, roomWidth, roomDepth);
  const nearest = nearestWallForObject(object, roomWidth, roomDepth);
  return nearest.distance <= WALL_SNAP_CM
    ? snapWallObject(object, nearest.wall, roomWidth, roomDepth)
    : { ...object, wall: null, x: clamp(snapNumber(object.x), 0, Math.max(0, roomWidth - worldSize(object).w)), y: clamp(snapNumber(object.y), 0, Math.max(0, roomDepth - worldSize(object).d)) };
}

export function slotRect(slot: ReptileRoomSlot): SpatialRect {
  return { x: slot.x, y: slot.y, w: Math.max(1, slot.w), h: Math.max(1, slot.h), z: Math.max(0, slot.z ?? 0), height: Math.max(1, slot.height ?? 30) };
}

export function objectRect(object: ReptileRoomObject): SpatialRect {
  const size = worldSize(object);
  return { x: object.x, y: object.y, w: size.w, h: size.d, z: Math.max(0, object.z ?? 0), height: Math.max(1, object.height) };
}

export function intersects2D(a: SpatialRect, b: SpatialRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function intersects3D(a: SpatialRect, b: SpatialRect): boolean {
  return intersects2D(a, b) && a.z < b.z + b.height && a.z + a.height > b.z;
}

export function clearanceGap(a: SpatialRect, b: SpatialRect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  return Math.sqrt(dx * dx + dy * dy);
}

export function stackZ(lower: ReptileRoomSlot, gap = DEFAULT_CLEARANCE_CM): number {
  return Math.max(0, lower.z ?? 0) + Math.max(1, lower.height ?? 30) + Math.max(0, gap);
}

export function roomObjectFootprint(object: ReptileRoomObject): SpatialRect { return objectRect(object); }
export function roomSlotFootprint(slot: ReptileRoomSlot): SpatialRect { return slotRect(slot); }

export function withinRoom(rect: SpatialRect, roomWidth: number, roomDepth: number, roomHeight: number): boolean {
  return rect.x >= -FLOOR_EPSILON_CM && rect.y >= -FLOOR_EPSILON_CM && rect.x + rect.w <= roomWidth + FLOOR_EPSILON_CM && rect.y + rect.h <= roomDepth + FLOOR_EPSILON_CM && rect.z >= -FLOOR_EPSILON_CM && rect.z + rect.height <= roomHeight + FLOOR_EPSILON_CM;
}

export function fitSlotToRoom(slot: ReptileRoomSlot, roomWidth: number, roomDepth: number, roomHeight: number): ReptileRoomSlot {
  const w = Math.min(Math.max(1, slot.w), roomWidth);
  const h = Math.min(Math.max(1, slot.h), roomDepth);
  const height = Math.min(Math.max(1, slot.height ?? 30), roomHeight);
  return { ...slot, w, h, depth: h, height, x: clamp(snapNumber(slot.x), 0, Math.max(0, roomWidth - w)), y: clamp(snapNumber(slot.y), 0, Math.max(0, roomDepth - h)), z: clamp(snapNumber(slot.z ?? 0), 0, Math.max(0, roomHeight - height)) };
}

export function fitObjectToRoom(object: ReptileRoomObject, roomWidth: number, roomDepth: number, roomHeight: number): ReptileRoomObject {
  const size = worldSize(object);
  const z = clamp(snapNumber(object.z ?? 0), 0, Math.max(0, roomHeight - object.height));
  const next = { ...object, z };
  if (object.wall) return snapWallObject(next, object.wall, roomWidth, roomDepth);
  return { ...next, x: clamp(snapNumber(object.x), 0, Math.max(0, roomWidth - size.w)), y: clamp(snapNumber(object.y), 0, Math.max(0, roomDepth - size.d)) };
}

export function validateSpatialLayout(slots: ReptileRoomSlot[], objects: ReptileRoomObject[], roomWidth: number, roomDepth: number, roomHeight: number): SpatialIssue[] {
  const issues: SpatialIssue[] = [];
  const slotRects = slots.map((slot) => ({ slot, rect: slotRect(slot) }));
  const objectRects = objects.map((object) => ({ object, rect: objectRect(object) }));

  for (const { slot, rect } of slotRects) {
    if (!withinRoom(rect, roomWidth, roomDepth, roomHeight)) issues.push({ severity: "error", message: `${slot.label} exceeds the room boundary.`, ids: [slot.id] });
  }
  for (const { object, rect } of objectRects) {
    if (!withinRoom(rect, roomWidth, roomDepth, roomHeight)) issues.push({ severity: "error", message: `${object.label} exceeds the room boundary.`, ids: [object.id] });
  }

  for (let i = 0; i < slotRects.length; i += 1) {
    for (let j = i + 1; j < slotRects.length; j += 1) {
      const a = slotRects[i]; const b = slotRects[j];
      if (intersects3D(a.rect, b.rect) && !(a.slot.stackGroupId && a.slot.stackGroupId === b.slot.stackGroupId && Math.abs(a.rect.z - b.rect.z) > FLOOR_EPSILON_CM)) {
        issues.push({ severity: "error", message: `${a.slot.label} overlaps ${b.slot.label}.`, ids: [a.slot.id, b.slot.id] });
      }
    }
  }

  for (const { slot, rect } of slotRects) {
    for (const { object, rect: objectRectValue } of objectRects) {
      if (intersects3D(rect, objectRectValue)) issues.push({ severity: "warning", message: `${slot.label} intersects ${object.label}.`, ids: [slot.id, object.id] });
    }
  }
  return issues;
}
