import { ROOM_3D_GRID_STEP_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { getRoomDimensions3D } from "./room3DScale";

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
    />
  );
}
