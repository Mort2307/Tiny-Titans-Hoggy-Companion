import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import type { Snake } from "../types/Snake";
import type { Room3DAssetPreset, Room3DSelection } from "../types/reptileRoom3D";
import Room3D from "../components/reptile-room-3d/Room3D";
import "../styles/reptile-room-3d-workspace.css";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snap = (v: number, grid = 5) => Math.round(v / grid) * grid;
const nextId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const snakeName = (snake: Snake | undefined) => snake?.name ?? "Unnamed Hoggy";
const vivWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const vivDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.depth ?? slot.h);
const vivHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 45);

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

function getMovedRoom(room: ReptileRoomWorkspace, selection: Room3DSelection, dx: number, dy: number, dz: number, commit: boolean): ReptileRoomWorkspace {
  if (!selection) return room;
  const moveSlot = (slot: ReptileRoomSlot): ReptileRoomSlot => ({ ...slot, x: clamp(slot.x + dx, 0, Math.max(0, (room.width ?? 0) - vivWidth(slot))), y: clamp(slot.y + dy, 0, Math.max(0, (room.depth ?? 0) - vivDepth(slot))), z: clamp(slot.z + dz, 0, Math.max(0, (room.height ?? 0) - vivHeight(slot))) });
  const moveObject = (object: ReptileRoomObject): ReptileRoomObject => ({ ...object, x: clamp(object.x + dx, 0, Math.max(0, (room.width ?? 0) - object.width)), y: clamp(object.y + dy, 0, Math.max(0, (room.depth ?? 0) - object.depth)), z: clamp(object.z + dz, 0, Math.max(0, (room.height ?? 0) - object.height)) });
  if (selection.type === "slot") {
    const selected = room.slots.find((slot) => slot.id === selection.id); if (!selected) return room;
    const groupId = selected.stackGroupId;
    return { ...room, slots: room.slots.map((slot) => (groupId && slot.stackGroupId === groupId) || slot.id === selected.id ? moveSlot(slot) : slot), updatedAt: commit ? new Date().toISOString() : room.updatedAt };
  }
  const selected = (room.objects ?? []).find((object) => object.id === selection.id); if (!selected) return room;
  const groupId = selected.stackGroupId;
  return { ...room, objects: (room.objects ?? []).map((object) => (groupId && object.stackGroupId === groupId) || object.id === selected.id ? moveObject(object) : object), updatedAt: commit ? new Date().toISOString() : room.updatedAt };
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
    const roomWidth = room.width ?? 0;
    const roomDepth = room.depth ?? 0;
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
    const next = getMovedRoom(current, selection, dx, dy, dz, commit); setRooms((items) => items.map((item) => item.id === next.id ? next : item)); roomsRef.current = roomsRef.current.map((item) => item.id === next.id ? next : item); if (commit) void persistRooms(roomsRef.current);
  }, [persistRooms, room?.id]);

  const nudge = (dx: number, dy: number) => { if (selected) moveSelection(selected, dx, dy, 0, true); };
  const snapSelected = () => {
    if (!room || !selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, x: snap(slot.x), y: snap(slot.y), z: snap(slot.z) } : slot) }), "Snapped to 5 cm grid.");
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, x: snap(object.x), y: snap(object.y), z: snap(object.z) } : object) }), "Snapped to 5 cm grid.");
  };

  const deleteSelected = () => {
    if (!room || !selected) return;
    const label = selected.type === "slot" ? selectedSlot?.label : selectedObject?.label; if (!label || !window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    if (selected.type === "slot") { const group = selectedSlot?.stackGroupId; updateRoom((current) => ({ ...current, slots: current.slots.filter((slot) => group ? slot.stackGroupId !== group : slot.id !== selected.id) }), group ? "Mag-locked vivarium group deleted." : "Vivarium deleted."); }
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).filter((object) => object.id !== selected.id) }), "Room asset deleted.");
    setSelected(null);
  };

  const duplicateSelected = () => {
    if (!room || !selected) return;
    if (selected.type === "slot" && selectedSlot) { const copy = { ...selectedSlot, id: nextId("viv"), label: `${selectedSlot.label} Copy`, x: clamp(selectedSlot.x + 10, 0, Math.max(0, (room.width ?? 0) - vivWidth(selectedSlot))), stackGroupId: null, stackIndex: 0 }; updateRoom((current) => ({ ...current, slots: [...current.slots, copy] }), "Vivarium duplicated."); setSelected({ type: "slot", id: copy.id }); }
    else if (selectedObject) { const copy = { ...selectedObject, id: nextId(selectedObject.kind), label: `${selectedObject.label} Copy`, x: clamp(selectedObject.x + 10, 0, Math.max(0, (room.width ?? 0) - selectedObject.width)), stackGroupId: null, stackIndex: 0 }; updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), copy] }), "Asset duplicated."); setSelected({ type: "object", id: copy.id }); }
  };

  const updateSelectedDimensions = (field: "width" | "depth" | "height", value: number) => {
    const nextValue = Math.max(1, value); if (!selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? field === "width" ? { ...slot, w: nextValue } : field === "depth" ? { ...slot, depth: nextValue, h: nextValue } : { ...slot, height: nextValue } : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, [field]: nextValue } : object) }));
  };
  const updateSelectedPosition = (field: "x" | "y" | "z", value: number) => {
    if (!selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, [field]: Math.max(0, value) } : slot) }));
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, [field]: Math.max(0, value) } : object) }));
  };

  const uploadPhoto = async (file: File) => {
    if (!user || !room || !selectedSlot) return;
    setPhotoBusy(true);
    try { const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file); await persistRooms(roomsRef.current.map((item) => item.id === room.id ? { ...item, slots: item.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) } : item), "Vivarium face image selected."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Vivarium photo upload failed."); }
    finally { setPhotoBusy(false); }
  };

  const useSnakePhoto = () => {
    if (!selectedSlot) return;
    const url = snakeMap.get(selectedSlot.snakeId ?? "")?.enclosure?.roomPhoto?.url;
    if (!url) { setNotice("This snake does not have an enclosure photo yet."); return; }
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) }), "Snake enclosure photo applied to vivarium glass.");
  };

  const photoFor = useCallback((slot: ReptileRoomSlot) => slot.photoUrl || snakeMap.get(slot.snakeId ?? "")?.enclosure?.roomPhoto?.url, [snakeMap]);
  const assignSnake = (snakeId: string) => { if (!selectedSlot) return; const snake = snakeMap.get(snakeId); updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, snakeId: snakeId || null, label: snake ? `${snakeName(snake)}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snakeId ? "active" : "empty", availability: snakeId ? "occupied" : "available" } : slot) }), snake ? `${snakeName(snake)} assigned.` : "Vivarium cleared."); };

  if (loading || profileLoading) return <div className="rr3d-loading">Loading your reptile room…</div>;
  if (!user) return <div className="rr3d-loading">Please sign in to use the Reptile Room.</div>;
  if (!room) return <div className="rr3d-loading"><h2>No reptile room yet</h2><p>Create one in the existing Reptile Room builder first.</p></div>;

  const selectedDimensions = selectedSlot ? { width: vivWidth(selectedSlot), depth: vivDepth(selectedSlot), height: vivHeight(selectedSlot), x: selectedSlot.x, y: selectedSlot.y, z: selectedSlot.z } : selectedObject ? { width: selectedObject.width, depth: selectedObject.depth, height: selectedObject.height, x: selectedObject.x, y: selectedObject.y, z: selectedObject.z } : null;
  const selectedPhoto = selectedSlot ? photoFor(selectedSlot) : undefined;

  return <main className="rr3d-workspace">
    <header className="rr3d-workspace-header"><div><span className="rr3d-kicker">🏠 TINY TITANS · 3D DIGITAL TWIN</span><h1>{room.name}</h1><p>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm · {slots.length} vivariums · {objects.length} room assets</p></div><div className="rr3d-status">{saving ? "Saving…" : "✓ Saved"}</div></header>
    {notice && <div className="rr3d-notice">{notice}</div>}
    <div className="rr3d-layout">
      <aside className="rr3d-sidebar">
        <section><h2>Room Assets</h2><div className="rr3d-asset-grid">{ASSETS.map((preset) => <button key={preset.label} type="button" className="rr3d-asset-button" onClick={() => addAsset(preset)}><b>{preset.icon}</b><span>{preset.label}</span><small>{preset.width} × {preset.depth} × {preset.height} cm</small></button>)}</div></section>
        <section><h2>Placement</h2><div className="rr3d-nudge-grid"><button onClick={() => nudge(-5, -5)}>↖</button><button onClick={() => nudge(0, -5)}>↑</button><button onClick={() => nudge(5, -5)}>↗</button><button onClick={() => nudge(-5, 0)}>←</button><button onClick={snapSelected}>⌖</button><button onClick={() => nudge(5, 0)}>→</button><button onClick={() => nudge(-5, 5)}>↙</button><button onClick={() => nudge(0, 5)}>↓</button><button onClick={() => nudge(5, 5)}>↘</button></div><div className="rr3d-action-row"><button onClick={snapSelected}>Snap 5 cm</button></div></section>
        {selectedDimensions && <section className="rr3d-selected-editor"><div className="rr3d-editor-heading"><div><span className="rr3d-kicker">SELECTED {selectedSlot ? "VIVARIUM" : "ASSET"}</span><h2>{selectedSlot?.label ?? selectedObject?.label}</h2></div><button type="button" className="rr3d-delete-button" onClick={deleteSelected}>🗑 Delete</button></div>
          <div className="rr3d-editor-grid"><label>Width (cm)<input type="number" min="1" value={selectedDimensions.width} onChange={(e) => updateSelectedDimensions("width", Number(e.target.value))} /></label><label>Depth (cm)<input type="number" min="1" value={selectedDimensions.depth} onChange={(e) => updateSelectedDimensions("depth", Number(e.target.value))} /></label><label>Height (cm)<input type="number" min="1" value={selectedDimensions.height} onChange={(e) => updateSelectedDimensions("height", Number(e.target.value))} /></label><label>X (cm)<input type="number" value={Math.round(selectedDimensions.x)} onChange={(e) => updateSelectedPosition("x", Number(e.target.value))} /></label><label>Y (cm)<input type="number" value={Math.round(selectedDimensions.y)} onChange={(e) => updateSelectedPosition("y", Number(e.target.value))} /></label><label>Z (cm)<input type="number" value={Math.round(selectedDimensions.z)} onChange={(e) => updateSelectedPosition("z", Number(e.target.value))} /></label></div>
          <div className="rr3d-action-row"><button onClick={duplicateSelected}>Duplicate</button></div>
          {selectedSlot && <div className="rr3d-vivarium-photo-editor"><h3>Vivarium Face Image</h3><p>Choose a photograph to display directly on the front glass.</p>{selectedPhoto && <img className="rr3d-photo-preview" src={selectedPhoto} alt="Selected vivarium face" />}<div className="rr3d-action-row"><button type="button" onClick={useSnakePhoto}>Use snake's enclosure photo</button><label className="rr3d-upload-button">{photoBusy ? "Uploading…" : "Choose photo"}<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); event.currentTarget.value = ""; }} /></label></div>{!selectedPhoto && <span className="rr3d-muted">No face image selected.</span>}</div>}
          {selectedSlot && <label>Occupant<select value={selectedSlot.snakeId ?? ""} onChange={(e) => assignSnake(e.target.value)}><option value="">Empty vivarium</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snakeName(snake)}</option>)}</select></label>}
        </section>}
        <section><h2>View</h2><div className="rr3d-action-row"><button onClick={() => setShowGrid((v) => !v)}>{showGrid ? "Hide grid" : "Show grid"}</button><button onClick={() => setShowCeiling((v) => !v)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div></section>
      </aside>
      <section className="rr3d-canvas-panel"><Room3D room={room} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} showGrid={showGrid} showCeiling={showCeiling} photoForSlot={photoFor} onSelect={setSelected} onMove={moveSelection} onAddAsset={addAsset} /><div className="rr3d-canvas-help">Click an object to edit it · Drag to look around · Use ⛶ Full screen for an immersive view</div></section>
    </div>
  </main>;
}
