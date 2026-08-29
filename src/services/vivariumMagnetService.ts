import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "./reptileRoomService";

export type VivariumAttachmentOffset = {
  x: number;
  y: number;
  z: number;
  rotation?: number;
  mode?: "floor" | "wall" | "ceiling";
};

export type AttachedRoomObject = ReptileRoomObject & {
  parentAssetId?: string | null;
  vivariumAttachment?: VivariumAttachmentOffset | null;
};

export const VIVARIUM_MAGNET_RANGE_CM = 18;

export function getVivariumSlot(room: ReptileRoomWorkspace, vivariumId: string): ReptileRoomSlot | null {
  return room.slots.find((slot) => slot.id === vivariumId) ?? room.storedSlots.find((slot) => slot.id === vivariumId) ?? null;
}

export function getVivariumAnchor(slot: ReptileRoomSlot) {
  return {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    width: slot.w,
    depth: slot.depth ?? slot.h,
    height: slot.height ?? 40,
  };
}

export function getAttachmentOffset(object: ReptileRoomObject, slot: ReptileRoomSlot): VivariumAttachmentOffset {
  return {
    x: object.x - slot.x,
    y: object.y - slot.y,
    z: object.z - slot.z,
    rotation: object.rotation,
    mode: object.z > slot.z + (slot.height ?? 40) * 0.65 ? "ceiling" : object.y > slot.y + (slot.depth ?? slot.h) * 0.8 ? "wall" : "floor",
  };
}

export function applyVivariumAttachment<T extends ReptileRoomObject>(object: T, slot: ReptileRoomSlot, offset: VivariumAttachmentOffset): T {
  return {
    ...object,
    x: slot.x + offset.x,
    y: slot.y + offset.y,
    z: slot.z + offset.z,
    rotation: offset.rotation ?? object.rotation,
    parentAssetId: slot.id,
    config: {
      ...(object.config ?? {}),
      linkedSlotId: slot.id,
      linkedSnakeId: slot.snakeId,
    },
  };
}

export function magnetiseObjectToVivarium(object: ReptileRoomObject, slot: ReptileRoomSlot): AttachedRoomObject {
  const anchor = getVivariumAnchor(slot);
  const offset: VivariumAttachmentOffset = {
    x: Math.min(Math.max(object.x - anchor.x, -anchor.width / 2), anchor.width / 2),
    y: Math.min(Math.max(object.y - anchor.y, -anchor.depth / 2), anchor.depth / 2),
    z: Math.max(0.5, object.z - anchor.z),
    rotation: object.rotation,
    mode: object.z > anchor.z + anchor.height * 0.65 ? "ceiling" : object.y > anchor.y + anchor.depth * 0.8 ? "wall" : "floor",
  };

  return applyVivariumAttachment(object, slot, offset);
}

export function getStoredAttachmentOffset(object: ReptileRoomObject, slot: ReptileRoomSlot): VivariumAttachmentOffset {
  const dx = object.x - slot.x;
  const dy = object.y - slot.y;
  const dz = object.z - slot.z;
  return {
    x: dx,
    y: dy,
    z: dz,
    rotation: object.rotation,
    mode: dz > (slot.height ?? 40) * 0.65 ? "ceiling" : dy > (slot.depth ?? slot.h) * 0.8 ? "wall" : "floor",
  };
}

export function reanchorVivariumChildren(room: ReptileRoomWorkspace, vivariumId: string, previousSlot: ReptileRoomSlot | null = null): ReptileRoomWorkspace {
  const slot = getVivariumSlot(room, vivariumId);
  if (!slot) return room;

  const previous = previousSlot ?? slot;
  const objects = (room.objects ?? []).map((object) => {
    const attached = object.parentAssetId === vivariumId || object.config?.linkedSlotId === vivariumId;
    if (!attached) return object;

    const offset = previous === slot
      ? getStoredAttachmentOffset(object, previous)
      : getStoredAttachmentOffset(object, previous);

    return applyVivariumAttachment(object, slot, offset);
  });

  return { ...room, objects };
}

export function attachedObjectIds(room: ReptileRoomWorkspace, vivariumId: string): string[] {
  return (room.objects ?? [])
    .filter((object) => object.parentAssetId === vivariumId || object.config?.linkedSlotId === vivariumId)
    .map((object) => object.id);
}

export function removeVivariumChildren(room: ReptileRoomWorkspace, vivariumId: string): ReptileRoomWorkspace {
  return {
    ...room,
    objects: (room.objects ?? []).filter((object) => object.parentAssetId !== vivariumId && object.config?.linkedSlotId !== vivariumId),
  };
}
