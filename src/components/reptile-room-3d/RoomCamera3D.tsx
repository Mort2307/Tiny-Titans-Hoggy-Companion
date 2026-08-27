import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ROOM_3D_CAMERA_HEIGHT_RATIO, ROOM_3D_CAMERA_MARGIN_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";
import { buildRoomNavigationNodes } from "./RoomNavigation3D";

type RoomNavigationTarget = { xCm: number; zCm: number };

type RoomCamera3DProps = {
  room: ReptileRoomWorkspace;
  target?: RoomNavigationTarget;
};

export function RoomCamera3D({ room, target }: RoomCamera3DProps) {
  const { camera } = useThree();
  const { width, depth, height } = getRoomDimensions3D(room);
  const margin = Math.min(cmToWorld(ROOM_3D_CAMERA_MARGIN_CM), width / 4, depth / 4, height / 4);
  const minX = -width / 2 + margin;
  const maxX = width / 2 - margin;
  const minZ = -depth / 2 + margin;
  const maxZ = depth / 2 - margin;
  const initialTarget = useMemo(() => buildRoomNavigationNodes(room)[0] ?? { xCm: 0, zCm: 0 }, [room]);
  const destination = target ?? initialTarget;

  useEffect(() => {
    const x = Math.min(maxX, Math.max(minX, cmToWorld(destination.xCm)));
    const z = Math.min(maxZ, Math.max(minZ, cmToWorld(destination.zCm)));
    camera.position.set(x, Math.min(height - margin, Math.max(margin, height * ROOM_3D_CAMERA_HEIGHT_RATIO)), z);
    camera.lookAt(0, height * 0.5, 0);
  }, [camera, destination.xCm, destination.zCm, height, margin, maxX, maxZ, minX, minZ]);

  return null;
}
