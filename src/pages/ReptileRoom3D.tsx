import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import type { Snake } from "../types/Snake";
import type { Room3DAssetPreset, Room3DSelection } from "../types/reptileRoom3D";
import Room3D from "../components/reptile-room-3d/Room3D";
import "../styles/reptile-room-3d-workspace.css";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const snap = (v: number, grid = 5) => Math.round(v / grid) * grid;
const nextId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const vivWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const vivDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.depth ?? slot.h);
const vivHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 40);
const snakeName = (snake: Snake | undefined) => snake?.name ?? "Unnamed Hoggy";

function getMovedRoom(room: ReptileRoomWorkspace, selection: Room3DSelection, dx: number, dy: number, dz: number, commit: boolean): ReptileRoomWorkspace {
  if (!selection) return room;

  const moveSlot = (slot: ReptileRoomSlot, mx: number, my: number, mz: number): ReptileRoomSlot => ({
    ...slot,
    x: clamp(slot.x + mx, 0, Math.max(0, (room.width ?? 0) - vivWidth(slot))),
    y: clamp(slot.y + my, 0, Math.max(0, (room.depth ?? 0) - vivDepth(slot))),
    z: clamp((slot.z ?? 0) + mz, 0, Math.max(0, (room.height ?? 0) - vivHeight(slot))),
  });
  const moveObject = (object: ReptileRoomObject, mx: number, my: number, mz: number): ReptileRoomObject => ({
    ...object,
    x: clamp(object.x + mx, 0, Math.max(0, (room.width ?? 0) - object.width)),
    y: clamp(object.y + my, 0, Math.max(0, (room.depth ?? 0) - object.depth)),
    z: clamp((object.z ?? 0) + mz, 0, Math.max(0, (room.height ?? 0) - object.height)),
  });

  if (selection.type === "slot") {
    const selected = room.slots.find((slot) => slot.id === selection.id);
    if (!selected) return room;
    const groupId = selected.stackGroupId;
    const slots = room.slots.map((slot) => groupId && slot.stackGroupId === groupId
      ? moveSlot(slot, dx, dy, dz)
      : slot.id === selected.id ? moveSlot(slot, dx, dy, dz) : slot);
    return { ...room, slots, updatedAt: commit ? new Date().toISOString() : room.updatedAt };
  }

  const selected = (room.objects ?? []).find((object) => object.id === selection.id);
  if (!selected) return room;
  const groupId = selected.stackGroupId;
  return {
    ...room,
    objects: (room.objects ?? []).map((object) => groupId && object.stackGroupId === groupId
      ? moveObject(object, dx, dy, dz)
      : object.id === selected.id ? moveObject(object, dx, dy, dz) : object),
    updatedAt: commit ? new Date().toISOString() : room.updatedAt,
  };
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
    const stamped = nextRooms.map((item) => ({ ...item, roomVersion: Math.max(3, item.roomVersion ?? 3), updatedAt: new Date().toISOString() }));
    setRooms(stamped);
    roomsRef.current = stamped;
    if (!user) return;
    setSaving(true);
    try { await saveReptileRooms(user.uid, stamped); if (message) setNotice(message); }
    catch { setNotice("Saved locally; cloud sync failed."); }
    finally { setSaving(false); }
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
    const current = roomsRef.current.find((item) => item.id === room?.id);
    if (!current) return;
    void persistRooms(roomsRef.current.map((item) => item.id === current.id ? transform(item) : item), message);
  }, [persistRooms, room?.id]);

  const addAsset = useCallback((preset: Room3DAssetPreset, spawnXcm?: number, spawnYcm?: number) => {
    if (!room) return;
    const width = room.width ?? 0;
    const depth = room.depth ?? 0;
    const x = clamp(snap(spawnXcm ?? (width - preset.width) / 2), 0, Math.max(0, width - preset.width));
    const y = clamp(snap(spawnYcm ?? (depth - preset.depth) / 2), 0, Math.max(0, depth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot: ReptileRoomSlot = { id: nextId("viv"), snakeId: null, label: "Empty Vivarium", x, y, z: 0, w: preset.width, h: preset.depth, depth: preset.depth, height: preset.height, lifecycleStatus: "empty", condition: "good", availability: "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null, photoUrl: "" };
      updateRoom((current) => ({ ...current, slots: [...current.slots, slot] }), "Vivarium added in front of you.");
      setSelected({ type: "slot", id: slot.id });
      return;
    }
    const object: ReptileRoomObject = { id: nextId(preset.kind), kind: preset.kind, label: preset.label, x, y, z: 0, width: preset.width, depth: preset.depth, height: preset.height, rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null, clearance: {}, notes: "", assetType: "furniture" };
    updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), object] }), `${preset.label} added in front of you.`);
    setSelected({ type: "object", id: object.id });
  }, [room, updateRoom]);

  const moveSelection = useCallback((selection: { type: "slot" | "object"; id: string }, dx: number, dy: number, dz: number, commit: boolean) => {
    const current = roomsRef.current.find((item) => item.id === room?.id); if (!current) return;
    const next = getMovedRoom(current, selection, dx, dy, dz, commit);
    setRooms((items) => items.map((item) => item.id === next.id ? next : item));
    roomsRef.current = roomsRef.current.map((item) => item.id === next.id ? next : item);
    if (commit) void persistRooms(roomsRef.current);
  }, [persistRooms, room?.id]);

  const nudge = (dx: number, dy: number) => { if (!selected) return; moveSelection(selected, dx, dy, 0, true); };

  const toggleMagLock = () => {
    if (!room || !selected || selected.type !== "slot") return;
    const target = room.slots.find((slot) => slot.id === selected.id); if (!target) return;
    const locked = Boolean(target.stackGroupId);
    if (locked) { updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.stackGroupId === target.stackGroupId ? { ...slot, stackGroupId: null, stackIndex: 0 } : slot) }), "Mag-lock released."); return; }
    const nearby = room.slots.filter((slot) => slot.id !== target.id).map((slot) => ({ slot, distance: Math.hypot(slot.x - target.x, slot.y - target.y) })).sort((a, b) => a.distance - b.distance)[0];
    const groupId = nearby && nearby.distance <= 12 ? (nearby.slot.stackGroupId ?? nextId("mag")) : nextId("mag");
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === target.id || slot.id === nearby?.slot.id || slot.stackGroupId === groupId ? { ...slot, stackGroupId: groupId } : slot) }), nearby && nearby.distance <= 12 ? "Vivariums magnetically locked together." : "Vivarium magnet lock enabled.");
  };

  const snapSelected = () => {
    if (!room || !selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, x: snap(slot.x), y: snap(slot.y), z: snap(slot.z ?? 0) } : slot) }), "Snapped to 5 cm grid.");
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, x: snap(object.x), y: snap(object.y), z: snap(object.z ?? 0) } : object) }), "Snapped to 5 cm grid.");
  };

  const rotateSelected = () => { if (!selectedObject) return; updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, rotation: (object.rotation + 90) % 360 } : object) }), "Rotated 90°."); };

  const uploadPhoto = async (file: File) => {
    if (!user || !room || !selectedSlot) return;
    setPhotoBusy(true);
    try { const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file); await persistRooms(roomsRef.current.map((item) => item.id === room.id ? { ...item, slots: item.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) } : item), "Vivarium photo uploaded."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Photo upload failed."); }
    finally { setPhotoBusy(false); }
  };

  const photoFor = useCallback((slot: ReptileRoomSlot) => slot.photoUrl || snakeMap.get(slot.snakeId ?? "")?.enclosure?.roomPhoto?.url, [snakeMap]);
  const assignSnake = (snakeId: string) => { if (!selectedSlot) return; const snake = snakeMap.get(snakeId); updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, snakeId: snakeId || null, label: snake ? `${snakeName(snake)}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snakeId ? "active" : "empty", availability: snakeId ? "occupied" : "available" } : slot) }), snake ? `${snakeName(snake)} assigned.` : "Vivarium cleared."); };

  if (loading || profileLoading) return <div className="rr3d-loading">Loading your reptile room…</div>;
  if (!room) return <div className="rr3d-loading"><h2>No reptile room yet</h2><p>Create one in the existing Reptile Room builder first.</p></div>;

  const selectedMagLocked = Boolean(selectedSlot?.stackGroupId || selectedObject?.stackGroupId);
  const selectedPhoto = selectedSlot ? photoFor(selectedSlot) : undefined;

  return (
    <main className="rr3d-workspace">
      <header className="rr3d-workspace-header"><div><span className="rr3d-kicker">🏠 TINY TITANS · 3D DIGITAL TWIN</span><h1>{room.name}</h1><p>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm · {slots.length} vivariums · {objects.length} room assets</p></div><div className="rr3d-status">{saving ? "Saving…" : "✓ Saved"}</div></header>
      {notice && <div className="rr3d-notice">{notice}</div>}
      <div className="rr3d-layout">
        <aside className="rr3d-sidebar">
          <section><h2>Placement</h2><div className="rr3d-nudge-grid"><button onClick={() => nudge(-5, -5)}>↖</button><button onClick={() => nudge(0, -5)}>↑</button><button onClick={() => nudge(5, -5)}>↗</button><button onClick={() => nudge(-5, 0)}>←</button><button onClick={snapSelected}>⌖</button><button onClick={() => nudge(5, 0)}>→</button><button onClick={() => nudge(-5, 5)}>↙</button><button onClick={() => nudge(0, 5)}>↓</button><button onClick={() => nudge(5, 5)}>↘</button></div><div className="rr3d-action-row"><button onClick={snapSelected}>Snap 5 cm</button>{selectedObject && <button onClick={rotateSelected}>Rotate 90°</button>}{selectedSlot && <button className={selectedMagLocked ? "active" : ""} onClick={toggleMagLock}>{selectedMagLocked ? "🔒 Mag-locked" : "🧲 Mag-lock"}</button>}</div><p className="rr3d-help">Drag an asset to move it on X/Y/Z. Drag the room background to look around. Mag-locked vivariums move as one unit.</p></section>
          <section><h2>View</h2><div className="rr3d-action-row"><button onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide grid" : "Show grid"}</button><button onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div></section>
          {selectedSlot && <section><h2>Selected vivarium</h2><div className="rr3d-inspector"><strong>{selectedSlot.label}</strong><span>{vivWidth(selectedSlot)} × {vivDepth(selectedSlot)} × {vivHeight(selectedSlot)} cm</span><span>{selectedSlot.stackGroupId ? "🧲 Magnetic group active" : "Not magnetically locked"}</span><label>Occupant<select value={selectedSlot.snakeId ?? ""} onChange={(event) => assignSnake(event.target.value)}><option value="">Empty vivarium</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snakeName(snake)}</option>)}</select></label><label className="rr3d-upload">{photoBusy ? "Uploading…" : "Upload vivarium photo"}<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); event.currentTarget.value = ""; }} /></label>{selectedPhoto && <img className="rr3d-photo-preview" src={selectedPhoto} alt={`${selectedSlot.label} photo`} />}</div></section>}
          {selectedObject && <section><h2>Selected asset</h2><div className="rr3d-inspector"><strong>{selectedObject.label}</strong><span>{selectedObject.width} × {selectedObject.depth} × {selectedObject.height} cm</span><span>Position: {Math.round(selectedObject.x)}, {Math.round(selectedObject.y)}, {Math.round(selectedObject.z ?? 0)} cm</span></div></section>}
        </aside>
        <section className="rr3d-canvas-panel"><Room3D room={room} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} showGrid={showGrid} showCeiling={showCeiling} photoForSlot={photoFor} onSelect={setSelected} onMove={moveSelection} onAddAsset={addAsset} /><div className="rr3d-canvas-help">Drag empty room space = look around · Click asset = select · Drag gizmo = move X/Y/Z · Footprints = teleport · Room Assets = spawn directly in front of you</div></section>
      </div>
    </main>
  );
}
