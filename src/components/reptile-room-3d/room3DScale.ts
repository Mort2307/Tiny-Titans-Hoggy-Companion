import type { RoomDimensions3D } from "../../types/reptileRoom3D";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";

/** The application stores room geometry in centimetres; Three.js renders in metres. */
export const CM_TO_WORLD = 0.01;
export const WORLD_TO_CM = 1 / CM_TO_WORLD;

export function cmToWorld(valueCm: number): number {
  return valueCm * CM_TO_WORLD;
}

export function worldToCm(value: number): number {
  return value * WORLD_TO_CM;
}

export function getRoomDimensions3D(room: ReptileRoomWorkspace): RoomDimensions3D {
  const widthCm = Math.max(1, room.width ?? 0);
  const depthCm = Math.max(1, room.depth ?? 0);
  const heightCm = Math.max(1, room.height ?? 0);

  return {
    widthCm,
    depthCm,
    heightCm,
    width: cmToWorld(widthCm),
    depth: cmToWorld(depthCm),
    height: cmToWorld(heightCm),
  };
}
