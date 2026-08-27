import { ROOM_3D_GRID_STEP_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";

type MeasurementGrid3DProps = {
  room: ReptileRoomWorkspace;
};

export function MeasurementGrid3D({ room }: MeasurementGrid3DProps) {
  const { width, depth } = getRoomDimensions3D(room);
  const maxDimensionCm = Math.max(room.width ?? 1, room.depth ?? 1);
  const divisions = Math.max(1, Math.ceil(maxDimensionCm / ROOM_3D_GRID_STEP_CM));

  return (
    <gridHelper
      name="room-measurement-grid"
      args={[Math.max(width, depth), divisions, "#737980", "#3f444a"]}
      position={[0, 0.002, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

export function RoomMeasurementLabel({ room }: { room: ReptileRoomWorkspace }) {
  const { widthCm, depthCm, heightCm } = getRoomDimensions3D(room);
  const width = cmToWorld(widthCm);
  const depth = cmToWorld(depthCm);
  return (
    <group name="room-measurement-reference">
      <lineSegments position={[0, 0.006, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([-width / 2, 0, depth / 2 + 0.06, width / 2, 0, depth / 2 + 0.06]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#d4a84f" />
      </lineSegments>
      <lineSegments position={[width / 2 + 0.06, 0.006, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, -depth / 2, 0, 0, depth / 2]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#d4a84f" />
      </lineSegments>
      <mesh position={[0, 0.01, depth / 2 + 0.1]}>
        <planeGeometry args={[Math.max(width, 0.5), 0.001]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh position={[0, heightCm ? cmToWorld(heightCm) : 0, 0]} visible={false}>
        <boxGeometry args={[0.01, 0.01, 0.01]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
