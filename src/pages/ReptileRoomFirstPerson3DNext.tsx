import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { deleteReptileRoomVivariumPhoto, uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import type { Snake } from "../types/Snake";
import "../styles/reptile-room-first-person.css";

type Vec3 = { x: number; y: number; z: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snakeName = (snake: Snake | undefined) => snake?.name ?? "Unnamed Hoggy";
const slotWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const slotDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.depth ?? slot.h ?? slot.w);
const slotHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 45);
const EYE_HEIGHT_CM = 165;
const MOVE_STEP_CM = 5;

function RoomWalls({ room }: { room: Vec3 }) {
  const wall = 2;
  return <>
    <div className="rrfp-room-wall rrfp-wall-back" style={{ width: room.x, height: room.y, left: -room.x / 2, top: -room.y, transform: `translateZ(${-room.z / 2}px)` }} />
    <div className="rrfp-room-wall rrfp-wall-front" style={{ width: room.x, height: room.y, left: -room.x / 2, top: -room.y, transform: `translateZ(${room.z / 2}px) rotateY(180deg)` }} />
    <div className="rrfp-room-wall rrfp-wall-left" style={{ width: room.z, height: room.y, left: -room.x / 2, top: -room.y, transform: `translateX(${-(room.z - wall) / 2}px) rotateY(90deg)` }} />
    <div className="rrfp-room-wall rrfp-wall-right" style={{ width: room.z, height: room.y, left: room.x / 2 - room.z, top: -room.y, transform: `translateX(${(room.z - wall) / 2}px) rotateY(-90deg)` }} />
  </>;
}

