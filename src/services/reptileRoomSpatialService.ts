import type { ReptileRoomObject, ReptileRoomPoint, ReptileRoomSlot, ReptileRoomSocket, ReptileRoomWorkspace, ReptileRoomWall } from "./reptileRoomService";

export const ROOM_SNAP_CM = 5;
export const WALL_SNAP_CM = 18;
export const DEFAULT_CLEARANCE_CM = 5;
export type SpatialRect = { x: number; y: number; w: number; h: number; z: number; height: number };
export type PlacementIssue = { severity: "warning" | "error"; code: "outside-room" | "collision" | "clearance" | "power-distance"; message: string };

export function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
export function snapNumber(value: number, step = ROOM_SNAP_CM): number { return Math.round(value / step) * step; }
export function normalizeRotation(rotation: number): number { const normalized = ((rotation % 360) + 360) % 360; return normalized === 270 ? 270 : normalized === 180 ? 180 : normalized === 90 ? 90 : 0; }
export function worldSize(object: Pick<ReptileRoomObject, "width" | "depth" | "rotation">): { w: number; d: number } { const rotation = normalizeRotation(object.rotation); return rotation === 90 || rotation === 270 ? { w: object.depth, d: object.width } : { w: object.width, d: object.depth }; }

export function pointInRoomPolygon(x: number, z: number, polygon?: ReptileRoomPoint[]): boolean { if (!polygon || polygon.length < 3) return true; let inside = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const a = polygon[i], b = polygon[j]; const intersects = a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x; if (intersects) inside = !inside; } return inside; }

export function snapWallObject(object: ReptileRoomObject, wall: ReptileRoomObject["wall"], roomWidth: number, roomDepth: number): ReptileRoomObject {
  const next = { ...object, wall }; const horizontal = wall === "north" || wall === "south"; next.rotation = horizontal ? 0 : 90; const size = worldSize(next);
  if (wall === "north") { next.x = clamp(snapNumber(next.x), 0, Math.max(0, roomWidth - size.w)); next.y = 0; }
  else if (wall === "south") { next.x = clamp(snapNumber(next.x), 0, Math.max(0, roomWidth - size.w)); next.y = Math.max(0, roomDepth - size.d); }
  else if (wall === "west") { next.x = 0; next.y = clamp(snapNumber(next.y), 0, Math.max(0, roomDepth - size.d)); }
  else { next.x = Math.max(0, roomWidth - size.w); next.y = clamp(snapNumber(next.y), 0, Math.max(0, roomDepth - size.d)); }
  return next;
}

export function snapObjectToWallSegment(object: ReptileRoomObject, wall: ReptileRoomWall, gapCm = 0): ReptileRoomObject {
  const dx = wall.end.x - wall.start.x, dz = wall.end.z - wall.start.z, length = Math.hypot(dx, dz);
  if (length <= 0) return object;
  const ux = dx / length, uz = dz / length;
  const centreX = object.x + object.width / 2, centreZ = object.y + object.depth / 2;
  const projection = clamp((centreX - wall.start.x) * ux + (centreZ - wall.start.z) * uz, object.width / 2, length - object.width / 2);
  return { ...object, x: snapNumber(wall.start.x + ux * projection - object.width / 2), y: snapNumber(wall.start.z + uz * projection - object.depth / 2), wall: wall.id, rotation: Math.round((Math.atan2(uz, ux) * 180) / Math.PI / 90) * 90, z: Math.max(0, object.z), notes: gapCm ? `${object.notes ?? ""}` : object.notes };
}

