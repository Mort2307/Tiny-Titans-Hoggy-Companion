import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Snake } from "../types/Snake";
import "../styles/reptile-room-first-person.css";

type Vec3 = { x: number; y: number; z: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snakeName = (snake: Snake | undefined) => snake?.name ?? "Unnamed Hoggy";
const slotWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const slotDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.depth ?? slot.h ?? slot.w);
const slotHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 45);
const STACK_GAP_CM = 0;
const EYE_HEIGHT_CM = 165;
const DEFAULT_VIEW_DISTANCE_CM = 45;
const CAMERA_PERSPECTIVE_CM = 750;
const MOVE_STEP_CM = 5;

function RoomWalls({ room, eyeY }: { room: Vec3; eyeY: number }) {
  const wall = 2;
  const width = room.x;
  const depth = room.z;
  const height = room.y;
  return <>
    <div className="rrfp-room-wall rrfp-wall-back" style={{ width, height, left: -width / 2, top: eyeY - height, transform: `translateZ(${-depth / 2}px)` }} />
    <div className="rrfp-room-wall rrfp-wall-front" style={{ width, height, left: -width / 2, top: eyeY - height, transform: `translateZ(${depth / 2}px) rotateY(180deg)` }} />
    <div className="rrfp-room-wall rrfp-wall-left" style={{ width: depth, height, left: -width / 2, top: eyeY - height, transform: `translateX(${-(depth - wall) / 2}px) rotateY(90deg)` }} />
    <div className="rrfp-room-wall rrfp-wall-right" style={{ width: depth, height, left: width / 2 - depth, top: eyeY - height, transform: `translateX(${(depth - wall) / 2}px) rotateY(-90deg)` }} />
  </>;
}

function RoomBox({ slot, selected, stackMode, onSelect, room, eyeY }: { slot: ReptileRoomSlot; selected: boolean; stackMode: boolean; onSelect: () => void; room: Vec3; eyeY: number }) {
  const width = slotWidth(slot);
  const depth = slotDepth(slot);
  const height = slotHeight(slot);
  const x = slot.x + width / 2 - room.x / 2;
  const z = slot.y + depth / 2 - room.z / 2;
  const bottom = eyeY - ((slot.z ?? 0) + height);
  const image = slot.photoUrl;
  return <button type="button" className={`rrfp-vivarium ${selected ? "is-selected" : ""} ${stackMode ? "is-stack-target" : ""}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${bottom}px,${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSelect(); }} aria-label={stackMode ? `Stack selected vivarium on ${slot.label}` : `Inspect ${slot.label}`}>
    <span className="rrfp-vivarium-cabinet">
      <span className="rrfp-vivarium-face">
        <span className="rrfp-glass-panel">{image ? <img src={image} alt={`${slot.label} vivarium`} /> : <span className="rrfp-empty">NO VIVARIUM PHOTO</span>}<span className="rrfp-glass-reflection" /></span>
        <span className="rrfp-frame rrfp-frame-top"/><span className="rrfp-frame rrfp-frame-bottom"/><span className="rrfp-frame rrfp-frame-left"/><span className="rrfp-frame rrfp-frame-right"/>
        <span className="rrfp-door-bar"/><span className="rrfp-handle"/><span className="rrfp-label">{slot.label}</span>
      </span>
      <span className="rrfp-vivarium-back" aria-hidden="true"/><span className="rrfp-vivarium-top" aria-hidden="true"/><span className="rrfp-vivarium-bottom" aria-hidden="true"/><span className="rrfp-vivarium-left" aria-hidden="true"/><span className="rrfp-vivarium-right" aria-hidden="true"/>
    </span>
  </button>;
}

function FurnitureBox({ object, room, eyeY }: { object: NonNullable<ReptileRoomWorkspace["objects"]>[number]; room: Vec3; eyeY: number }) {
  const width = object.width;
  const depth = object.depth;
  const height = object.height;
  const x = object.x + width / 2 - room.x / 2;
  const z = object.y + depth / 2 - room.z / 2;
  return <div className={`rrfp-furniture rrfp-kind-${object.kind}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${eyeY - object.z - height}px,${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }} aria-hidden="true"><span className="rrfp-furniture-face">{object.label}</span><span className="rrfp-furniture-top"/><span className="rrfp-furniture-side"/></div>;
}

