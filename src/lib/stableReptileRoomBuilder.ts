import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Room3DAssetPreset } from "../types/reptileRoom3D";
import type { Snake } from "../types/Snake";

export const DEFAULT_STABLE_VIVARIUM = { width: 90, depth: 45, height: 45 };
export const stableIdFor = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

type RotatableStableSlot = ReptileRoomSlot & { rotation?: number };
export const stableSlotRotation = (slot: ReptileRoomSlot) =>
  (slot as RotatableStableSlot).rotation ?? 0;

export function toStableNumber(value: string, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function makeStableSlot(
  room: ReptileRoomWorkspace,
  preset: Room3DAssetPreset,
  snake?: Snake,
): ReptileRoomSlot {
  return {
    id: stableIdFor("viv"),
    snakeId: snake?.id ?? null,
    label: snake ? `${snake.name}'s Vivarium` : preset.label || "Empty Vivarium",
    x: Math.max(0, Math.min((room.width ?? preset.width) - preset.width, (room.width ?? preset.width) / 2 - preset.width / 2)),
    y: Math.max(0, Math.min((room.depth ?? preset.depth) - preset.depth, (room.depth ?? preset.depth) / 2 - preset.depth / 2)),
    z: 0,
    w: preset.width,
    h: preset.depth,
    depth: preset.depth,
    height: preset.height,
    lifecycleStatus: snake ? "occupied" : "empty",
    condition: "good",
    availability: snake ? "occupied" : "available",
    storageLocation: "",
    storageNote: "",
    notes: "",
    maintenanceNote: "",
    photoUrl: "",
    stackGroupId: null,
    stackIndex: 0,
    parentSlotId: null,
    assetId: preset.assetId,
    intelligenceRole: preset.intelligenceRole,
    config: { ...(preset.config ?? {}) },
  };
}

export function makeStableObject(
  room: ReptileRoomWorkspace,
  preset: Room3DAssetPreset,
): ReptileRoomObject {
  return {
    id: stableIdFor("asset"),
    kind: preset.kind as ReptileRoomObject["kind"],
    label: preset.label,
    x: Math.max(0, Math.min((room.width ?? preset.width) - preset.width, (room.width ?? preset.width) / 2 - preset.width / 2)),
    y: Math.max(0, Math.min((room.depth ?? preset.depth) - preset.depth, (room.depth ?? preset.depth) / 2 - preset.depth / 2)),
    z: 0,
    width: Math.max(1, preset.width),
    depth: Math.max(1, preset.depth),
    height: Math.max(1, preset.height),
    rotation: 0,
    wall: null,
    stackGroupId: null,
    stackIndex: 0,
    parentAssetId: null,
    clearance: {},
    notes: "",
    assetType: preset.assetType ?? "equipment",
    assetId: preset.assetId,
    intelligenceRole: preset.intelligenceRole,
    config: { ...(preset.config ?? {}) },
  };
}
