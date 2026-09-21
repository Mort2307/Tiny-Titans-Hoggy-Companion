import type { ReptileRoomPoint, ReptileRoomSocket, ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Room3DAssetKind } from "../services/reptileRoomAssetService";

export function roomBlueprintPoints(room: ReptileRoomWorkspace): ReptileRoomPoint[] {
  return room.floorPlan?.map((point) => ({ ...point })) ?? [
    { x: 0, z: 0 },
    { x: room.width ?? 360, z: 0 },
    { x: room.width ?? 360, z: room.depth ?? 300 },
    { x: 0, z: room.depth ?? 300 },
  ];
}

export function createRoomPowerSocket(wall: ReptileRoomWorkspace["walls"][number]): ReptileRoomSocket {
  return {
    id: "socket-" + crypto.randomUUID(),
    wallId: wall.id,
    x: (wall.start.x + wall.end.x) / 2,
    z: (wall.start.z + wall.end.z) / 2,
    height: 45,
    outlets: 2,
    label: "Power socket",
    switchable: true,
    enabled: true,
    circuit: "",
    maxLoadWatts: 0,
  };
}

export function visualField(kind: Room3DAssetKind): "roomPhotoUrl" | "logoUrl" | "wallImage" {
  return kind === "room-photo" ? "roomPhotoUrl" : kind === "logo" ? "logoUrl" : "wallImage";
}
