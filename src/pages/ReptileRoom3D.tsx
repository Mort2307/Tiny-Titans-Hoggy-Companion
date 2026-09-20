import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomAssetConfig, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import type { EnvironmentHistoryEntry } from "../types/Enclosure";
import type { Snake } from "../types/Snake";
import type { Room3DAssetPreset, Room3DSelection, Room3DTransformPatch, VivariumTelemetry } from "../types/reptileRoom3D";
import { REPTILE_ROOM_ASSET_CATEGORIES } from "../data/reptileRoomAssetCatalog";
import Room3D from "../components/reptile-room-3d/Room3D";
import { RoomAssetInspector } from "../components/reptile-room-3d/RoomAssetInspector";
import "../styles/reptile-room-3d-workspace.css";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snap = (v: number, grid = 5) => Math.round(v / grid) * grid;
const nextId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const snakeName = (snake: Snake | undefined) => snake?.name ?? "Unnamed Hoggy";
const vivWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const vivDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.depth ?? slot.h);
const vivHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 45);
type SlotTransform = ReptileRoomSlot & { rotation?: number; parentAssetId?: string | null };
const slotRotation = (slot: ReptileRoomSlot | null) => slot ? (slot as SlotTransform).rotation ?? 0 : 0;
const slotParentAssetId = (slot: ReptileRoomSlot | null) => slot ? (slot as SlotTransform).parentAssetId ?? null : null;

type NodeRef = { type: "slot" | "object"; id: string };
const entityGroup = (room: ReptileRoomWorkspace, node: NodeRef) => {
  if (node.type === "slot") {
    const slot = room.slots.find((item) => item.id === node.id);
    return slot?.stackGroupId ?? `viv-group-${node.id}`;
  }
  const object = (room.objects ?? []).find((item) => item.id === node.id);
  return object?.stackGroupId ?? (object?.config?.linkedSlotId ? `viv-group-${object.config.linkedSlotId}` : null);
};
function getMovementMembers(room: ReptileRoomWorkspace, selection: NodeRef): NodeRef[] {
  const result = new Map<string, NodeRef>();
  const add = (node: NodeRef) => {
    const key = `${node.type}:${node.id}`;
    if (!result.has(key)) result.set(key, node);
  };
  add(selection);

  if (selection.type === "object") {
    const object = (room.objects ?? []).find((item) => item.id === selection.id);
    if (object?.parentAssetId || object?.config?.linkedSlotId) return [...result.values()];
  }

  const selectedGroup = entityGroup(room, selection);
  if (!selectedGroup) return [...result.values()];

  room.slots.forEach((slot) => {
    if (entityGroup(room, { type: "slot", id: slot.id }) === selectedGroup) add({ type: "slot", id: slot.id });
  });
  (room.objects ?? []).forEach((object) => {
    if (entityGroup(room, { type: "object", id: object.id }) === selectedGroup) add({ type: "object", id: object.id });
  });
  return [...result.values()];
}

function RoomAssetLibrarySection({ onAddAsset }: { onAddAsset: (preset: Room3DAssetPreset) => void }) {
  return <section className="rr3d-library-section"><div className="rr3d-library-heading"><div><span className="rr3d-kicker">ASSET LIBRARY</span><h2>Keeper toolkit</h2></div><span className="rr3d-library-count">{REPTILE_ROOM_ASSET_CATEGORIES.flatMap((category) => category.items).length}</span></div><div className="rr3d-library-categories">{REPTILE_ROOM_ASSET_CATEGORIES.map((category) => <details key={category.id} className="rr3d-library-category" open={category.id === "vivariums"}><summary>{category.icon} {category.label}<small>{category.items.length}</small></summary><div className="rr3d-library-items">{category.items.map((preset) => <button type="button" className="rr3d-library-item" key={preset.assetId ?? preset.label} onClick={() => onAddAsset(preset)}><span className="rr3d-library-icon">{preset.icon}</span><span className="rr3d-library-copy"><strong>{preset.label}</strong><small>{preset.width} × {preset.depth} × {preset.height} cm{preset.intelligenceRole ? ` · ${preset.intelligenceRole}` : ""}</small></span><span className="rr3d-library-add">+</span></button>)}</div></details>)}</div></section>;
}
