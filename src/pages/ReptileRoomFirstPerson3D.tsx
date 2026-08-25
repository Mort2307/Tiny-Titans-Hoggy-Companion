import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Snake } from "../types/Snake";
import "../styles/reptile-room-first-person.css";

type Vec3 = { x: number; y: number; z: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snakeName = (snake: Snake | undefined) => snake?.name ?? "Unnamed Hoggy";
const slotWidth = (slot: ReptileRoomSlot) => Math.max(1, slot.w);
const slotDepth = (slot: ReptileRoomSlot) => Math.max(1, slot.h);
const slotHeight = (slot: ReptileRoomSlot) => Math.max(1, slot.height ?? 45);

function RoomBox({ slot, selected, onSelect, unit, room, eyeY }: { slot: ReptileRoomSlot; selected: boolean; onSelect: () => void; unit: number; room: Vec3; eyeY: number }) {
  const width = slotWidth(slot) * unit;
  const depth = slotDepth(slot) * unit;
  const height = slotHeight(slot) * unit;
  const x = (slot.x + slotWidth(slot) / 2 - room.x / 2) * unit;
  const z = (slot.y + slotDepth(slot) / 2 - room.z / 2) * unit;
  const bottom = eyeY - height;
  return <button type="button" className={`rrfp-vivarium ${selected ? "is-selected" : ""}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${bottom}px,${z}px)` }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSelect(); }} aria-label={`Inspect ${slot.label}`} data-depth={depth}>
    <span className="rrfp-vivarium-face">{slot.photoUrl ? <img src={slot.photoUrl} alt="" /> : <span className="rrfp-empty">EMPTY</span>}<span className="rrfp-glass"/><span className="rrfp-door-bar"/><span className="rrfp-label">{slot.label}</span></span>
    <span className="rrfp-vivarium-top"/><span className="rrfp-vivarium-side"/>
  </button>;
}

function FurnitureBox({ object, unit, room, eyeY }: { object: NonNullable<ReptileRoomWorkspace["objects"]>[number]; unit: number; room: Vec3; eyeY: number }) {
  const width = object.width * unit;
  const height = object.height * unit;
  const x = (object.x + object.width / 2 - room.x / 2) * unit;
  const z = (object.y + object.depth / 2 - room.z / 2) * unit;
  return <div className={`rrfp-furniture rrfp-kind-${object.kind}`} style={{ width, height, transform: `translate3d(${x - width / 2}px,${eyeY - height}px,${z}px)` }} aria-hidden="true"><span className="rrfp-furniture-face">{object.label}</span><span className="rrfp-furniture-top"/><span className="rrfp-furniture-side"/></div>;
}

export default function ReptileRoomFirstPerson3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  // One fixed cm-to-world calibration keeps the room and every vivarium proportional.
  const unit = 1 / 2.25;
  const scaledWidth = roomWidth * unit;
  const scaledDepth = roomDepth * unit;
  const eyeY = 165 * unit;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms); setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);
  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, yaw, pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const deltaX = event.clientX - drag.current.x;
    const deltaY = event.clientY - drag.current.y;
    setYaw(clamp(drag.current.yaw - deltaX * 0.16, -180, 180));
    setPitch(clamp(drag.current.pitch + deltaY * 0.12, -55, 55));
  };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const centreView = () => { setYaw(0); setPitch(0); };

  if (loading || profileLoading) return <div className="rrfp-loading">Loading your room…</div>;
  if (!room) return <div className="rrfp-loading"><h2>No reptile room yet</h2><p>Build your scaled room first, then come back here.</p></div>;

  return <main className="reptile-room-first-person">
    <header className="rrfp-header"><div><span className="rrfp-kicker">🏠 TINY TITANS · FIRST-PERSON ROOM</span><h1>{room.name}</h1><p>{Math.round(roomWidth)} × {Math.round(roomDepth)} × {Math.round(roomHeight)} cm · You are standing at the centre of the room.</p></div><div className="rrfp-header-actions">{rooms.length > 1 && <select value={room.id} onChange={(e) => setRoomId(e.target.value)} aria-label="Select room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<button type="button" onClick={centreView}>Centre view</button></div></header>
    {notice && <div className="rrfp-notice">{notice}</div>}
    <section className="rrfp-viewport" aria-label="First-person reptile room view" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className="rrfp-crosshair" aria-hidden="true"><span/></div>
      <div className="rrfp-hud"><strong>FIRST-PERSON</strong><span>👁 POV: room centre · eye height 165 cm</span><span>Drag left / right to look around</span><span>Drag up / down to look up / down</span><span>Tap a vivarium to inspect</span></div>
      <div className="rrfp-camera">
        <div className="rrfp-world" style={{ transform: `rotateX(${pitch}deg) rotateY(${-yaw}deg)` }}>
          <div className="rrfp-floor" style={{ width: scaledWidth, height: scaledDepth }} />
          {slots.map((slot) => <RoomBox key={slot.id} slot={slot} selected={slot.id === selectedId} onSelect={() => setSelectedId(slot.id)} unit={unit} eyeY={eyeY} room={{ x: roomWidth, y: roomHeight, z: roomDepth }} />)}
          {objects.map((object) => <FurnitureBox key={object.id} object={object} unit={unit} eyeY={eyeY} room={{ x: roomWidth, y: roomHeight, z: roomDepth }} />)}
        </div>
      </div>
    </section>
    {selected && <aside className="rrfp-inspector" aria-label="Vivarium information"><button type="button" className="rrfp-close" onClick={() => setSelectedId(null)} aria-label="Close vivarium information">×</button><span className="rrfp-inspector-kicker">VIVARIUM</span><h2>{selected.label}</h2><div className="rrfp-inspector-grid"><div><span>Occupant</span><strong>{selectedSnake ? snakeName(selectedSnake) : "Empty"}</strong></div><div><span>Dimensions</span><strong>{slotWidth(selected)} × {slotDepth(selected)} × {slotHeight(selected)} cm</strong></div><div><span>Status</span><strong>{selected.lifecycleStatus ?? (selectedSnake ? "active" : "empty")}</strong></div><div><span>Position</span><strong>{Math.round(selected.x)}, {Math.round(selected.y)}</strong></div></div><p>True room-space dimensions are now used for the first-person view.</p></aside>}
  </main>;
}