export default function ReptileRoomFirstPerson3D() {
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
  const [notice, setNotice] = useState("");
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const selectedSnake = selected?.snakeId ? snakeMap.get(selected.snakeId) : undefined;
  const roomWidth = Math.max(100, room?.width ?? 360);
  const roomDepth = Math.max(100, room?.depth ?? 300);
  const roomHeight = Math.max(100, room?.height ?? 240);
  const roomVec: Vec3 = { x: roomWidth, y: roomHeight, z: roomDepth };
  const eyeY = EYE_HEIGHT_CM;

  const cameraTarget = useMemo(() => selected ?? slots.find((slot) => slot.snakeId) ?? slots[0] ?? null, [selected, slots]);
  const cameraPose = useMemo(() => {
    if (!cameraTarget) return { x: 0, z: 0 };
    const width = slotWidth(cameraTarget);
    const depth = slotDepth(cameraTarget);
    const targetX = cameraTarget.x + width / 2 - roomWidth / 2;
    const targetZ = cameraTarget.y + depth / 2 - roomDepth / 2;
    const desiredZ = targetZ + depth / 2 + DEFAULT_VIEW_DISTANCE_CM;
    const roomFrontLimit = roomDepth / 2 - 20;
    const roomBackLimit = -roomDepth / 2 + 20;
    const cameraZ = clamp(desiredZ, roomBackLimit, roomFrontLimit);
    const cameraX = clamp(targetX, -roomWidth / 2 + 20, roomWidth / 2 - 20);
    return { x: cameraX, z: cameraZ };
  }, [cameraTarget, roomWidth, roomDepth]);

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
    const maxX = Math.max(0, roomWidth - slotWidth(selected));
    const maxY = Math.max(0, roomDepth - slotDepth(selected));
    const candidates = [
      { d: selected.x, patch: { x: 0 } }, { d: maxX - selected.x, patch: { x: maxX } },
      { d: selected.y, patch: { y: 0 } }, { d: maxY - selected.y, patch: { y: maxY } },
    ].sort((a, b) => a.d - b.d);
    await updateSlot(selected.id, candidates[0].patch, `${selected.label} snapped to the nearest wall.`);
  };

  const selectSlot = (slotId: string) => {
    if (stackMode && selectedId && slotId !== selectedId) {
      const lower = slots.find((slot) => slot.id === slotId);
      const upper = selected;
      if (!lower || !upper) return;
      const sameFootprint = slotWidth(upper) <= slotWidth(lower) && slotDepth(upper) <= slotDepth(lower);
      if (!sameFootprint) { setNotice("The upper vivarium must fit within the lower vivarium footprint before stacking."); return; }
      const targetZ = (lower.z ?? 0) + slotHeight(lower) + STACK_GAP_CM;
      if (targetZ + slotHeight(upper) > roomHeight) { setNotice("That vivarium would exceed the room ceiling."); return; }
      void updateSlot(upper.id, { x: lower.x + (slotWidth(lower) - slotWidth(upper)) / 2, y: lower.y + (slotDepth(lower) - slotDepth(upper)) / 2, z: targetZ, stackGroupId: lower.stackGroupId ?? lower.id, stackIndex: (lower.stackIndex ?? 0) + 1, parentSlotId: lower.id }, `${upper.label} stacked on ${lower.label}.`);
      setStackMode(false); return;
    }
    setSelectedId(slotId); setEditMode(false);
  };

  const beginEdit = () => { if (!selected) return; setEditDimensions({ width: slotWidth(selected), depth: slotDepth(selected), height: slotHeight(selected) }); setStackMode(false); setEditMode(true); };
  const saveDimensions = async () => {
    if (!selected) return;
    const width = clamp(Number(editDimensions.width) || 1, 1, roomWidth);
    const depth = clamp(Number(editDimensions.depth) || 1, 1, roomDepth);
    const height = clamp(Number(editDimensions.height) || 1, 1, roomHeight);
    const maxX = Math.max(0, roomWidth - width); const maxY = Math.max(0, roomDepth - depth); const maxZ = Math.max(0, roomHeight - height);
    await updateSlot(selected.id, { w: width, h: depth, depth, height, x: clamp(selected.x, 0, maxX), y: clamp(selected.y, 0, maxY), z: clamp(selected.z ?? 0, 0, maxZ) }, "Vivarium dimensions saved.");
    setEditMode(false);
  };

  const moveSelected = async (dx: number, dy: number, dz = 0) => {
    if (!selected) return;
    const maxX = Math.max(0, roomWidth - slotWidth(selected)); const maxY = Math.max(0, roomDepth - slotDepth(selected)); const maxZ = Math.max(0, roomHeight - slotHeight(selected));
    await updateSlot(selected.id, { x: clamp(selected.x + dx, 0, maxX), y: clamp(selected.y + dy, 0, maxY), z: clamp((selected.z ?? 0) + dz, 0, maxZ), ...(dz !== 0 ? { parentSlotId: null, stackGroupId: null, stackIndex: 0 } : {}) }, "Vivarium position saved.");
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { if (event.button !== 0) return; drag.current = { x: event.clientX, y: event.clientY, yaw, pitch }; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!drag.current) return; setYaw(clamp(drag.current.yaw - (event.clientX - drag.current.x) * 0.16, -180, 180)); setPitch(clamp(drag.current.pitch + (event.clientY - drag.current.y) * 0.12, -55, 55)); };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };

  if (loading || profileLoading) return <div className="rrfp-loading">Loading your room…</div>;
  if (!room) return <div className="rrfp-loading"><h2>No reptile room yet</h2><p>Build your scaled room first, then come back here.</p></div>;

  const worldTransform = `rotateX(${-pitch}deg) rotateY(${-yaw}deg) translate3d(${-cameraPose.x}px,0,${-cameraPose.z}px)`;

  return <main className="reptile-room-first-person">
    <header className="rrfp-header"><div><span className="rrfp-kicker">🏠 TINY TITANS · FIRST-PERSON ROOM</span><h1>{room.name}</h1><p>{Math.round(roomWidth)} × {Math.round(roomDepth)} × {Math.round(roomHeight)} cm · true 1:1 room scale · eye height {EYE_HEIGHT_CM} cm · viewing distance {DEFAULT_VIEW_DISTANCE_CM} cm</p></div><div className="rrfp-header-actions">{rooms.length > 1 && <select value={room.id} onChange={(e) => setRoomId(e.target.value)} aria-label="Select room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<button type="button" onClick={() => { setYaw(0); setPitch(0); }}>Centre view</button></div></header>
    {notice && <div className="rrfp-notice">{notice}</div>}
    <section className="rrfp-viewport" aria-label="First-person reptile room view" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className="rrfp-crosshair" aria-hidden="true"><span/></div>
      <div className="rrfp-hud"><strong>FIRST-PERSON · 1:1 SCALE</strong><span>POV: {cameraTarget ? `4 ft / ${DEFAULT_VIEW_DISTANCE_CM} cm from ${cameraTarget.label}` : "room centre"} · eye height {EYE_HEIGHT_CM} cm</span><span>Drag to look left / right / up / down</span><span>{stackMode ? "STACK MODE · tap a lower vivarium" : "Tap a vivarium to inspect"}</span></div>
      <div className="rrfp-camera" style={{ perspective: `${CAMERA_PERSPECTIVE_CM}px` }}><div className="rrfp-world" style={{ transform: worldTransform }}>
        <RoomWalls room={roomVec} eyeY={eyeY} />
        <div className="rrfp-floor" style={{ width: roomWidth, height: roomDepth, top: eyeY }} />
        {slots.map((slot) => <RoomBox key={slot.id} slot={slot} selected={slot.id === selectedId} stackMode={stackMode && slot.id !== selectedId} onSelect={() => selectSlot(slot.id)} room={roomVec} eyeY={eyeY} />)}
        {objects.map((object) => <FurnitureBox key={object.id} object={object} room={roomVec} eyeY={eyeY} />)}
      </div></div>
    </section>
    {selected && <aside className="rrfp-inspector" aria-label="Vivarium information">
      <button type="button" className="rrfp-close" onClick={() => { setSelectedId(null); setStackMode(false); setEditMode(false); }} aria-label="Close vivarium information">×</button>
      <span className="rrfp-inspector-kicker">VIVARIUM</span><h2>{selected.label}</h2>
      <div className="rrfp-inspector-grid"><div><span>Occupant</span><strong>{selectedSnake ? snakeName(selectedSnake) : "Empty"}</strong></div><div><span>Dimensions</span><strong>{slotWidth(selected)} × {slotDepth(selected)} × {slotHeight(selected)} cm</strong></div><div><span>Position</span><strong>X {Math.round(selected.x)} · Y {Math.round(selected.y)} · Z {Math.round(selected.z ?? 0)} cm</strong></div><div><span>Placement</span><strong>{selected.parentSlotId ? "Stacked" : (selected.z ?? 0) > 0 ? "Raised" : "Floor"}</strong></div></div>
      {!editMode ? <div className="rrfp-editor"><button type="button" className="rrfp-edit-vivarium" onClick={beginEdit}>✏️ Edit vivarium</button><strong>POSITION</strong><div className="rrfp-move-grid"><button type="button" onClick={() => void moveSelected(0, -MOVE_STEP_CM)}>↑ Forward</button><button type="button" onClick={() => void moveSelected(-MOVE_STEP_CM, 0)}>← Left</button><button type="button" onClick={() => void moveSelected(MOVE_STEP_CM, 0)}>Right →</button><button type="button" onClick={() => void moveSelected(0, MOVE_STEP_CM)}>↓ Back</button><button type="button" onClick={() => void moveSelected(0, 0, MOVE_STEP_CM)}>↑ Raise</button><button type="button" onClick={() => void moveSelected(0, 0, -MOVE_STEP_CM)}>↓ Lower</button></div><div className="rrfp-editor-actions"><button type="button" onClick={() => setStackMode((value) => !value)}>{stackMode ? "Cancel stacking" : "Pick up & stack on…"}</button><button type="button" onClick={() => void placeFloor()}>Snap to floor</button><button type="button" onClick={() => void snapWall()}>Snap to nearest wall</button></div></div> : <div className="rrfp-editor"><strong>EDIT VIVARIUM</strong><label>Width (cm)<input type="number" min="1" max={roomWidth} value={editDimensions.width} onChange={(e) => setEditDimensions((current) => ({ ...current, width: Number(e.target.value) }))}/></label><label>Depth (cm)<input type="number" min="1" max={roomDepth} value={editDimensions.depth} onChange={(e) => setEditDimensions((current) => ({ ...current, depth: Number(e.target.value) }))}/></label><label>Height (cm)<input type="number" min="1" max={roomHeight} value={editDimensions.height} onChange={(e) => setEditDimensions((current) => ({ ...current, height: Number(e.target.value) }))}/></label><div className="rrfp-editor-actions"><button type="button" onClick={() => void saveDimensions()}>Save vivarium</button><button type="button" onClick={() => setEditMode(false)}>Cancel</button></div><small>Dimensions and positions are stored in centimetres and constrained to the actual room volume.</small></div>}
    </aside>}
  </main>;
}
