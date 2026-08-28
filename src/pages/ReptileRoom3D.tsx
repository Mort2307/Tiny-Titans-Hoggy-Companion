import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import type { Snake } from "../types/Snake";
import type { Room3DAssetPreset, Room3DSelection } from "../types/reptileRoom3D";
import Room3D from "../components/reptile-room-3d/Room3D";
import { RoomAssetPalette } from "../components/reptile-room-3d/RoomAssetPalette";
import { RoomItemEditor } from "../components/reptile-room-3d/RoomItemEditor";
import "../styles/reptile-room-3d-workspace.css";
import "../styles/reptile-room-editor.css";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snap = (v: number, grid = 5) => Math.round(v / grid) * grid;
const nextId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const vivWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const vivDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.depth ?? slot.h);
const vivHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 40);

function getMovedRoom(room: ReptileRoomWorkspace, selection: Room3DSelection, dx: number, dy: number, dz: number, commit: boolean): ReptileRoomWorkspace {
  if (!selection) return room;
  const moveSlot = (slot: ReptileRoomSlot, mx: number, my: number, mz: number): ReptileRoomSlot => ({ ...slot, x: clamp(slot.x + mx, 0, Math.max(0, (room.width ?? 0) - vivWidth(slot))), y: clamp(slot.y + my, 0, Math.max(0, (room.depth ?? 0) - vivDepth(slot))), z: clamp((slot.z ?? 0) + mz, 0, Math.max(0, (room.height ?? 0) - vivHeight(slot))) });
  const moveObject = (object: ReptileRoomObject, mx: number, my: number, mz: number): ReptileRoomObject => ({ ...object, x: clamp(object.x + mx, 0, Math.max(0, (room.width ?? 0) - object.width)), y: clamp(object.y + my, 0, Math.max(0, (room.depth ?? 0) - object.depth)), z: clamp((object.z ?? 0) + mz, 0, Math.max(0, (room.height ?? 0) - object.height)) });
  if (selection.type === "slot") {
    const selected = room.slots.find((slot) => slot.id === selection.id); if (!selected) return room;
    const groupId = selected.stackGroupId;
    return { ...room, slots: room.slots.map((slot) => groupId && slot.stackGroupId === groupId ? moveSlot(slot, dx, dy, dz) : slot.id === selected.id ? moveSlot(slot, dx, dy, dz) : slot), updatedAt: commit ? new Date().toISOString() : room.updatedAt };
  }
  const selected = (room.objects ?? []).find((object) => object.id === selection.id); if (!selected) return room;
  const groupId = selected.stackGroupId;
  return { ...room, objects: (room.objects ?? []).map((object) => groupId && object.stackGroupId === groupId ? moveObject(object, dx, dy, dz) : object.id === selected.id ? moveObject(object, dx, dy, dz) : object), updatedAt: commit ? new Date().toISOString() : room.updatedAt };
}

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
  const roomsRef = useRef(rooms);
  useEffect(() => { roomsRef.current = rooms; }, [rooms]);
  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedSlot = selected?.type === "slot" ? slots.find((slot) => slot.id === selected.id) ?? null : null;
  const selectedObject = selected?.type === "object" ? objects.find((object) => object.id === selected.id) ?? null : null;

  const persistRooms = useCallback(async (nextRooms: ReptileRoomWorkspace[], message?: string) => {
    const stamped = nextRooms.map((item) => ({ ...item, roomVersion: Math.max(4, item.roomVersion ?? 4), updatedAt: new Date().toISOString() }));
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

  const deleteSelected = useCallback(() => {
    if (!room || !selected) return;
    const label = selected.type === "slot" ? selectedSlot?.label : selectedObject?.label;
    if (!label || !window.confirm(`Delete ${label}?\n\nThis removes it from the 3D room. This cannot be undone.`)) return;
    if (selected.type === "slot") {
      const groupId = selectedSlot?.stackGroupId;
      const ids = new Set(room.slots.filter((slot) => groupId ? slot.stackGroupId === groupId : slot.id === selected.id).map((slot) => slot.id));
      updateRoom((current) => ({ ...current, slots: current.slots.filter((slot) => !ids.has(slot.id)) }), groupId ? "Mag-locked vivarium group deleted." : "Vivarium deleted.");
    } else {
      updateRoom((current) => ({ ...current, objects: (current.objects ?? []).filter((object) => object.id !== selected.id) }), "Room asset deleted.");
    }
    setSelected(null);
  }, [room, selected, selectedSlot, selectedObject, updateRoom]);

  const duplicateSelected = useCallback(() => {
    if (!room || !selected) return;
    if (selected.type === "slot" && selectedSlot) {
      const copy: ReptileRoomSlot = { ...selectedSlot, id: nextId("viv"), label: `${selectedSlot.label} Copy`, x: clamp(selectedSlot.x + 10, 0, Math.max(0, (room.width ?? 0) - vivWidth(selectedSlot))), y: clamp(selectedSlot.y + 10, 0, Math.max(0, (room.depth ?? 0) - vivDepth(selectedSlot))), stackGroupId: null, stackIndex: 0 };
      updateRoom((current) => ({ ...current, slots: [...current.slots, copy] }), "Vivarium duplicated."); setSelected({ type: "slot", id: copy.id });
    } else if (selectedObject) {
      const copy: ReptileRoomObject = { ...selectedObject, id: nextId(selectedObject.kind), label: `${selectedObject.label} Copy`, x: clamp(selectedObject.x + 10, 0, Math.max(0, (room.width ?? 0) - selectedObject.width)), y: clamp(selectedObject.y + 10, 0, Math.max(0, (room.depth ?? 0) - selectedObject.depth)), stackGroupId: null, stackIndex: 0 };
      updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), copy] }), "Room asset duplicated."); setSelected({ type: "object", id: copy.id });
    }
  }, [room, selected, selectedSlot, selectedObject, updateRoom]);

  const addAsset = useCallback((preset: Room3DAssetPreset, spawnXcm?: number, spawnYcm?: number) => {
    if (!room) return;
    const width = room.width ?? 0, depth = room.depth ?? 0;
    const x = clamp(snap(spawnXcm ?? (width - preset.width) / 2), 0, Math.max(0, width - preset.width));
    const y = clamp(snap(spawnYcm ?? (depth - preset.depth) / 2), 0, Math.max(0, depth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot: ReptileRoomSlot = { id: nextId("viv"), snakeId: null, label: "Empty Vivarium", x, y, z: 0, w: preset.width, h: preset.depth, depth: preset.depth, height: preset.height, lifecycleStatus: "empty", condition: "good", availability: "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null, photoUrl: "" };
      updateRoom((current) => ({ ...current, slots: [...current.slots, slot] }), "Vivarium added."); setSelected({ type: "slot", id: slot.id }); return;
    }
    const object: ReptileRoomObject = { id: nextId(preset.kind), kind: preset.kind, label: preset.label, x, y, z: 0, width: preset.width, depth: preset.depth, height: preset.height, rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null, clearance: {}, notes: "", assetType: "furniture" };
    updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), object] }), `${preset.label} added.`); setSelected({ type: "object", id: object.id });
  }, [room, updateRoom]);

  const updateSelectedItem = useCallback((patch: Partial<ReptileRoomObject> | Partial<ReptileRoomSlot>) => {
    if (!room || !selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, ...(patch as Partial<ReptileRoomSlot>) } : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, ...(patch as Partial<ReptileRoomObject>) } : object) }));
  }, [room, selected, updateRoom]);

  const moveSelection = useCallback((selection: { type: "slot" | "object"; id: string }, dx: number, dy: number, dz: number, commit: boolean) => {
    const current = roomsRef.current.find((item) => item.id === room?.id); if (!current) return;
    const next = getMovedRoom(current, selection, dx, dy, dz, commit);
    setRooms((items) => items.map((item) => item.id === next.id ? next : item)); roomsRef.current = roomsRef.current.map((item) => item.id === next.id ? next : item);
    if (commit) void persistRooms(roomsRef.current);
  }, [persistRooms, room?.id]);

  const nudge = useCallback((dx: number, dy: number) => {
    if (!selected) return;
    moveSelection(selected, dx, dy, 0, true);
  }, [selected, moveSelection]);

  const toggleMagLock = () => {
    if (!room || !selectedSlot) return;
    const target = selectedSlot;
    if (target.stackGroupId) { updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.stackGroupId === target.stackGroupId ? { ...slot, stackGroupId: null, stackIndex: 0 } : slot) }), "Mag-lock released."); return; }
    const nearby = room.slots.filter((slot) => slot.id !== target.id).map((slot) => ({ slot, distance: Math.hypot(slot.x - target.x, slot.y - target.y) })).sort((a, b) => a.distance - b.distance)[0];
    const groupId = nearby && nearby.distance <= 12 ? (nearby.slot.stackGroupId ?? nextId("mag")) : nextId("mag");
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === target.id || slot.id === nearby?.slot.id || slot.stackGroupId === groupId ? { ...slot, stackGroupId: groupId } : slot) }), nearby && nearby.distance <= 12 ? "Vivariums magnetically locked together." : "Vivarium mag-lock enabled.");
  };

  const snapSelected = () => {
    if (!room || !selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, x: snap(slot.x), y: snap(slot.y), z: snap(slot.z ?? 0) } : slot) }), "Snapped to 5 cm grid.");
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, x: snap(object.x), y: snap(object.y), z: snap(object.z ?? 0) } : object) }), "Snapped to 5 cm grid.");
  };

  const uploadPhoto = async (file: File) => {
    if (!user || !room || !selectedSlot) return;
    setPhotoBusy(true);
    try {
      const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file);
      await persistRooms(roomsRef.current.map((item) => item.id === room.id ? { ...item, slots: item.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) } : item), "Vivarium image selected.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Photo upload failed."); } finally { setPhotoBusy(false); }
  };

  const photoFor = useCallback((slot: ReptileRoomSlot) => slot.photoUrl || snakeMap.get(slot.snakeId ?? "")?.enclosure?.roomPhoto?.url, [snakeMap]);

  if (loading || profileLoading) return <div className="rr3d-loading">Loading reptile room…</div>;
  if (!user) return <div className="rr3d-loading">Please sign in to use the Reptile Room.</div>;
  if (!room) return <div className="rr3d-loading">No reptile room found.</div>;

  const selectedItem = selectedSlot ?? selectedObject;
  const selectedPhoto = selectedSlot ? photoFor(selectedSlot) : undefined;
  return <main className="rr3d-workspace">
    <div className="rr3d-topbar"><div><span className="rr3d-kicker">TINY TITANS</span><h1>Reptile Room</h1><p>{room.name}</p></div><div className="rr3d-actions"><button type="button" onClick={() => void persistRooms(roomsRef.current, "Room saved.")}>Save Room</button><button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide Grid" : "Show Grid"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide Ceiling" : "Show Ceiling"}</button></div></div>
    <div className="rr3d-canvas-wrap"><Room3D room={room} showGrid={showGrid} showCeiling={showCeiling} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} photoForSlot={photoFor} onSelect={setSelected} onMove={moveSelection} /><RoomAssetPalette onSpawn={addAsset} /></div>
    {selectedItem && <RoomItemEditor item={selectedItem} isSlot={Boolean(selectedSlot)} snakes={snakes} photoUrl={selectedPhoto} photoBusy={photoBusy} onChange={updateSelectedItem} onDelete={deleteSelected} onDuplicate={duplicateSelected} onUploadPhoto={uploadPhoto} onMagLock={selectedSlot ? toggleMagLock : undefined} />}
    {selected && <div className="rr3d-selection-actions"><button type="button" onClick={() => nudge(-5, 0)}>←</button><button type="button" onClick={() => nudge(5, 0)}>→</button><button type="button" onClick={() => nudge(0, -5)}>↑</button><button type="button" onClick={() => nudge(0, 5)}>↓</button><button type="button" onClick={snapSelected}>Snap 5cm</button></div>}
    {notice && <div className="rr3d-notice">{notice}</div>}
    {saving && <div className="rr3d-saving">Saving…</div>}
  </main>;
}
