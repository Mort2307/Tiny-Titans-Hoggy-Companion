import type { ReptileRoomObject, ReptileRoomSlot } from "../services/reptileRoomService";

export function dimensionsForRoomObject(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) {
    return { width: object.width, depth: object.depth, height: object.height };
  }
  return {
    width: object.w,
    depth: object.depth ?? object.h,
    height: object.height ?? 40,
  };
}

export function rotationForRoomObject(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) return object.rotation ?? 0;
  return (object as ReptileRoomSlot & { rotation?: number }).rotation ?? 0;
}
