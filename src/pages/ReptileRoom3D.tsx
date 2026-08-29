import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import type { Snake } from "../types/Snake";
import type { Room3DAssetPreset, Room3DSelection, Room3DTransformPatch } from "../types/reptileRoom3D";
import Room3D from "../components/reptile-room-3d/Room3D";
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
const entityGroup = (room: ReptileRoomWorkspace, node: NodeRef) => node.type === "slot" ? room.slots.find((item) => item.id === node.id)?.stackGroupId ?? null : (room.objects ?? []).find((item) => item.id === node.id)?.stackGroupId ?? null;

function getMovementMembers(room: ReptileRoomWorkspace, selection: NodeRef): NodeRef[] {
  const result = new Map<string, NodeRef>();
  const add = (node: NodeRef) => { const key = `${node.type}:${node.id}`; if (!result.has(key)) result.set(key, node); };
  add(selection);
  const selectedGroup = entityGroup(room, selection);
  if (selectedGroup) {
    room.slots.forEach((slot) => { if (slot.stackGroupId === selectedGroup) add({ type: "slot", id: slot.id }); });
    (room.objects ?? []).forEach((object) => { if (object.stackGroupId === selectedGroup) add({ type: "object", id: object.id }); });
  }
  if (selection.type === "object") {
    let changed = true;
    while (changed) {
      changed = false;
      const current = [...result.values()];
      current.forEach((node) => {
        const group = entityGroup(room, node);
        room.slots.forEach((slot) => {
          const parent = slotParentAssetId(slot);
          if (parent === node.id || (group && slot.stackGroupId === group)) { const before = result.size; add({ type: "slot", id: slot.id }); changed ||= result.size !== before; }
        });
        (room.objects ?? []).forEach((object) => {
          if (object.parentAssetId === node.id || (group && object.stackGroupId === group)) { const before = result.size; add({ type: "object", id: object.id }); changed ||= result.size !== before; }
        });
      });
    }
  }
  return [...result.values()];
}

function getMovedRoom(room: ReptileRoomWorkspace, selection: Room3DSelection, dx: number, dy: number, dz: number, commit: boolean): ReptileRoomWorkspace {
  if (!selection) return room;
  const members = getMovementMembers(room, selection);
  const moveSlot = (slot: ReptileRoomSlot): ReptileRoomSlot => ({ ...slot, x: clamp(slot.x + dx, 0, Math.max(0, (room.width ?? 0) - vivWidth(slot))), y: clamp(slot.y + dy, 0, Math.max(0, (room.depth ?? 0) - vivDepth(slot))), z: clamp(slot.z + dz, 0, Math.max(0, (room.height ?? 0) - vivHeight(slot))) });
  const moveObject = (object: ReptileRoomObject): ReptileRoomObject => ({ ...object, x: clamp(object.x + dx, 0, Math.max(0, (room.width ?? 0) - object.width)), y: clamp(object.y + dy, 0, Math.max(0, (room.depth ?? 0) - object.depth)), z: clamp(object.z + dz, 0, Math.max(0, (room.height ?? 0) - object.height)) });
  const slotIds = new Set(members.filter((item) => item.type === "slot").map((item) => item.id));
  const objectIds = new Set(members.filter((item) => item.type === "object").map((item) => item.id));
  return { ...room, slots: room.slots.map((slot) => slotIds.has(slot.id) ? moveSlot(slot) : slot), objects: (room.objects ?? []).map((object) => objectIds.has(object.id) ? moveObject(object) : object), updatedAt: commit ? new Date().toISOString() : room.updatedAt };
}

const ASSETS: Room3DAssetPreset[] = [
  { kind: "table", label: "Oak Table · 4×2×2 ft", icon: "🪵", width: 121.92, depth: 60.96, height: 60.96, assetType: "furniture" },
  { kind: "cabinet", label: "Teak Corner Unit", icon: "🗄️", width: 90, depth: 45, height: 180, assetType: "furniture" },
  { kind: "shelving", label: "Shelving", icon: "▤", width: 90, depth: 40, height: 180, assetType: "furniture" },
  { kind: "rack", label: "Reptile Rack", icon: "▥", width: 120, depth: 55, height: 180, assetType: "furniture" },
  { kind: "workbench", label: "Workbench", icon: "🛠️", width: 120, depth: 60, height: 90, assetType: "furniture" },
  { kind: "storage-cabinet", label: "Storage Cabinet", icon: "📦", width: 80, depth: 45, height: 120, assetType: "furniture" },
  { kind: "chair", label: "Chair", icon: "🪑", width: 45, depth: 45, height: 90, assetType: "furniture" },
  { kind: "vivarium", label: "4×2×2 ft Vivarium", icon: "🏠", width: 121.92, depth: 60.96, height: 60.96, assetType: "vivarium" },
];