function RoomBox({ slot, selected, stackMode, onSelect, room }: { slot: ReptileRoomSlot; selected: boolean; stackMode: boolean; onSelect: () => void; room: Vec3 }) {
  const width = slotWidth(slot);
  const depth = slotDepth(slot);
  const height = slotHeight(slot);
  const x = slot.x + width / 2 - room.x / 2;
  const z = slot.y + depth / 2 - room.z / 2;
  const y = -(slot.z ?? 0) - height;
  return <button type="button" className={`rrfp-vivarium ${selected ? "is-selected" : ""} ${stackMode ? "is-stack-target" : ""}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${y}px,${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSelect(); }} aria-label={stackMode ? `Stack selected vivarium on ${slot.label}` : `Inspect ${slot.label}`}>
    <span className="rrfp-vivarium-cabinet">
      <span className="rrfp-vivarium-face">
        <span className="rrfp-glass-panel">{slot.photoUrl ? <img src={slot.photoUrl} alt={`${slot.label} vivarium`} /> : <span className="rrfp-empty">NO VIVARIUM PHOTO</span>}<span className="rrfp-glass-reflection" /></span>
        <span className="rrfp-frame rrfp-frame-top"/><span className="rrfp-frame rrfp-frame-bottom"/><span className="rrfp-frame rrfp-frame-left"/><span className="rrfp-frame rrfp-frame-right"/>
        <span className="rrfp-door-bar"/><span className="rrfp-handle"/><span className="rrfp-label">{slot.label}</span>
      </span>
      <span className="rrfp-vivarium-back"/><span className="rrfp-vivarium-top"/><span className="rrfp-vivarium-bottom"/><span className="rrfp-vivarium-left"/><span className="rrfp-vivarium-right"/>
    </span>
  </button>;
}

function FurnitureBox({ object, room }: { object: NonNullable<ReptileRoomWorkspace["objects"]>[number]; room: Vec3 }) {
  return <div className={`rrfp-furniture rrfp-kind-${object.kind}`} style={{ width: object.width, height: object.height, transform: `translate3d(${object.x + object.width / 2 - room.x / 2 - object.width / 2}px,${-object.z - object.height}px,${object.y + object.depth / 2 - room.z / 2}px)`, ["--rrfp-depth" as string]: `${object.depth}px` }} aria-hidden="true"><span className="rrfp-furniture-face">{object.label}</span><span className="rrfp-furniture-top"/><span className="rrfp-furniture-side"/></div>;
}

export default function ReptileRoomFirstPerson3DNext() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stackMode, setStackMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDimensions, setEditDimensions] = useState({ width: 1, depth: 1, height: 1 });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const selectedSnake = selected?.snakeId ? snakeMap.get(selected.snakeId) : undefined;

  // Room and vivarium dimensions are all centimetres. No visual scale multiplier is applied.
  const roomWidth = Math.max(100, room?.width ?? 360);
  const roomDepth = Math.max(100, room?.depth ?? 300);
  const roomHeight = Math.max(100, room?.height ?? 240);
  const roomVec: Vec3 = { x: roomWidth, y: roomHeight, z: roomDepth };
  // Keep the POV inside the room while giving the user a slightly more useful stand-off from the centre.
  // This is derived from the saved room depth rather than an arbitrary pixel zoom.
  const cameraForwardCm = clamp(roomDepth * 0.12, 0, 60);
  const cameraPerspectiveCm = clamp(roomDepth * 2.4, 650, 1200);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms); setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);
  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateSlot = useCallback(async (slotId: string, patch: Partial<ReptileRoomSlot>, successMessage = "Vivarium updated.") => {
    if (!user || !room) return;
    const nextSlots = room.slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot);
    const nextRoom = { ...room, slots: nextSlots, updatedAt: new Date().toISOString() };
    const nextRooms = rooms.map((item) => item.id === room.id ? nextRoom : item);
    setRooms(nextRooms);
    try { await saveReptileRooms(user.uid, nextRooms); setNotice(successMessage); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save vivarium changes."); }
  }, [room, rooms, user]);

  const placeFloor = async () => { if (selected) await updateSlot(selected.id, { z: 0, parentSlotId: null, stackGroupId: null, stackIndex: 0 }, `${selected.label} placed on the floor.`); };
  const snapWall = async () => {
    if (!selected) return;
    const maxX = Math.max(0, roomWidth - slotWidth(selected)); const maxY = Math.max(0, roomDepth - slotDepth(selected));
    const candidates = [{ d: selected.x, patch: { x: 0 } }, { d: maxX - selected.x, patch: { x: maxX } }, { d: selected.y, patch: { y: 0 } }, { d: maxY - selected.y, patch: { y: maxY } }].sort((a, b) => a.d - b.d);
    await updateSlot(selected.id, candidates[0].patch, `${selected.label} snapped to the nearest wall.`);
  };

  const selectSlot = (slotId: string) => {
    if (stackMode && selectedId && slotId !== selectedId) {
      const lower = slots.find((slot) => slot.id === slotId); const upper = selected;
      if (!lower || !upper) return;
      if (slotWidth(upper) > slotWidth(lower) || slotDepth(upper) > slotDepth(lower)) { setNotice("The upper vivarium must fit within the lower vivarium footprint before stacking."); return; }
      const targetZ = (lower.z ?? 0) + slotHeight(lower);
      if (targetZ + slotHeight(upper) > roomHeight) { setNotice("That vivarium would exceed the room ceiling."); return; }
      void updateSlot(upper.id, { x: lower.x + (slotWidth(lower) - slotWidth(upper)) / 2, y: lower.y + (slotDepth(lower) - slotDepth(upper)) / 2, z: targetZ, stackGroupId: lower.stackGroupId ?? lower.id, stackIndex: (lower.stackIndex ?? 0) + 1, parentSlotId: lower.id }, `${upper.label} stacked on ${lower.label}.`);
      setStackMode(false); return;
    }
    setSelectedId(slotId); setEditMode(false);
  };

  const beginEdit = () => { if (!selected) return; setEditDimensions({ width: slotWidth(selected), depth: slotDepth(selected), height: slotHeight(selected) }); setStackMode(false); setEditMode(true); };
  const saveDimensions = async () => {
    if (!selected) return;
    const width = clamp(Number(editDimensions.width) || 1, 1, roomWidth); const depth = clamp(Number(editDimensions.depth) || 1, 1, roomDepth); const height = clamp(Number(editDimensions.height) || 1, 1, roomHeight);
    await updateSlot(selected.id, { w: width, h: depth, depth, height, x: clamp(selected.x, 0, Math.max(0, roomWidth - width)), y: clamp(selected.y, 0, Math.max(0, roomDepth - depth)), z: clamp(selected.z ?? 0, 0, Math.max(0, roomHeight - height)) }, "Vivarium dimensions saved.");
    setEditMode(false);
  };

  const moveSelected = async (dx: number, dy: number, dz = 0) => {
    if (!selected) return;
    const maxX = Math.max(0, roomWidth - slotWidth(selected)); const maxY = Math.max(0, roomDepth - slotDepth(selected)); const maxZ = Math.max(0, roomHeight - slotHeight(selected));
    await updateSlot(selected.id, { x: clamp(selected.x + dx, 0, maxX), y: clamp(selected.y + dy, 0, maxY), z: clamp((selected.z ?? 0) + dz, 0, maxZ), ...(dz !== 0 ? { parentSlotId: null, stackGroupId: null, stackIndex: 0 } : {}) }, "Vivarium position saved.");
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !selected || !room || !user) return;
    setPhotoBusy(true); setNotice("");
    try {
      const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selected.id, file);
      await updateSlot(selected.id, { photoUrl: url }, `${selected.label} photo saved.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to upload the vivarium photo."); }
    finally { setPhotoBusy(false); }
  };

  const removePhoto = async () => {
    if (!selected || !room || !user) return;
    setPhotoBusy(true); setNotice("");
    try { await deleteReptileRoomVivariumPhoto(user.uid, room.id, selected.id); await updateSlot(selected.id, { photoUrl: "" }, `${selected.label} photo removed.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to remove the vivarium photo."); }
    finally { setPhotoBusy(false); }
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { if (event.button !== 0) return; drag.current = { x: event.clientX, y: event.clientY, yaw, pitch }; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!drag.current) return; setYaw(clamp(drag.current.yaw - (event.clientX - drag.current.x) * 0.16, -180, 180)); setPitch(clamp(drag.current.pitch + (event.clientY - drag.current.y) * 0.12, -55, 55)); };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };

  if (loading || profileLoading) return <div className="rrfp-loading">Loading your room…</div>;
  if (!room) return <div className="rrfp-loading"><h2>No reptile room yet</h2><p>Build your scaled room first, then come back here.</p></div>;

  return <main className="reptile-room-first-person">
    <header className="rrfp-header"><div><span className="rrfp-kicker">🏠 TINY TITANS · FIRST-PERSON ROOM</span><h1>{room.name}</h1><p>{Math.round(roomWidth)} × {Math.round(roomDepth)} × {Math.round(roomHeight)} cm · true 1:1 scale · eye height {EYE_HEIGHT_CM} cm</p></div><div className="rrfp-header-actions">{rooms.length > 1 && <select value={room.id} onChange={(e) => setRoomId(e.target.value)} aria-label="Select room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<button type="button" onClick={() => { setYaw(0); setPitch(0); }}>Centre view</button></div></header>
    {notice && <div className="rrfp-notice">{notice}</div>}
    <section className="rrfp-viewport" aria-label="First-person reptile room view" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className="rrfp-crosshair" aria-hidden="true"><span/></div>
      <div className="rrfp-hud"><strong>FIRST-PERSON · 1:1 SCALE</strong><span>POV: room centre + {Math.round(cameraForwardCm)} cm forward · eye height {EYE_HEIGHT_CM} cm</span><span>Drag to look left / right / up / down</span><span>{stackMode ? "STACK MODE · tap a lower vivarium" : "Tap a vivarium to inspect"}</span></div>
      <div className="rrfp-camera" style={{ perspective: `${cameraPerspectiveCm}px` }}><div className="rrfp-world" style={{ transform: `translateZ(${cameraForwardCm}px) rotateX(${pitch}deg) rotateY(${-yaw}deg)` }}>
        <RoomWalls room={roomVec} />
        <div className="rrfp-floor" style={{ width: roomWidth, height: roomDepth, top: 0, transform: "translate(-50%,0) rotateX(90deg)" }} />
        {slots.map((slot) => <RoomBox key={slot.id} slot={slot} selected={slot.id === selectedId} stackMode={stackMode && slot.id !== selectedId} onSelect={() => selectSlot(slot.id)} room={roomVec} />)}
        {objects.map((object) => <FurnitureBox key={object.id} object={object} room={roomVec} />)}
      </div></div>
    </section>
    {selected && <aside className="rrfp-inspector" aria-label="Vivarium information">
      <button type="button" className="rrfp-close" onClick={() => { setSelectedId(null); setStackMode(false); setEditMode(false); }} aria-label="Close vivarium information">×</button>
      <span className="rrfp-inspector-kicker">VIVARIUM</span><h2>{selected.label}</h2>
      <div className="rrfp-inspector-grid"><div><span>Occupant</span><strong>{selectedSnake ? snakeName(selectedSnake) : "Empty"}</strong></div><div><span>Dimensions</span><strong>{slotWidth(selected)} × {slotDepth(selected)} × {slotHeight(selected)} cm</strong></div><div><span>Position</span><strong>X {Math.round(selected.x)} · Y {Math.round(selected.y)} · Z {Math.round(selected.z ?? 0)} cm</strong></div><div><span>Placement</span><strong>{selected.parentSlotId ? "Stacked" : (selected.z ?? 0) > 0 ? "Raised" : "Floor"}</strong></div></div>
      {!editMode ? <div className="rrfp-editor"><button type="button" className="rrfp-edit-vivarium" onClick={beginEdit}>✏️ Edit vivarium</button><strong>POSITION</strong><div className="rrfp-move-grid"><button type="button" onClick={() => void moveSelected(0, -MOVE_STEP_CM)}>↑ Forward</button><button type="button" onClick={() => void moveSelected(-MOVE_STEP_CM, 0)}>← Left</button><button type="button" onClick={() => void moveSelected(MOVE_STEP_CM, 0)}>Right →</button><button type="button" onClick={() => void moveSelected(0, MOVE_STEP_CM)}>↓ Back</button><button type="button" onClick={() => void moveSelected(0, 0, MOVE_STEP_CM)}>↑ Raise</button><button type="button" onClick={() => void moveSelected(0, 0, -MOVE_STEP_CM)}>↓ Lower</button></div><div className="rrfp-editor-actions"><button type="button" onClick={() => setStackMode((value) => !value)}>{stackMode ? "Cancel stacking" : "Pick up & stack on…"}</button><button type="button" onClick={() => void placeFloor()}>Snap to floor</button><button type="button" onClick={() => void snapWall()}>Snap to nearest wall</button></div></div> : <div className="rrfp-editor"><strong>EDIT VIVARIUM</strong><div className="rrfp-photo-editor"><span>VIVARIUM PHOTO</span>{selected.photoUrl ? <img src={selected.photoUrl} alt={`${selected.label} preview`} /> : <div className="rrfp-photo-empty">No photo assigned</div>}<div className="rrfp-editor-actions"><button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoBusy}>{photoBusy ? "Uploading…" : selected.photoUrl ? "Replace photo" : "Add photo"}</button>{selected.photoUrl && <button type="button" onClick={() => void removePhoto()} disabled={photoBusy}>Remove photo</button>}</div><input ref={photoInputRef} className="rrfp-hidden-file" type="file" accept="image/*" onChange={handlePhoto} /></div><label>Width (cm)<input type="number" min="1" max={roomWidth} value={editDimensions.width} onChange={(e) => setEditDimensions((current) => ({ ...current, width: Number(e.target.value) }))}/></label><label>Depth (cm)<input type="number" min="1" max={roomDepth} value={editDimensions.depth} onChange={(e) => setEditDimensions((current) => ({ ...current, depth: Number(e.target.value) }))}/></label><label>Height (cm)<input type="number" min="1" max={roomHeight} value={editDimensions.height} onChange={(e) => setEditDimensions((current) => ({ ...current, height: Number(e.target.value) }))}/></label><div className="rrfp-editor-actions"><button type="button" onClick={() => void saveDimensions()}>Save vivarium</button><button type="button" onClick={() => setEditMode(false)}>Cancel</button></div><small>Room and vivarium geometry are calculated directly from centimetre dimensions; there is no arbitrary visual scaling.</small></div>}
    </aside>}
  </main>;
}