export function nearestWallForObject(object: ReptileRoomObject, roomWidth: number, roomDepth: number): { wall: ReptileRoomObject["wall"]; distance: number } { const size = worldSize(object); const distances = [{ wall: "north" as const, distance: Math.abs(object.y) }, { wall: "south" as const, distance: Math.abs(roomDepth - (object.y + size.d)) }, { wall: "west" as const, distance: Math.abs(object.x) }, { wall: "east" as const, distance: Math.abs(roomWidth - (object.x + size.w)) }]; return distances.sort((a, b) => a.distance - b.distance)[0]; }
export function snapArchitecturalObject(object: ReptileRoomObject, roomOrWidth: ReptileRoomWorkspace | number, roomDepth?: number): ReptileRoomObject { const roomWidth = typeof roomOrWidth === "number" ? roomOrWidth : (roomOrWidth.width ?? 0); const depth = typeof roomOrWidth === "number" ? (roomDepth ?? 0) : (roomOrWidth.depth ?? 0); const nearest = nearestWallForObject(object, roomWidth, depth); return nearest.distance <= WALL_SNAP_CM ? snapWallObject(object, nearest.wall, roomWidth, depth) : { ...object, wall: null, x: clamp(snapNumber(object.x), 0, Math.max(0, roomWidth - worldSize(object).w)), y: clamp(snapNumber(object.y), 0, Math.max(0, depth - worldSize(object).d)) }; }
export function slotRect(slot: ReptileRoomSlot): SpatialRect { return { x: slot.x, y: slot.y, w: slot.w, h: slot.depth ?? slot.w, z: slot.z ?? 0, height: slot.height ?? 30 }; }
export function objectRect(object: ReptileRoomObject): SpatialRect { const size = worldSize(object); return { x: object.x, y: object.y, w: size.w, h: size.d, z: object.z ?? 0, height: object.height }; }
export function intersects2D(a: SpatialRect, b: SpatialRect): boolean { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function intersects3D(a: SpatialRect, b: SpatialRect): boolean { return intersects2D(a, b) && a.z < b.z + b.height && a.z + a.height > b.z; }
export function clearanceGap(a: SpatialRect, b: SpatialRect): number { const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0); const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0); return Math.sqrt(dx * dx + dy * dy); }
export function stackZ(lower: ReptileRoomSlot, gap = DEFAULT_CLEARANCE_CM): number { return (lower.z ?? 0) + (lower.height ?? 30) + gap; }
export function roomObjectFootprint(object: ReptileRoomObject): SpatialRect { return objectRect(object); }
export function roomSlotFootprint(slot: ReptileRoomSlot): SpatialRect { return slotRect(slot); }

export function validateObjectPlacement(object: ReptileRoomObject, roomWidth: number, roomDepth: number, roomHeight: number, polygon?: ReptileRoomPoint[], neighbours: SpatialRect[] = [], clearance = DEFAULT_CLEARANCE_CM): PlacementIssue[] {
  const issues: PlacementIssue[] = []; const footprint = objectRect(object);
  const corners = [[footprint.x, footprint.y], [footprint.x + footprint.w, footprint.y], [footprint.x, footprint.y + footprint.h], [footprint.x + footprint.w, footprint.y + footprint.h]];
  const inBounds = corners.every(([x, y]) => x >= 0 && y >= 0 && x <= roomWidth && y <= roomDepth && pointInRoomPolygon(x, y, polygon));
  if (!inBounds || footprint.z < 0 || footprint.z + footprint.height > roomHeight) issues.push({ severity: "error", code: "outside-room", message: "This placement extends outside the usable room volume." });
  if (neighbours.some((other) => intersects3D(footprint, other))) issues.push({ severity: "error", code: "collision", message: "This placement overlaps another room item." });
  if (neighbours.some((other) => clearanceGap(footprint, other) < clearance)) issues.push({ severity: "warning", code: "clearance", message: `Less than ${clearance} cm of clearance remains from another item.` });
  return issues;
}

export function nearestPowerSocket(x: number, y: number, sockets: ReptileRoomSocket[]): { socket: ReptileRoomSocket | null; distanceCm: number } { let nearest: ReptileRoomSocket | null = null; let distanceCm = Number.POSITIVE_INFINITY; sockets.forEach((socket) => { const distance = Math.hypot(socket.x - x, socket.z - y); if (distance < distanceCm) { nearest = socket; distanceCm = distance; } }); return { socket: nearest, distanceCm }; }
