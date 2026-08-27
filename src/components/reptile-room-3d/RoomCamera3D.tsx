import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ROOM_3D_CAMERA_HEIGHT_RATIO, ROOM_3D_CAMERA_MARGIN_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";

type RoomCamera3DProps = {
  room: ReptileRoomWorkspace;
};

export function RoomCamera3D({ room }: RoomCamera3DProps) {
  const { camera } = useThree();
  const { width, depth, height } = getRoomDimensions3D(room);
  const margin = Math.min(cmToWorld(ROOM_3D_CAMERA_MARGIN_CM), width / 4, depth / 4, height / 4);
  const minX = -width / 2 + margin;
  const maxX = width / 2 - margin;
  const minY = margin;
  const maxY = Math.max(minY, height - margin);
  const minZ = -depth / 2 + margin;
  const maxZ = depth / 2 - margin;

  useEffect(() => {
    camera.position.set(0, height * ROOM_3D_CAMERA_HEIGHT_RATIO, depth * 0.28);
    camera.lookAt(0, height * 0.5, 0);
  }, [camera, depth, height]);

  useFrame(() => {
    camera.position.x = Math.min(maxX, Math.max(minX, camera.position.x));
    camera.position.y = Math.min(maxY, Math.max(minY, camera.position.y));
    camera.position.z = Math.min(maxZ, Math.max(minZ, camera.position.z));
  });

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={Math.max(margin * 2, 0.2)}
      maxDistance={Math.max(minX - maxX, minZ - maxZ) * -1}
      target={[0, height * 0.5, 0]}
    />
  );
}
