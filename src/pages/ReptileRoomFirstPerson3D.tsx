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

function RoomBox({ slot, selected, onSelect, scale, room, eyeHeight }: { slot: ReptileRoomSlot; selected: boolean; onSelect: () => void; scale: number; room: Vec3; eyeHeight: number }) {
  const width = slotWidth(slot) * scale;
  const depth = slotDepth(slot) * scale;
  const height = slotHeight(slot) * scale;
  const x = (slot.x + slotWidth(slot) / 2 - room.x / 2) * scale - width / 2;
  const z = (slot.y + slotDepth(slot) / 2 - room.z / 2) * scale;
  const bottom = eyeHeight - ((slot.z ?? 0) + slotHeight(slot)) * scale;
  const photo = slot.photoUrl;

  return (
    <button
      type="button"
      className={`rrfp-vivarium ${selected ? "is-selected" : ""}`}
      style={{ width, height, transform: `translate3d(${x}px, ${bottom}px, ${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      aria-label={`Inspect ${slot.label}`}
    >
      <span className="rrfp-vivarium-face">
        {photo ? <img src={photo} alt="" /> : <span className="rrfp-empty">EMPTY</span>}
        <span className="rrfp-glass" />
        <span className="rrfp-door-bar" />
        <span className="rrfp-label">{slot.label}</span>
      </span>
      <span className="rrfp-vivarium-top" />
      <span className="rrfp-vivarium-side" />
    </button>
  );
}

function FurnitureBox({ object, scale, room, eyeHeight }: { object: NonNullable<ReptileRoomWorkspace["objects"]>[number]; scale: number; room: Vec3; eyeHeight: number }) {
  const width = object.width * scale;
  const depth = object.depth * scale;
  const height = object.height * scale;
  const x = (object.x + object.width / 2 - room.x / 2) * scale - width / 2;
  const z = (object.y + object.depth / 2 - room.z / 2) * scale;
  const bottom = eyeHeight - (object.z + object.height) * scale;

  return <div className={`rrfp-furniture rrfp-kind-${object.kind}`} style={{ width, height, transform: `translate3d(${x}px, ${bottom}px, ${z}px)`, ["--rrfp-depth" as string]: `${depth}px` }} aria-hidden="true">
    <span className="rrfp-furniture-face">{object.label}</span>
    <span className="rrfp-furniture-top" />
    <span className="rrfp-furniture-side" />
  </div>;
}

export default function ReptileRoomFirstPerson3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [yaw, setYaw] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const drag = useRef<{ x: number; yaw: number } | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const selectedSnake = selected?.snakeId ? snakeMap.get(selected.snakeId) : undefined;

  const roomWidth = Math.max(100, room?.width ?? 490);
  const roomDepth = Math.max(100, room?.depth ?? 315);
  const roomHeight = Math.max(100, room?.height ?? 245);
  const roomVec: Vec3 = { x: roomWidth, y: roomHeight, z: roomDepth };
  const scale = clamp(1.05 - Math.max(roomWidth, roomDepth) / 1800, 0.55, 0.9);
  const scaledWidth = roomWidth * scale;
  const scaledDepth = roomDepth * scale;
  const scaledHeight = roomHeight * scale;
  const eyeHeight = clamp(165 * scale, scaledHeight * 0.45, scaledHeight * 0.72);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms);
      setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, yaw };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setYaw(clamp(drag.current.yaw - (event.clientX - drag.current.x) * 0.16, -180, 180));
  };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (loading || profileLoading) return <div className="rrfp-loading">Loading your room…</div>;
  if (!room) return <div className="rrfp-loading"><h2>No reptile room yet</h2><p>Build your scaled room first, then come back here.</p></div>;

  return (
    <main className="reptile-room-first-person">
      <header className="rrfp-header">
        <div><span className="rrfp-kicker">🏠 TINY TITANS · FIRST-PERSON ROOM</span><h1>{room.name}</h1><p>{Math.round(roomWidth)} × {Math.round(roomDepth)} × {Math.round(roomHeight)} cm · true room scale · camera at exact room centre · eye height 165 cm</p></div>
        <div className="rrfp-header-actions">
          {rooms.length > 1 && <select value={room.id} onChange={(event) => setRoomId(event.target.value)} aria-label="Select room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
          <button type="button" onClick={() => setYaw(0)}>Centre view</button>
        </div>
      </header>
      {notice && <div className="rrfp-notice">{notice}</div>}

      <section className="rrfp-viewport" aria-label="First-person reptile room view" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <div className="rrfp-crosshair" aria-hidden="true"><span /></div>
        <div className="rrfp-hud"><strong>FIRST-PERSON · TRUE ROOM CENTRE</strong><span>Camera is physically at the room centre.</span><span>Drag left / right to look around.</span><span>Tap a vivarium to inspect.</span></div>

        <div className="rrfp-camera" style={{ transform: `rotateY(${yaw}deg)` }}>
          <div className="rrfp-world">
            <div className="rrfp-floor" style={{ width: scaledWidth, height: scaledDepth, transform: `translate(-50%, ${eyeHeight}px) rotateX(90deg)` }} />
            <div className="rrfp-wall rrfp-wall-back" style={{ width: scaledWidth, height: scaledHeight, transform: `translate(-50%, ${eyeHeight - scaledHeight / 2}px) translateZ(${-scaledDepth / 2}px)` }} />
            <div className="rrfp-wall rrfp-wall-front" style={{ width: scaledWidth, height: scaledHeight, transform: `translate(-50%, ${eyeHeight - scaledHeight / 2}px) translateZ(${scaledDepth / 2}px) rotateY(180deg)` }} />
            <div className="rrfp-wall rrfp-wall-left" style={{ width: scaledDepth, height: scaledHeight, transform: `translate(-50%, ${eyeHeight - scaledHeight / 2}px) translateX(${-scaledWidth / 2}px) rotateY(90deg)` }} />
            <div className="rrfp-wall rrfp-wall-right" style={{ width: scaledDepth, height: scaledHeight, transform: `translate(-50%, ${eyeHeight - scaledHeight / 2}px) translateX(${scaledWidth / 2}px) rotateY(-90deg)` }} />
            <div className="rrfp-ceiling" style={{ width: scaledWidth, height: scaledDepth, transform: `translate(-50%, ${eyeHeight - scaledHeight}px) rotateX(90deg)` }} />
            {slots.map((slot) => <RoomBox key={slot.id} slot={slot} selected={slot.id === selectedId} onSelect={() => setSelectedId(slot.id)} scale={scale} room={roomVec} eyeHeight={eyeHeight} />)}
            {objects.map((object) => <FurnitureBox key={object.id} object={object} scale={scale} room={roomVec} eyeHeight={eyeHeight} />)}
          </div>
        </div>
      </section>

      {selected && <aside className="rrfp-inspector" aria-label="Vivarium information">
        <button type="button" className="rrfp-close" onClick={() => setSelectedId(null)} aria-label="Close vivarium information">×</button>
        <span className="rrfp-inspector-kicker">VIVARIUM</span><h2>{selected.label}</h2>
        <div className="rrfp-inspector-grid"><div><span>Occupant</span><strong>{selectedSnake ? snakeName(selectedSnake) : "Empty"}</strong></div><div><span>Dimensions</span><strong>{slotWidth(selected)} × {slotDepth(selected)} × {slotHeight(selected)} cm</strong></div><div><span>Status</span><strong>{selected.lifecycleStatus ?? (selectedSnake ? "active" : "empty")}</strong></div><div><span>Position</span><strong>{Math.round(selected.x)}, {Math.round(selected.y)}</strong></div></div>
        <p>First-person camera is anchored to the exact centre of the scaled room. The room geometry is positioned around that fixed point rather than moving the camera toward a vivarium.</p>
      </aside>}
    </main>
  );
}
