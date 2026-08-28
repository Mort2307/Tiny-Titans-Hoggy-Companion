import type { ReptileFurnitureKind, ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace, ReptileRoomAssetType } from "../services/reptileRoomService";

export type Room3DSelection = { type: "slot" | "object"; id: string } | null;
export type Room3DAssetPreset = {
  kind: ReptileFurnitureKind | "vivarium";
  label: string;
  icon?: string;
  width: number;
  depth: number;
  height: number;
  assetType?: ReptileRoomAssetType;
};
export type Room3DProps = {
  room: ReptileRoomWorkspace;
  className?: string;
  showGrid?: boolean;
  showCeiling?: boolean;
  viewerMode?: boolean;
  objects?: ReptileRoomObject[];
  slots?: ReptileRoomSlot[];
  selectedId?: string | null;
  selectedType?: "slot" | "object" | null;
  photoForSlot?: (slot: ReptileRoomSlot) => string | undefined;
  onSelect?: (selection: Room3DSelection) => void;
  onMove?: (selection: { type: "slot" | "object"; id: string }, deltaXcm: number, deltaYcm: number, deltaZcm: number, commit: boolean) => void;
  onAddAsset?: (preset: Room3DAssetPreset, spawnXcm: number, spawnYcm: number) => void;
  onTeleport?: (node: { id: string; xCm: number; zCm: number }) => void;
};
export type RoomDimensions3D = { widthCm: number; depthCm: number; heightCm: number; width: number; depth: number; height: number };
