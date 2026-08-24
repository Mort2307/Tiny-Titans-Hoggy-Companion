import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type ReptileRoomTemplate =
  | "blank"
  | "hatchling"
  | "breeding"
  | "medical"
  | "brumation"
  | "bioactive"
  | "custom";

export type ReptileRoomUnit = "metric" | "imperial";

export type VivariumLifecycleStatus =
  | "active"
  | "stored"
  | "empty"
  | "reserved"
  | "retired"
  | "quarantine"
  | "breeding";

export type VivariumCondition = "excellent" | "good" | "fair" | "needs-repair" | "retired";
export type VivariumAvailability = "available" | "occupied";

export type ReptileFurnitureKind =
  | "rack"
  | "shelving"
  | "workbench"
  | "storage-cabinet"
  | "equipment-station"
  | "quarantine-area"
  | "door"
  | "window"
  | "vent";

export type ReptileRoomObject = {
  id: string;
  kind: ReptileFurnitureKind;
  label: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  notes?: string;
};

export type ReptileRoomSlot = {
  id: string;
  snakeId: string | null;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth?: number;
  height?: number;
  lifecycleStatus?: VivariumLifecycleStatus;
  condition?: VivariumCondition;
  availability?: VivariumAvailability;
  storageLocation?: string;
  storageNote?: string;
  notes?: string;
  maintenanceNote?: string;
  photoUrl?: string;
};

export type ReptileRoomWorkspace = {
  id: string;
  name: string;
  template: ReptileRoomTemplate;
  unit?: ReptileRoomUnit;
  width?: number;
  depth?: number;
  height?: number;
  storageCapacity?: number;
  slots: ReptileRoomSlot[];
  storedSlots: ReptileRoomSlot[];
  objects?: ReptileRoomObject[];
  createdAt: string;
  updatedAt: string;
};

const LOCAL_CACHE_PREFIX = "tinyTitans.reptileRooms.v2";
const DEFAULT_ROOM = { width: 360, depth: 300, height: 240, storageCapacity: 12 };

function cacheKey(uid: string) { return `${LOCAL_CACHE_PREFIX}:${uid}`; }

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isSlot(value: unknown): value is ReptileRoomSlot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReptileRoomSlot>;
  return typeof item.id === "string"
    && (typeof item.snakeId === "string" || item.snakeId === null)
    && typeof item.label === "string"
    && typeof item.x === "number" && Number.isFinite(item.x)
    && typeof item.y === "number" && Number.isFinite(item.y)
    && typeof item.w === "number" && Number.isFinite(item.w)
    && typeof item.h === "number" && Number.isFinite(item.h);
}

function normalizeSlot(value: unknown): ReptileRoomSlot | null {
  if (!isSlot(value)) return null;
  const item = value as ReptileRoomSlot;
  return {
    ...item,
    depth: numberOr(item.depth, item.w),
    height: numberOr(item.height, 30),
    lifecycleStatus: item.lifecycleStatus ?? (item.snakeId ? "active" : "empty"),
    condition: item.condition ?? "good",
    availability: item.availability ?? (item.snakeId ? "occupied" : "available"),
    storageLocation: typeof item.storageLocation === "string" ? item.storageLocation : "",
    storageNote: typeof item.storageNote === "string" ? item.storageNote : "",
    notes: typeof item.notes === "string" ? item.notes : "",
    maintenanceNote: typeof item.maintenanceNote === "string" ? item.maintenanceNote : "",
  };
}

function normalizeObject(value: unknown): ReptileRoomObject | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<ReptileRoomObject>;
  if (typeof item.id !== "string" || typeof item.kind !== "string" || typeof item.label !== "string") return null;
  const kinds: ReptileFurnitureKind[] = ["rack", "shelving", "workbench", "storage-cabinet", "equipment-station", "quarantine-area", "door", "window", "vent"];
  if (!kinds.includes(item.kind as ReptileFurnitureKind)) return null;
  return {
    id: item.id,
    kind: item.kind as ReptileFurnitureKind,
    label: item.label,
    x: numberOr(item.x, 0),
    y: numberOr(item.y, 0),
    width: numberOr(item.width, 90),
    depth: numberOr(item.depth, 45),
    height: numberOr(item.height, 80),
    rotation: numberOr(item.rotation, 0),
    notes: typeof item.notes === "string" ? item.notes : "",
  };
}

