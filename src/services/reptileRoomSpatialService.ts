import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { RoomTemplateId, SpatialObject, SpatialRoom } from "../types/ReptileRoomSpatial";
import { convertDimension, createSpatialRoom } from "../types/ReptileRoomSpatial";

const STORAGE_KEY = "tinyTitans.reptileRooms.v1";

function readRooms(): SpatialRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSpatialRoom) : [];
  } catch { return []; }
}
function writeRooms(rooms: SpatialRoom[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms)); } catch { /* local cache is optional */ }
}
function isSpatialRoom(value: unknown): value is SpatialRoom {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<SpatialRoom>;
  return typeof room.id === "string" && typeof room.name === "string" && typeof room.templateId === "string" && typeof room.schemaVersion === "number" && Array.isArray(room.walls) && Array.isArray(room.openings) && Array.isArray(room.objects) && Boolean(room.dimensions);
}
function normalizeObjectToRoom(object: SpatialObject, roomUnit: SpatialRoom["dimensions"]["unit"]): SpatialObject {
  return {
    ...object,
    position: { ...object.position, x: convertDimension(object.position.x, object.position.unit, roomUnit), y: convertDimension(object.position.y, object.position.unit, roomUnit), unit: roomUnit },
    dimensions: { width: convertDimension(object.dimensions.width, object.dimensions.unit, roomUnit), depth: convertDimension(object.dimensions.depth, object.dimensions.unit, roomUnit), height: convertDimension(object.dimensions.height, object.dimensions.unit, roomUnit), unit: roomUnit },
  };
}
function normalizeRoom(room: SpatialRoom): SpatialRoom {
  const unit = room.dimensions.unit;
  return { ...room, objects: room.objects.map((object) => normalizeObjectToRoom(object, unit)) };
}
export function listSpatialRooms(): SpatialRoom[] { return readRooms(); }
export function getSpatialRoom(roomId: string): SpatialRoom | null { return readRooms().find((room) => room.id === roomId) ?? null; }
export function saveSpatialRoom(room: SpatialRoom): SpatialRoom {
  const rooms = readRooms();
  const updated = { ...normalizeRoom(room), updatedAt: new Date().toISOString() };
  const index = rooms.findIndex((item) => item.id === room.id);
  if (index >= 0) rooms[index] = updated; else rooms.push(updated);
  writeRooms(rooms);
  return updated;
}
export function createAndSaveSpatialRoom(name: string, templateId: RoomTemplateId = "blank"): SpatialRoom { return saveSpatialRoom(createSpatialRoom(name, templateId)); }
export function removeSpatialRoom(roomId: string): boolean {
  const rooms = readRooms();
  const next = rooms.filter((room) => room.id !== roomId);
  if (next.length === rooms.length) return false;
  writeRooms(next); return true;
}
export function duplicateSpatialRoom(roomId: string, name?: string): SpatialRoom | null {
  const source = getSpatialRoom(roomId);
  if (!source) return null;
  const now = new Date().toISOString();
  return saveSpatialRoom({ ...source, id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name?.trim() || `${source.name} Copy`, objects: source.objects.map((object, index) => ({ ...object, id: `${object.id}-copy-${index + 1}` })), createdAt: now, updatedAt: now });
}

const remoteCollection = (uid: string) => collection(db, "users", uid, "reptileRooms");
const remoteDocument = (uid: string, roomId: string) => doc(db, "users", uid, "reptileRooms", roomId);
/** Explicit sync only. No realtime listener and no autosave writes. */
export async function syncSpatialRoomsFromCloud(uid: string): Promise<SpatialRoom[]> {
  try {
    const snapshot = await getDocs(remoteCollection(uid));
    const remote = snapshot.docs.map((item) => item.data()).filter(isSpatialRoom).map(normalizeRoom);
    if (remote.length) writeRooms(remote);
    return remote.length ? remote : readRooms();
  } catch { return readRooms(); }
}
/** Explicit sync only. Call after the user chooses Save/Sync, never during dragging. */
export async function syncSpatialRoomToCloud(uid: string, room: SpatialRoom): Promise<void> {
  const updated = saveSpatialRoom(room);
  await setDoc(remoteDocument(uid, updated.id), updated, { merge: true });
}
export async function deleteSpatialRoomFromCloud(uid: string, roomId: string): Promise<void> {
  removeSpatialRoom(roomId);
  await deleteDoc(remoteDocument(uid, roomId));
}
