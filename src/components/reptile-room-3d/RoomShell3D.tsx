import { DoubleSide } from "three";
import { ROOM_3D_WALL_THICKNESS_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";

type RoomShell3DProps = {
  room: ReptileRoomWorkspace;
  showCeiling: boolean;
};

export function RoomShell3D({ room, showCeiling }: RoomShell3DProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const wallThickness = cmToWorld(ROOM_3D_WALL_THICKNESS_CM);

  return (
    <group name="room-shell-3d">
      <mesh position={[0, -wallThickness / 2, 0]} receiveShadow>
        <boxGeometry args={[width + wallThickness * 2, wallThickness, depth + wallThickness * 2]} />
        <meshStandardMaterial color="#30343a" roughness={0.9} />
      </mesh>

      <mesh position={[-width / 2 - wallThickness / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, height, depth + wallThickness * 2]} />
        <meshStandardMaterial color="#6d6257" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh position={[width / 2 + wallThickness / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, height, depth + wallThickness * 2]} />
        <meshStandardMaterial color="#6d6257" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2 - wallThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial color="#6d6257" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh position={[0, height / 2, depth / 2 + wallThickness / 2]} receiveShadow>
        <boxGeometry args={[width, height, wallThickness]} />
        <meshStandardMaterial color="#6d6257" roughness={0.95} side={DoubleSide} />
      </mesh>

      {showCeiling && (
        <mesh position={[0, height + wallThickness / 2, 0]} receiveShadow>
          <boxGeometry args={[width + wallThickness * 2, wallThickness, depth + wallThickness * 2]} />
          <meshStandardMaterial color="#45484d" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
