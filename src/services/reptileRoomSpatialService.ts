import type { RoomTemplateId, SpatialRoom } from "../types/ReptileRoomSpatial";
import { createSpatialRoom } from "../types/ReptileRoomSpatial";

const STORAGE_KEY = "tinyTitans.reptileRooms.v1";

function readRooms(): SpatialRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSpatialRoom) : [];
  } catch {
    return [];
  }
}

function writeRooms(rooms: SpatialRoom[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // Spatial layout is an optional local preference. The core app must never fail because storage is unavailable.
  }
}

function isSpatialRoom(value: unknown): value is SpatialRoom {
  if (!value || typeof value !== "object") return false;
  const room = value as Partial<SpatialRoom>;
  return typeof room.id === "string"
    && typeof room.name === "string"
    && typeof room.templateId === "string"
    && typeof room.schemaVersion === "number"
    && Array.isArray(room.walls)
    && Array.isArray(room.openings)
    && Array.isArray(room.objects)
    && Boolean(room.dimensions);
}

export function listSpatialRooms(): SpatialRoom[] {
  return readRooms();
}

export function getSpatialRoom(roomId: string): SpatialRoom | null {
  return readRooms().find((room) => room.id === roomId) ?? null;
}

export function saveSpatialRoom(room: SpatialRoom): SpatialRoom {
  const rooms = readRooms();
  const updated = { ...room, updatedAt: new Date().toISOString() };
  const index = rooms.findIndex((item) => item.id === room.id);
  if (index >= 0) rooms[index] = updated;
  else rooms.push(updated);
  writeRooms(rooms);
  return updated;
}

export function createAndSaveSpatialRoom(name: string, templateId: RoomTemplateId = "blank"): SpatialRoom {
  return saveSpatialRoom(createSpatialRoom(name, templateId));
}

export function removeSpatialRoom(roomId: string): boolean {
  const rooms = readRooms();
  const next = rooms.filter((room) => room.id !== roomId);
  if (next.length === rooms.length) return false;
  writeRooms(next);
  return true;
}

export function duplicateSpatialRoom(roomId: string, name?: string): SpatialRoom | null {
  const source = getSpatialRoom(roomId);
  if (!source) return null;
  const now = new Date().toISOString();
  return saveSpatialRoom({
    ...source,
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name?.trim() || `${source.name} Copy`,
    objects: source.objects.map((object) => ({ ...object, id: `${object.id}-${Date.now()}` })),
    createdAt: now,
    updatedAt: now,
  });
}
