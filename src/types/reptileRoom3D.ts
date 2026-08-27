import type { ReptileRoomObject, ReptileRoomWorkspace } from "../services/reptileRoomService";

export type Room3DProps = {
  room: ReptileRoomWorkspace;
  className?: string;
  showGrid?: boolean;
  showCeiling?: boolean;
  objects?: ReptileRoomObject[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export type RoomDimensions3D = {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  width: number;
  depth: number;
  height: number;
};
