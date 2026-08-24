import type { DimensionsMm, ReptileSpace, SpatialUnit } from "../types/ReptileSpace";
import { toMillimetres } from "./spatialEngine";

export interface LegacyRoomLayoutItem {
  id?: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  enclosureId?: string | null;
  snakeId?: string | null;
}

export interface LegacyRoomLayout {
  roomName?: string;
  width?: number;
  height?: number;
  unit?: SpatialUnit;
  items?: LegacyRoomLayoutItem[];
}

const DEFAULT_ROOM: DimensionsMm = { width: 3000, depth: 2500, height: 2400 };

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function legacyKind(type?: string) {
  switch ((type ?? "").toLowerCase()) {
    case "vivarium": return "vivarium" as const;
    case "rack": return "rack" as const;
    case "storage": return "storage" as const;
    case "workbench": return "workbench" as const;
    case "equipment": return "equipment" as const;
    default: return "custom" as const;
  }
}

export function migrateLegacyRoomLayout(legacy: LegacyRoomLayout, now = new Date().toISOString()): ReptileSpace {
  const unit = legacy.unit ?? "m";
  const width = toMillimetres(safeNumber(legacy.width, 3), unit);
  const depth = toMillimetres(safeNumber(legacy.height, 2.5), unit);
  const dimensions: DimensionsMm = {
    width: width > 0 ? width : DEFAULT_ROOM.width,
    depth: depth > 0 ? depth : DEFAULT_ROOM.depth,
    height: DEFAULT_ROOM.height,
  };

  return {
    id: `space-migrated-${Date.now()}`,
    name: legacy.roomName?.trim() || "My Reptile Room",
    templateId: null,
    dimensions,
    preferredUnit: unit,
    walls: [],
    openings: [],
    objects: (legacy.items ?? []).map((item, index) => ({
      id: item.id || `migrated-object-${index + 1}`,
      kind: legacyKind(item.type),
      name: item.name?.trim() || `Room object ${index + 1}`,
      dimensions: {
        width: Math.max(1, toMillimetres(safeNumber(item.width, 1), unit)),
        depth: Math.max(1, toMillimetres(safeNumber(item.height, 0.6), unit)),
        height: 600,
      },
      position: {
        x: Math.max(0, toMillimetres(safeNumber(item.x), unit)),
        y: Math.max(0, toMillimetres(safeNumber(item.y), unit)),
        z: 0,
        rotationDeg: 0,
      },
      metadata: {
        migratedFromLegacy: true,
        legacyType: item.type ?? "custom",
        enclosureId: item.enclosureId ?? null,
        snakeId: item.snakeId ?? null,
      },
      ...(legacyKind(item.type) === "vivarium" ? { enclosureId: item.enclosureId ?? null, snakeId: item.snakeId ?? null } : {}),
    })),
    version: 2,
    createdAt: now,
    updatedAt: now,
  };
}

export function isReptileSpace(value: unknown): value is ReptileSpace {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReptileSpace>;
  return candidate.version === 2 && typeof candidate.id === "string" && !!candidate.dimensions && Array.isArray(candidate.objects);
}
