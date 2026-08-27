import type { ReptileRoomWorkspace } from "../services/reptileRoomService";

export type Room3DProps = {
  room: ReptileRoomWorkspace;
  className?: string;
  showGrid?: boolean;
  showCeiling?: boolean;
};

export type RoomDimensions3D = {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  width: number;
  depth: number;
  height: number;
};
