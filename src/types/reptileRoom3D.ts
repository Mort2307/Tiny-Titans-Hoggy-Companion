import type { ReptileFurnitureKind, ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace, ReptileRoomAssetType } from "../services/reptileRoomService";

export type Room3DSelection = { type: "slot" | "object"; id: string } | null;

export type RoomAssetIntelligenceRole =
  | "enclosure"
  | "thermostat"
  | "heating"
  | "lighting"
  | "power"
  | "timer"
  | "sensor"
  | "quarantine"
  | "enrichment"
  | "water"
  | "cleaning"
  | "weighing"
  | "general";

export type RoomAssetConfig = {
  enabled?: boolean;
  linkedSlotId?: string | null;
  linkedSnakeId?: string | null;
  targetTemperatureC?: number;
  currentTemperatureC?: number;
  humidity?: number;
  wattage?: number;
  outlets?: number;
  maxLoadWatts?: number;
  circuit?: string;
  switchable?: boolean;
  mode?: "heat" | "cool" | "off";
  photoperiodHours?: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  enclosureStyle?: string;
  probeLocation?: string;
  notes?: string;
};

export type Room3DAssetPreset = {
  assetId?: string;
  kind: ReptileFurnitureKind | "vivarium";
  label: string;
  icon?: string;
  width: number;
  depth: number;
  height: number;
  assetType?: ReptileRoomAssetType;
  intelligenceRole?: RoomAssetIntelligenceRole;
  config?: RoomAssetConfig;
};

export type Room3DTransformPatch = Partial<ReptileRoomObject> | (Partial<ReptileRoomSlot> & { rotation?: number });

export type VivariumTelemetry = {
  snakeName?: string;
  fedAt?: string;
  shedAt?: string;
  weighedAt?: string;
  cleanedAt?: string;
  targetTemperatureC?: number;
  currentTemperatureC?: number;
  humidity?: number;
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
  telemetryForSlot?: (slot: ReptileRoomSlot) => VivariumTelemetry | undefined;
  onSelect?: (selection: Room3DSelection) => void;
  onMove?: (selection: { type: "slot" | "object"; id: string }, deltaXcm: number, deltaYcm: number, deltaZcm: number, commit: boolean) => void;
  onTransformChange?: (selection: { type: "slot" | "object"; id: string }, patch: Room3DTransformPatch) => void;
  onAddAsset?: (preset: Room3DAssetPreset, spawnXcm: number, spawnYcm: number) => void;
  onSave?: () => Promise<void>;
  onTeleport?: (node: { id: string; xCm: number; zCm: number }) => void;
};

export type RoomDimensions3D = { widthCm: number; depthCm: number; heightCm: number; width: number; depth: number; height: number };
