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
const STACK_GAP_CM = 5;
const EYE_HEIGHT_CM = 165;
const VIEW_SCALE = 1.8;

function RoomBox({ slot, selected, stackMode, onSelect, unit, room, eyeY }: { slot: ReptileRoomSlot; selected: boolean; stackMode: boolean; onSelect: () => void; unit: number; room: Vec3; eyeY: number }) {
  const width = slotWidth(slot) * unit;
  const depth = slotDepth(slot) * unit;
  const height = slotHeight(slot) * unit;
  const x = (slot.x + slotWidth(slot) / 2 - room.x / 2) * unit;
  const z = (slot.y + slotDepth(slot) / 2 - room.z / 2) * unit;
  const bottom = eyeY - ((slot.z ?? 0) + slotHeight(slot)) * unit;
  const image = slot.photoUrl;

  return <button type="button" className={`rrfp-vivarium ${selected ? "is-selected" : ""} ${stackMode ? "is-stack-target" : ""}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${bottom}px,${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSelect(); }} aria-label={stackMode ? `Stack selected vivarium on ${slot.label}` : `Inspect ${slot.label}`}>
    <span className="rrfp-vivarium-face">
      {image ? <img src={image} alt={`${slot.label} vivarium`} /> : <span className="rrfp-empty">NO VIVARIUM PHOTO</span>}
      <span className="rrfp-frame rrfp-frame-top"/><span className="rrfp-frame rrfp-frame-bottom"/><span className="rrfp-frame rrfp-frame-left"/><span className="rrfp-frame rrfp-frame-right"/>
      <span className="rrfp-glass"/><span className="rrfp-door-bar"/><span className="rrfp-label">{slot.label}</span>
    </span>
    <span className="rrfp-vivarium-top" aria-hidden="true"/><span className="rrfp-vivarium-side" aria-hidden="true"/>
  </button>;
}

function FurnitureBox({ object, unit, room, eyeY }: { object: NonNullable<ReptileRoomWorkspace["objects"]>[number]; unit: number; room: Vec3; eyeY: number }) {
  const width = object.width * unit;
  const depth = object.depth * unit;
  const height = object.height * unit;
  const x = (object.x + object.width / 2 - room.x / 2) * unit;
  const z = (object.y + object.depth / 2 - room.z / 2) * unit;
  return <div className={`rrfp-furniture rrfp-kind-${object.kind}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${eyeY - object.z * unit - height}px,${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }} aria-hidden="true"><span className="rrfp-furniture-face">{object.label}</span><span className="rrfp-furniture-top"/><span className="rrfp-furniture-side"/></div>;
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
  const [notice, setNotice] = useState("");
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const selectedSnake = selected?.snakeId ? snakeMap.get(selected.snakeId) : undefined;

  const roomWidth = Math.max(100, room?.width ?? 490);
  const roomDepth = Math.max(100, room?.depth ?? 315);
  const roomHeight = Math.max(100, room?.height ?? 245);
  const unit = VIEW_SCALE;
  const scaledWidth = roomWidth * unit;
  const scaledDepth = roomDepth * unit;
  const eyeY = EYE_HEIGHT_CM * unit;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms); setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);
  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateSlot = useCallback(async (slotId: string, patch: Partial<ReptileRoomSlot>) => {
    if (!user || !room) return;
    const nextSlots = room.slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot);
    const nextRoom = { ...room, slots: nextSlots, updatedAt: new Date().toISOString() };
    const nextRooms = rooms.map((item) => item.id === room.id ? nextRoom : item);
    setRooms(nextRooms);
    try { await saveReptileRooms(user.uid, nextRooms); setNotice("Vivarium position saved."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save vivarium position."); }
  }, [room, rooms, user]);

  const moveSelected = async (dx: number, dy: number, dz = 0) => {
    if (!selected || !room) return;
    const maxX = Math.max(0, roomWidth - slotWidth(selected));
    const maxY = Math.max(0, roomDepth - slotDepth(selected));
    const maxZ = Math.max(0, roomHeight - slotHeight(selected));
    await updateSlot(selected.id, { x: clamp(selected.x + dx, 0, maxX), y: clamp(selected.y + dy, 0, maxY), z: clamp((selected.z ?? 0) + dz, 0, maxZ) });
  };

  const selectSlot = (slotId: string) => {
    if (stackMode && selectedId && slotId !== selectedId) {
      const lower = slots.find((slot) => slot.id === slotId);
      const upper = selected;
      if (!lower || !upper || !room) return;
      const maxZ = Math.max(0, roomHeight - slotHeight(upper));
      const targetZ = (lower.z ?? 0) + slotHeight(lower) + STACK_GAP_CM;
      if (targetZ > maxZ) { setNotice("That vivarium would exceed the room ceiling."); return; }
      void updateSlot(upper.id, { x: lower.x, y: lower.y, z: targetZ, stackGroupId: lower.stackGroupId ?? lower.id, stackIndex: (lower.stackIndex ?? 0) + 1, parentSlotId: lower.id });
      setStackMode(false); setNotice(`${upper.label} stacked on ${lower.label}.`); return;
    }
    setSelectedId(slotId);
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { if (event.button !== 0) return; drag.current = { x: event.clientX, y: event.clientY, yaw, pitch }; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!drag.current) return; setYaw(clamp(drag.current.yaw - (event.clientX - drag.current.x) * 0.16, -180, 180)); setPitch(clamp(drag.current.pitch + (event.clientY - drag.current.y) * 0.12, -55, 55)); };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };

  if (loading || profileLoading) return <div className="rrfp-loading">Loading your room…</div>;
  if (!room) return <div className="rrfp-loading"><h2>No reptile room yet</h2><p>Build your scaled room first, then come back here.</p></div>;

  return <main className="reptile-room-first-person">
    <header className="rrfp-header"><div><span className="rrfp-kicker">🏠 TINY TITANS · FIRST-PERSON ROOM</span><h1>{room.name}</h1><p>{Math.round(roomWidth)} × {Math.round(roomDepth)} × {Math.round(roomHeight)} cm · You are standing at the centre of the room.</p></div><div className="rrfp-header-actions">{rooms.length > 1 && <select value={room.id} onChange={(e) => setRoomId(e.target.value)} aria-label="Select room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<button type="button" onClick={() => { setYaw(0); setPitch(0); }}>Centre view</button></div></header>
    {notice && <div className="rrfp-notice">{notice}</div>}
    <section className="rrfp-viewport" aria-label="First-person reptile room view" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className="rrfp-crosshair" aria-hidden="true"><span/></div>
      <div className="rrfp-hud"><strong>FIRST-PERSON</strong><span>👁 POV: room centre · eye height {EYE_HEIGHT_CM} cm</span><span>Drag to look left/right/up/down</span><span>{stackMode ? "STACK MODE · tap a lower vivarium" : "Tap a vivarium to inspect"}</span></div>
      <div className="rrfp-camera"><div className="rrfp-world" style={{ transform: `rotateX(${pitch}deg) rotateY(${-yaw}deg)` }}>
        <div className="rrfp-floor" style={{ width: scaledWidth, height: scaledDepth, top: eyeY }} />
        {slots.map((slot) => <RoomBox key={slot.id} slot={slot} selected={slot.id === selectedId} stackMode={stackMode && slot.id !== selectedId} onSelect={() => selectSlot(slot.id)} unit={unit} eyeY={eyeY} room={{ x: roomWidth, y: roomHeight, z: roomDepth }} />)}
        {objects.map((object) => <FurnitureBox key={object.id} object={object} unit={unit} eyeY={eyeY} room={{ x: roomWidth, y: roomHeight, z: roomDepth }} />)}
      </div></div>
    </section>
    {selected && <aside className="rrfp-inspector" aria-label="Vivarium information"><button type="button" className="rrfp-close" onClick={() => { setSelectedId(null); setStackMode(false); }} aria-label="Close vivarium information">×</button><span className="rrfp-inspector-kicker">VIVARIUM</span><h2>{selected.label}</h2><div className="rrfp-inspector-grid"><div><span>Occupant</span><strong>{selectedSnake ? snakeName(selectedSnake) : "Empty"}</strong></div><div><span>Dimensions</span><strong>{slotWidth(selected)} × {slotDepth(selected)} × {slotHeight(selected)} cm</strong></div><div><span>Position</span><strong>X {Math.round(selected.x)} · Y {Math.round(selected.y)} · Z {Math.round(selected.z ?? 0)} cm</strong></div><div><span>Stack</span><strong>{selected.parentSlotId ? "On another vivarium" : "Floor / free-standing"}</strong></div></div><div className="rrfp-editor"><strong>EDIT POSITION</strong><div className="rrfp-move-grid"><button type="button" onClick={() => void moveSelected(0, -5)}>↑ Forward</button><button type="button" onClick={() => void moveSelected(-5, 0)}>← Left</button><button type="button" onClick={() => void moveSelected(5, 0)}>Right →</button><button type="button" onClick={() => void moveSelected(0, 5)}>↓ Back</button><button type="button" onClick={() => void moveSelected(0, 0, 5)}>↑ Raise</button><button type="button" onClick={() => void moveSelected(0, 0, -5)}>↓ Lower</button></div><div className="rrfp-editor-actions"><button type="button" onClick={() => setStackMode((value) => !value)}>{stackMode ? "Cancel stacking" : "Pick up & stack on…"}</button><button type="button" onClick={() => void updateSlot(selected.id, { x: 0, y: 0, z: 0, parentSlotId: null, stackGroupId: null, stackIndex: 0 })}>Move to floor origin</button></div><small>Stacking uses real centimetre dimensions and places the selected vivarium above the lower vivarium with a {STACK_GAP_CM} cm service gap.</small></div></aside>}
  </main>;
}