export default function ReptileRoom3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<Room3DSelection>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string>>({});
  const roomsRef = useRef(rooms);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);
  useEffect(() => () => { Object.values(photoPreviewUrls).forEach((url) => URL.revokeObjectURL(url)); }, [photoPreviewUrls]);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedSlot = selected?.type === "slot" ? slots.find((slot) => slot.id === selected.id) ?? null : null;
  const selectedObject = selected?.type === "object" ? objects.find((object) => object.id === selected.id) ?? null : null;

  const persistRooms = useCallback(async (nextRooms: ReptileRoomWorkspace[], message?: string) => {
    const stamped = nextRooms.map((item) => ({ ...item, roomVersion: 4, updatedAt: new Date().toISOString() }));
    setRooms(stamped); roomsRef.current = stamped;
    if (!user) return;
    setSaving(true);
    try { await saveReptileRooms(user.uid, stamped); if (message) setNotice(message); } catch { setNotice("Saved locally; cloud sync failed."); } finally { setSaving(false); }
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms); roomsRef.current = loadedRooms; setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);
  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateRoom = useCallback((transform: (current: ReptileRoomWorkspace) => ReptileRoomWorkspace, message?: string) => {
    const current = roomsRef.current.find((item) => item.id === room?.id); if (!current) return;
    void persistRooms(roomsRef.current.map((item) => item.id === current.id ? transform(item) : item), message);
  }, [persistRooms, room?.id]);

  const addAsset = useCallback((preset: Room3DAssetPreset) => {
    if (!room) return;
    const roomWidth = room.width ?? 0; const roomDepth = room.depth ?? 0;
    const x = clamp(snap((roomWidth - preset.width) / 2), 0, Math.max(0, roomWidth - preset.width));
    const y = clamp(snap((roomDepth - preset.depth) / 2), 0, Math.max(0, roomDepth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot: ReptileRoomSlot = { id: nextId("viv"), snakeId: null, label: "Empty Vivarium", x, y, z: 0, w: preset.width, h: preset.depth, depth: preset.depth, height: preset.height, lifecycleStatus: "empty", condition: "good", availability: "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null, photoUrl: "" };
      updateRoom((current) => ({ ...current, slots: [...current.slots, slot] }), "Vivarium added."); setSelected({ type: "slot", id: slot.id }); return;
    }
    const object: ReptileRoomObject = { id: nextId(preset.kind), kind: preset.kind as ReptileFurnitureKind, label: preset.label, x, y, z: 0, width: preset.width, depth: preset.depth, height: preset.height, rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null, clearance: {}, notes: "", assetType: preset.assetType ?? "furniture" };
    updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), object] }), `${preset.label} added.`); setSelected({ type: "object", id: object.id });
  }, [room, updateRoom]);

  const moveSelection = useCallback((selection: { type: "slot" | "object"; id: string }, dx: number, dy: number, dz: number, commit: boolean) => {
    const current = roomsRef.current.find((item) => item.id === room?.id); if (!current) return;
    const next = getMovedRoom(current, selection, dx, dy, dz, commit);
    setRooms((items) => items.map((item) => item.id === next.id ? next : item)); roomsRef.current = roomsRef.current.map((item) => item.id === next.id ? next : item);
    if (commit) void persistRooms(roomsRef.current);
  }, [persistRooms, room?.id]);

  const moveBy = (dx: number, dy: number, dz: number, label: string) => { if (selected) { moveSelection(selected, dx, dy, dz, true); setNotice(`${label} 5 cm.`); } };

  const snapSelected = () => {
    if (!room || !selected) return;
    updateRoom((current) => {
      const members = getMovementMembers(current, selected); const ids = new Set(members.map((item) => `${item.type}:${item.id}`));
      return { ...current, slots: current.slots.map((slot) => ids.has(`slot:${slot.id}`) ? { ...slot, x: snap(slot.x), y: snap(slot.y), z: snap(slot.z) } : slot), objects: (current.objects ?? []).map((object) => ids.has(`object:${object.id}`) ? { ...object, x: snap(object.x), y: snap(object.y), z: snap(object.z) } : object) };
    }, "Snapped to 5 cm grid.");
  };

  const snapToWall = () => {
    if (!room || !selected) return;
    updateRoom((current) => {
      const nearestWall = (x: number, y: number, width: number, depth: number, rotation: number) => {
        const quarterTurn = Math.round((((rotation % 360) + 360) % 360) / 90) % 2;
        const w = quarterTurn ? depth : width; const d = quarterTurn ? width : depth;
        return [
          { distance: x, x: 0, y },
          { distance: Math.max(0, (current.width ?? 0) - x - w), x: Math.max(0, (current.width ?? 0) - w), y },
          { distance: y, x, y: 0 },
          { distance: Math.max(0, (current.depth ?? 0) - y - d), x, y: Math.max(0, (current.depth ?? 0) - d) },
        ].sort((a, b) => a.distance - b.distance)[0];
      };
      if (selected.type === "slot") return { ...current, slots: current.slots.map((slot) => { if (slot.id !== selected.id) return slot; const p = nearestWall(slot.x, slot.y, vivWidth(slot), vivDepth(slot), slotRotation(slot)); return { ...slot, x: snap(p.x), y: snap(p.y) }; }) };
      return { ...current, objects: (current.objects ?? []).map((object) => { if (object.id !== selected.id) return object; const p = nearestWall(object.x, object.y, object.width, object.depth, object.rotation); return { ...object, x: snap(p.x), y: snap(p.y) }; }) };
    }, "Snapped to nearest wall.");
  };

  const stackSnapSelected = () => {
    if (!room || !selectedSlot) { setNotice("Select a vivarium to use Stack snap."); return; }
    const shelves = objects.filter((object) => object.kind === "shelving" || object.kind === "rack");
    if (!shelves.length) { setNotice("Add a Shelving or Reptile Rack asset first."); return; }
    const options = shelves.flatMap((shelf) => [0.08, 0.31, 0.54, 0.77, 0.96].map((ratio) => {
      const level = shelf.z + shelf.height * ratio;
      if (level + vivHeight(selectedSlot) > (room.height ?? 0) + 0.01) return null;
      const x = clamp(snap(shelf.x + (shelf.width - vivWidth(selectedSlot)) / 2), 0, Math.max(0, (room.width ?? 0) - vivWidth(selectedSlot)));
      const y = clamp(snap(shelf.y + (shelf.depth - vivDepth(selectedSlot)) / 2), 0, Math.max(0, (room.depth ?? 0) - vivDepth(selectedSlot)));
      return { shelf, level, x, y, distance: Math.hypot(x - selectedSlot.x, y - selectedSlot.y) + Math.abs(level - selectedSlot.z) };
    })).filter((item): item is { shelf: ReptileRoomObject; level: number; x: number; y: number; distance: number } => item !== null).sort((a, b) => a.distance - b.distance);
    const best = options[0];
    if (!best) { setNotice("No shelf level has enough vertical clearance for this vivarium."); return; }
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? ({ ...slot, x: best.x, y: best.y, z: best.level, parentAssetId: best.shelf.id, parentSlotId: null } as SlotTransform) : slot) }), `Vivarium snapped to ${best.shelf.label}.`);
  };

  const magnetLockSelected = () => {
    if (!room || !selectedSlot) { setNotice("Select a vivarium to use Vivarium magnet lock."); return; }
    const candidates = slots.filter((slot) => slot.id !== selectedSlot.id);
    if (!candidates.length) { setNotice("Add another vivarium before using magnet lock."); return; }
    const nearest = candidates.reduce((best, slot) => Math.hypot(slot.x - selectedSlot.x, slot.y - selectedSlot.y) + Math.abs(slot.z - selectedSlot.z) * 0.5 < Math.hypot(best.x - selectedSlot.x, best.y - selectedSlot.y) + Math.abs(best.z - selectedSlot.z) * 0.5 ? slot : best, candidates[0]);
    const groupIds = new Set([selectedSlot.stackGroupId, nearest.stackGroupId].filter((id): id is string => Boolean(id)));
    const groupId = groupIds.values().next().value ?? nextId("mag");
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => groupIds.has(slot.stackGroupId ?? "") || slot.id === selectedSlot.id || slot.id === nearest.id ? { ...slot, stackGroupId: groupId } : slot) }), `${selectedSlot.label} magnet-locked to ${nearest.label}.`);
  };

  const unlockMagnet = () => {
    if (!selectedSlot) return;
    const group = selectedSlot.stackGroupId;
    if (!group) { setNotice("This vivarium is not magnet-locked."); return; }
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.stackGroupId === group ? { ...slot, stackGroupId: null, stackIndex: 0 } : slot) }), "Vivarium magnet lock released.");
  };

  const unstackSelected = () => {
    if (!selectedSlot || !slotParentAssetId(selectedSlot)) { setNotice("This vivarium is not attached to shelving."); return; }
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? ({ ...slot, parentAssetId: null, stackIndex: 0 } as SlotTransform) : slot) }), "Vivarium removed from shelving lock.");
  };

  const deleteSelected = () => {
    if (!room || !selected) return;
    const label = selected.type === "slot" ? selectedSlot?.label : selectedObject?.label; if (!label || !window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    if (selected.type === "slot") { const group = selectedSlot?.stackGroupId; updateRoom((current) => ({ ...current, slots: current.slots.filter((slot) => group ? slot.stackGroupId !== group : slot.id !== selected.id) }), group ? "Mag-locked vivarium group deleted." : "Vivarium deleted."); }
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).filter((object) => object.id !== selected.id), slots: current.slots.map((slot) => slotParentAssetId(slot) === selected.id ? ({ ...slot, parentAssetId: null } as SlotTransform) : slot) }), "Room asset deleted.");
    setSelected(null);
  };

  const duplicateSelected = () => {
    if (!room || !selected) return;
    if (selected.type === "slot" && selectedSlot) { const copy = { ...selectedSlot, id: nextId("viv"), label: `${selectedSlot.label} Copy`, x: clamp(selectedSlot.x + 10, 0, Math.max(0, (room.width ?? 0) - vivWidth(selectedSlot))), stackGroupId: null, stackIndex: 0, parentAssetId: null } as SlotTransform; updateRoom((current) => ({ ...current, slots: [...current.slots, copy] }), "Vivarium duplicated."); setSelected({ type: "slot", id: copy.id }); }
    else if (selectedObject) { const copy = { ...selectedObject, id: nextId(selectedObject.kind), label: `${selectedObject.label} Copy`, x: clamp(selectedObject.x + 10, 0, Math.max(0, (room.width ?? 0) - selectedObject.width)), stackGroupId: null, stackIndex: 0, parentAssetId: null }; updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), copy] }), "Asset duplicated."); setSelected({ type: "object", id: copy.id }); }
  };

  const updateSelectedDimensions = (field: "width" | "depth" | "height", value: number) => {
    const nextValue = Math.max(1, Number.isFinite(value) ? value : 1); if (!selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? field === "width" ? { ...slot, w: nextValue } : field === "depth" ? { ...slot, depth: nextValue, h: nextValue } : { ...slot, height: nextValue } : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, [field]: nextValue } : object) }));
  };

  const updateSelectedPosition = (field: "x" | "y" | "z", value: number) => {
    const nextValue = Math.max(0, Number.isFinite(value) ? value : 0); if (!selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, [field]: nextValue } : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, [field]: nextValue } : object) }));
  };

  const updateSelectedRotation = (delta: number) => {
    if (!selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? ({ ...slot, rotation: (slotRotation(slot) + delta + 360) % 360 } as SlotTransform) : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, rotation: (object.rotation + delta + 360) % 360 } : object) }));
  };

  const resetSelectedRotation = () => {
    if (!selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? ({ ...slot, rotation: 0 } as SlotTransform) : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, rotation: 0 } : object) }));
  };

  const applyTransformPatch = useCallback((selection: { type: "slot" | "object"; id: string }, patch: Room3DTransformPatch) => {
    updateRoom((current) => {
      if (selection.type === "slot") return { ...current, slots: current.slots.map((slot) => slot.id === selection.id ? ({ ...slot, ...patch } as SlotTransform) : slot) };
      return { ...current, objects: (current.objects ?? []).map((object) => object.id === selection.id ? { ...object, ...patch } : object) };
    });
  }, [updateRoom]);

  const uploadPhoto = async (file: File) => {
    if (!user || !room || !selectedSlot) return;
    setPhotoBusy(true); const previewUrl = URL.createObjectURL(file);
    try {
      const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file);
      setPhotoPreviewUrls((current) => { const previous = current[selectedSlot.id]; if (previous) URL.revokeObjectURL(previous); return { ...current, [selectedSlot.id]: previewUrl }; });
      await persistRooms(roomsRef.current.map((item) => item.id === room.id ? { ...item, slots: item.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) } : item), "Vivarium face image selected.");
    } catch (error) { URL.revokeObjectURL(previewUrl); setNotice(error instanceof Error ? error.message : "Vivarium photo upload failed."); }
    finally { setPhotoBusy(false); }
  };

  const removePhoto = () => {
    if (!selectedSlot) return;
    const preview = photoPreviewUrls[selectedSlot.id]; if (preview) URL.revokeObjectURL(preview);
    setPhotoPreviewUrls((current) => { const next = { ...current }; delete next[selectedSlot.id]; return next; });
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: "" } : slot) }), "Vivarium face image removed.");
  };

  const useSnakePhoto = () => {
    if (!selectedSlot) return;
    const url = snakeMap.get(selectedSlot.snakeId ?? "")?.enclosure?.roomPhoto?.url;
    if (!url) { setNotice("This snake does not have an enclosure photo yet."); return; }
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) }), "Snake enclosure photo applied to vivarium glass.");
  };

  const photoFor = useCallback((slot: ReptileRoomSlot) => photoPreviewUrls[slot.id] || slot.photoUrl || undefined, [photoPreviewUrls]);
  const assignSnake = (snakeId: string) => { if (!selectedSlot) return; const snake = snakeMap.get(snakeId); updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, snakeId: snakeId || null, label: snake ? `${snakeName(snake)}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snakeId ? "active" : "empty", availability: snakeId ? "occupied" : "available" } : slot) }), snake ? `${snakeName(snake)} assigned.` : "Vivarium cleared."); };

  if (loading || profileLoading) return <div className="rr3d-loading">Loading your reptile room…</div>;
  if (!user) return <div className="rr3d-loading">Please sign in to use the Reptile Room.</div>;
  if (!room) return <div className="rr3d-loading"><h2>No reptile room yet</h2><p>Create one in the existing Reptile Room builder first.</p></div>;

  const selectedDimensions = selectedSlot ? { width: vivWidth(selectedSlot), depth: vivDepth(selectedSlot), height: vivHeight(selectedSlot), x: selectedSlot.x, y: selectedSlot.y, z: selectedSlot.z } : selectedObject ? { width: selectedObject.width, depth: selectedObject.depth, height: selectedObject.height, x: selectedObject.x, y: selectedObject.y, z: selectedObject.z } : null;
  const selectedPhoto = selectedSlot ? photoFor(selectedSlot) : undefined;
  const selectedRotation = selectedSlot ? slotRotation(selectedSlot) : selectedObject?.rotation ?? 0;
  const movementButton = (label: string, dx: number, dy: number, dz: number, icon: string) => <button type="button" title={`${label} 5 cm`} aria-label={`${label} 5 cm`} onClick={() => moveBy(dx, dy, dz, label)}><span>{icon}</span><small>{label}</small></button>;

  return <main className="rr3d-workspace">
    <header className="rr3d-workspace-header"><div><span className="rr3d-kicker">🏠 TINY TITANS · 3D DIGITAL TWIN</span><h1>{room.name}</h1><p>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm · {slots.length} vivariums · {objects.length} room assets</p></div><div className="rr3d-status">{saving ? "Saving…" : "✓ Saved"}</div></header>
    {notice && <div className="rr3d-notice">{notice}</div>}
    <div className="rr3d-layout">
      <aside className="rr3d-sidebar">
        <section><h2>Room Assets</h2><div className="rr3d-asset-grid">{ASSETS.map((preset) => <button key={preset.label} type="button" className="rr3d-asset-button" onClick={() => addAsset(preset)}><b>{preset.icon}</b><span>{preset.label}</span><small>{preset.width} × {preset.depth} × {preset.height} cm</small></button>)}</div></section>
        {selectedDimensions && <section className="rr3d-selected-editor"><div className="rr3d-editor-heading"><div><span className="rr3d-kicker">SELECTED {selectedSlot ? "VIVARIUM" : "ASSET"}</span><h2>{selectedSlot?.label ?? selectedObject?.label}</h2></div><button type="button" className="rr3d-delete-button" onClick={deleteSelected}>🗑 Delete</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>{movementButton("Up", 0, 0, 5, "↑")}{movementButton("Down", 0, 0, -5, "↓")}{movementButton("Left", -5, 0, 0, "←")}{movementButton("Right", 5, 0, 0, "→")}{movementButton("Forward", 0, -5, 0, "↟")}{movementButton("Backward", 0, 5, 0, "↡")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 12 }}><button type="button" onClick={snapToWall}>🧲 Snap to wall</button><button type="button" onClick={snapSelected}>⌖ Snap 5 cm</button>{selectedSlot && <button type="button" onClick={stackSnapSelected}>▤ Stack snap</button>}{selectedSlot && <button type="button" onClick={magnetLockSelected}>🧲 Vivarium magnet lock</button>}{selectedSlot?.stackGroupId && <button type="button" onClick={unlockMagnet}>🔓 Unlock magnet</button>}{slotParentAssetId(selectedSlot) && <button type="button" onClick={unstackSelected}>↥ Unstack from shelving</button>}</div>
          <div className="rr3d-editor-grid"><label>Width (cm)<input type="number" min="1" value={selectedDimensions.width} onChange={(e) => updateSelectedDimensions("width", Number(e.target.value))} /></label><label>Depth (cm)<input type="number" min="1" value={selectedDimensions.depth} onChange={(e) => updateSelectedDimensions("depth", Number(e.target.value))} /></label><label>Height (cm)<input type="number" min="1" value={selectedDimensions.height} onChange={(e) => updateSelectedDimensions("height", Number(e.target.value))} /></label><label>X (cm)<input type="number" value={Math.round(selectedDimensions.x)} onChange={(e) => updateSelectedPosition("x", Number(e.target.value))} /></label><label>Y (cm)<input type="number" value={Math.round(selectedDimensions.y)} onChange={(e) => updateSelectedPosition("y", Number(e.target.value))} /></label><label>Z (cm)<input type="number" value={Math.round(selectedDimensions.z)} onChange={(e) => updateSelectedPosition("z", Number(e.target.value))} /></label></div>
          <div className="rr3d-rotation-editor"><span>Rotation</span><button type="button" onClick={() => updateSelectedRotation(-15)} aria-label="Rotate left 15 degrees">↶</button><strong>{Math.round(selectedRotation)}°</strong><button type="button" onClick={() => updateSelectedRotation(15)} aria-label="Rotate right 15 degrees">↷</button><button type="button" onClick={resetSelectedRotation}>Reset</button></div>
          <div className="rr3d-action-row"><button type="button" onClick={duplicateSelected}>Duplicate</button></div>
          {selectedSlot && <div className="rr3d-vivarium-photo-editor"><h3>Vivarium Face Image</h3><p>The photograph is rendered on the clear front glass; it never replaces the vivarium.</p>{selectedPhoto && <img className="rr3d-photo-preview" src={selectedPhoto} alt="Selected vivarium face" />}<div className="rr3d-action-row"><button type="button" onClick={useSnakePhoto}>Use snake's enclosure photo</button><label className="rr3d-upload-button">{photoBusy ? "Uploading…" : "Choose photo"}<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); event.currentTarget.value = ""; }} /></label>{selectedPhoto && <button type="button" onClick={removePhoto}>Remove photo</button>}</div>{!selectedPhoto && <span className="rr3d-muted">No face image selected.</span>}</div>}
          {selectedSlot && <label>Occupant<select value={selectedSlot.snakeId ?? ""} onChange={(e) => assignSnake(e.target.value)}><option value="">Empty vivarium</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snakeName(snake)}</option>)}</select></label>}
        </section>}
        <section><h2>View</h2><div className="rr3d-action-row"><button type="button" onClick={() => setShowGrid((v) => !v)}>{showGrid ? "Hide grid" : "Show grid"}</button><button type="button" onClick={() => setShowCeiling((v) => !v)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div></section>
      </aside>
      <section className="rr3d-canvas-panel"><Room3D room={room} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} showGrid={showGrid} showCeiling={showCeiling} photoForSlot={photoFor} onSelect={setSelected} onMove={moveSelection} onTransformChange={applyTransformPatch} /><div className="rr3d-canvas-help">Select an object to edit it · Up/Down changes height · Left/Right moves across the room · Forward/Backward moves depth · Stack snap attaches a vivarium to shelving · Vivarium magnet lock keeps linked vivariums together</div></section>
    </div>
  </main>;
}
