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

export type ReptileRoomSlot = {
  id: string;
  snakeId: string | null;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ReptileRoomWorkspace = {
  id: string;
  name: string;
  template: ReptileRoomTemplate;
  slots: ReptileRoomSlot[];
  storedSlots: ReptileRoomSlot[];
  createdAt: string;
  updatedAt: string;
};

const LOCAL_CACHE_PREFIX = "tinyTitans.reptileRooms.v1";

function cacheKey(uid: string) {
  return `${LOCAL_CACHE_PREFIX}:${uid}`;
}

function isSlot(value: unknown): value is ReptileRoomSlot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReptileRoomSlot>;
  return typeof item.id === "string"
    && (typeof item.snakeId === "string" || item.snakeId === null)
    && typeof item.label === "string"
    && Number.isFinite(item.x)
    && Number.isFinite(item.y)
    && Number.isFinite(item.w)
    && Number.isFinite(item.h);
}

function normalizeRoom(value: unknown): ReptileRoomWorkspace | null {
  if (!value || typeof value !== "object") return null;
  const room = value as Partial<ReptileRoomWorkspace>;
  if (typeof room.id !== "string" || typeof room.name !== "string") return null;
  const slots = Array.isArray(room.slots) ? room.slots.filter(isSlot) : [];
  const storedSlots = Array.isArray(room.storedSlots) ? room.storedSlots.filter(isSlot) : [];
  const template: ReptileRoomTemplate = ["blank", "hatchling", "breeding", "medical", "brumation", "bioactive", "custom"].includes(room.template as string)
    ? room.template as ReptileRoomTemplate
    : "custom";
  const now = new Date().toISOString();
  return {
    id: room.id,
    name: room.name,
    template,
    slots,
    storedSlots,
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
  } catch {
    return [];
  }
}

function writeCache(uid: string, rooms: ReptileRoomWorkspace[]) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(rooms));
  } catch {
    // Local cache is optional; Firestore remains authoritative.
  }
}

function roomsCollection(uid: string) {
  return collection(db, "users", uid, "reptileRooms");
}

export async function loadReptileRooms(uid: string): Promise<ReptileRoomWorkspace[]> {
  const snapshot = await getDocs(roomsCollection(uid));
  const remote = snapshot.docs
    .map((item) => normalizeRoom({ id: item.id, ...item.data() }))
    .filter((room): room is ReptileRoomWorkspace => Boolean(room));

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
  const cached = readCache(uid).filter((room) => room.id !== roomId);
  writeCache(uid, cached);
}

export function migrateLegacyRoom(uid: string, legacySlots: ReptileRoomSlot[]): ReptileRoomWorkspace[] {
  const cached = readCache(uid);
  if (cached.length || !legacySlots.length) return cached;
  const now = new Date().toISOString();
  const migrated: ReptileRoomWorkspace = {
    id: "room-main",
    name: "Main Reptile Room",
    template: "custom",
    slots: legacySlots,
    storedSlots: [],
    createdAt: now,
    updatedAt: now,
  };
  writeCache(uid, [migrated]);
  return [migrated];
}
