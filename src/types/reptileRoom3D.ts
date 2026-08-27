import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../services/reptileRoomService";

export type Room3DSelection = { type: "slot" | "object"; id: string } | null;

export type Room3DProps = {
  room: ReptileRoomWorkspace;
  className?: string;
  showGrid?: boolean;
  showCeiling?: boolean;
  objects?: ReptileRoomObject[];
  slots?: ReptileRoomSlot[];
  selectedId?: string | null;
  selectedType?: "slot" | "object" | null;
  photoForSlot?: (slot: ReptileRoomSlot) => string | undefined;
  onSelect?: (selection: Room3DSelection) => void;
  onMove?: (selection: { type: "slot" | "object"; id: string }, deltaXcm: number, deltaYcm: number, commit: boolean) => void;
};

export type RoomDimensions3D = {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  width: number;
  depth: number;
  height: number;
};