function normalizeRoom(value: unknown): ReptileRoomWorkspace | null {
  if (!value || typeof value !== "object") return null;
  const room = value as Partial<ReptileRoomWorkspace>;
  if (typeof room.id !== "string" || typeof room.name !== "string") return null;
  const slots = Array.isArray(room.slots) ? room.slots.map(normalizeSlot).filter((item): item is ReptileRoomSlot => Boolean(item)) : [];
  const storedSlots = Array.isArray(room.storedSlots) ? room.storedSlots.map(normalizeSlot).filter((item): item is ReptileRoomSlot => Boolean(item)) : [];
  const objects = Array.isArray(room.objects) ? room.objects.map(normalizeObject).filter((item): item is ReptileRoomObject => Boolean(item)) : [];
  const template: ReptileRoomTemplate = ["blank", "hatchling", "breeding", "medical", "brumation", "bioactive", "custom"].includes(room.template as string)
    ? room.template as ReptileRoomTemplate
    : "custom";
  const unit: ReptileRoomUnit = room.unit === "imperial" ? "imperial" : "metric";
  const now = new Date().toISOString();
  return {
    id: room.id,
    name: room.name,
    template,
    unit,
    width: numberOr(room.width, DEFAULT_ROOM.width),
    depth: numberOr(room.depth, DEFAULT_ROOM.depth),
    height: numberOr(room.height, DEFAULT_ROOM.height),
    storageCapacity: numberOr(room.storageCapacity, DEFAULT_ROOM.storageCapacity),
    slots,
    storedSlots,
    objects,
    createdAt: typeof room.createdAt === "string" ? room.createdAt : now,
    updatedAt: typeof room.updatedAt === "string" ? room.updatedAt : now,
  };
}

function readCache(uid: string): ReptileRoomWorkspace[] {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(normalizeRoom).filter((room): room is ReptileRoomWorkspace => Boolean(room)) : [];
  } catch { return []; }
}

function writeCache(uid: string, rooms: ReptileRoomWorkspace[]) {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(rooms)); } catch { /* optional cache */ }
}

function roomsCollection(uid: string) { return collection(db, "users", uid, "reptileRooms"); }

export async function loadReptileRooms(uid: string): Promise<ReptileRoomWorkspace[]> {
  const snapshot = await getDocs(roomsCollection(uid));
  const remote = snapshot.docs.map((item) => normalizeRoom({ id: item.id, ...item.data() })).filter((room): room is ReptileRoomWorkspace => Boolean(room));
  if (remote.length) {
    remote.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    writeCache(uid, remote);
    return remote;
  }
  return readCache(uid);
}

export async function saveReptileRooms(uid: string, rooms: ReptileRoomWorkspace[]): Promise<void> {
  const normalized = rooms.map((room) => ({ ...room, updatedAt: new Date().toISOString() }));
  writeCache(uid, normalized);
  await Promise.all(normalized.map((room) => setDoc(doc(roomsCollection(uid), room.id), room)));
}

export async function deleteReptileRoom(uid: string, roomId: string): Promise<void> {
  await deleteDoc(doc(roomsCollection(uid), roomId));
  writeCache(uid, readCache(uid).filter((room) => room.id !== roomId));
}

export function migrateLegacyRoom(uid: string, legacySlots: ReptileRoomSlot[]): ReptileRoomWorkspace[] {
  const cached = readCache(uid);
  if (cached.length || !legacySlots.length) return cached;
  const now = new Date().toISOString();
  const migrated: ReptileRoomWorkspace = {
    id: "room-main",
    name: "Main Reptile Room",
    template: "custom",
    unit: "metric",
    width: DEFAULT_ROOM.width,
    depth: DEFAULT_ROOM.depth,
    height: DEFAULT_ROOM.height,
    storageCapacity: DEFAULT_ROOM.storageCapacity,
    slots: legacySlots.map((slot) => normalizeSlot(slot)!).filter(Boolean),
    storedSlots: [],
    objects: [],
    createdAt: now,
    updatedAt: now,
  };
  writeCache(uid, [migrated]);
  return [migrated];
}
