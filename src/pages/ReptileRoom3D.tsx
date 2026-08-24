import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { clamp, snapNumber, stackZ, worldSize } from "../services/reptileRoomSpatialService";
import type { Snake } from "../types/Snake";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room-3d.css";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function slotSnake(slot: ReptileRoomSlot, snakes: Map<string, Snake>) {
  return slot.snakeId ? snakes.get(slot.snakeId) ?? null : null;
}

function Box3D({ width, depth, height, className = "", label }: { width: number; depth: number; height: number; className?: string; label: string }) {
  return <div className={`rr3d-box ${className}`} style={{ width, height: depth }} aria-label={label}>
    <span className="rr3d-face rr3d-top" style={{ width, height: depth }} />
    <span className="rr3d-face rr3d-front" style={{ width, height }} />
    <span className="rr3d-face rr3d-right" style={{ width: depth, height }} />
  </div>;
}

export default function ReptileRoom3D() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<{ type: "slot" | "object"; id: string } | null>(null);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [yaw, setYaw] = useState(-32);
  const [pitch, setPitch] = useState(56);
  const [zoom, setZoom] = useState(0.78);
  const orbitRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const dragRef = useRef<{ type: "slot" | "object"; id: string; x: number; y: number } | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const width = Math.max(100, room?.width ?? 300);
  const depth = Math.max(100, room?.depth ?? 250);
  const height = Math.max(100, room?.height ?? 240);
  const worldScale = Math.min(3.2, Math.max(1.15, 820 / Math.max(width, depth)));
  const roomPxWidth = width * worldScale;
  const roomPxDepth = depth * worldScale;
  const roomPxHeight = height * worldScale;

  const persist = useCallback(async (next: ReptileRoomWorkspace[], message?: string) => {
    const stamped = next.map((item) => ({ ...item, roomVersion: Math.max(2, item.roomVersion ?? 2), updatedAt: new Date().toISOString() }));
    setRooms(stamped);
    if (!user) return;
    setSaving(true);
    try { await saveReptileRooms(user.uid, stamped); if (message) setNotice(message); }
    catch { setNotice("Saved locally. Cloud sync failed, but your room is safe on this device."); }
    finally { setSaving(false); }
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedSnakes, loadedRooms] = await Promise.all([getUserSnakes(user.uid), loadReptileRooms(user.uid)]);
      setSnakes(loadedSnakes);
      setRooms(loadedRooms);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load the 3D reptile room."); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateRoom = useCallback((fn: (current: ReptileRoomWorkspace) => ReptileRoomWorkspace, message?: string) => {
    if (!room) return;
    void persist(rooms.map((item) => item.id === room.id ? fn(item) : item), message);
  }, [persist, room, rooms]);

  const snapVivarium = useCallback((current: ReptileRoomWorkspace, moving: ReptileRoomSlot): ReptileRoomSlot => {
    const gap = 5;
    const threshold = 10;
    let best = { ...moving, x: clamp(snapNumber(moving.x), 0, Math.max(0, width - moving.w)), y: clamp(snapNumber(moving.y), 0, Math.max(0, depth - moving.h)) };
    let bestDistance = threshold;
    for (const other of current.slots) {
      if (other.id === moving.id || other.z !== moving.z) continue;
      const verticalOverlap = moving.y < other.y + other.h + threshold && moving.y + moving.h > other.y - threshold;
      const horizontalOverlap = moving.x < other.x + other.w + threshold && moving.x + moving.w > other.x - threshold;
      const candidates = verticalOverlap ? [
        { x: other.x + other.w + gap, y: moving.y },
        { x: other.x - moving.w - gap, y: moving.y },
      ] : [];
      const sideCandidates = horizontalOverlap ? [
        { x: moving.x, y: other.y + other.h + gap },
        { x: moving.x, y: other.y - moving.h - gap },
      ] : [];
      for (const candidate of [...candidates, ...sideCandidates]) {
        const distance = Math.hypot(candidate.x - moving.x, candidate.y - moving.y);
        if (distance < bestDistance) { best = { ...best, x: candidate.x, y: candidate.y }; bestDistance = distance; }
      }
    }
    return { ...best, x: clamp(best.x, 0, Math.max(0, width - best.w)), y: clamp(best.y, 0, Math.max(0, depth - best.h)) };
  }, [depth, width]);

  function beginOrbit(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".rr3d-interactive")) return;
    orbitRef.current = { x: event.clientX, y: event.clientY, yaw, pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function orbitMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!orbitRef.current) return;
    const origin = orbitRef.current;
    setYaw(origin.yaw + (event.clientX - origin.x) * 0.32);
    setPitch(clamp(origin.pitch - (event.clientY - origin.y) * 0.22, 38, 74));
  }

  function endOrbit(event: ReactPointerEvent<HTMLDivElement>) {
    if (orbitRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    orbitRef.current = null;
  }

  function zoomWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((value) => clamp(value - event.deltaY * 0.00055, 0.48, 1.35));
  }

  function beginItemDrag(event: ReactPointerEvent<HTMLElement>, type: "slot" | "object", itemId: string) {
    if (!editing || !room) return;
    event.preventDefault(); event.stopPropagation();
    setSelected({ type, id: itemId });
    dragRef.current = { type, id: itemId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function itemDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || !room) return;
    const dx = (event.clientX - drag.x) / (worldScale * zoom);
    const dy = (event.clientY - drag.y) / (worldScale * zoom);
    drag.x = event.clientX; drag.y = event.clientY;
    setRooms((currentRooms) => currentRooms.map((item) => {
      if (item.id !== room.id) return item;
      if (drag.type === "slot") {
        const moving = item.slots.find((slot) => slot.id === drag.id);
        if (!moving) return item;
        const moved = { ...moving, x: moving.x + dx, y: moving.y + dy };
        return { ...item, slots: item.slots.map((slot) => slot.id === drag.id ? snapVivarium(item, moved) : slot) };
      }
      return { ...item, objects: (item.objects ?? []).map((object) => object.id === drag.id ? { ...object, x: clamp(object.x + dx, 0, Math.max(0, width - worldSize(object).w)), y: clamp(object.y + dy, 0, Math.max(0, depth - worldSize(object).d)) } : object) };
    }));
  }

  function endItemDrag() {
    if (!dragRef.current) return;
    dragRef.current = null;
    void persist(rooms);
  }

  function stackSelected() {
    if (!room || selected?.type !== "slot") return;
    const moving = room.slots.find((slot) => slot.id === selected.id);
    if (!moving) return;
    const lower = room.slots.filter((slot) => Math.abs(slot.x - moving.x) < 2 && Math.abs(slot.y - moving.y) < 2 && slot.id !== moving.id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).at(-1);
    if (!lower) return setNotice("Move the vivarium directly over another vivarium before stacking.");
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === moving.id ? { ...slot, z: stackZ(lower), stackGroupId: lower.stackGroupId ?? id("stack"), stackIndex: (lower.stackIndex ?? 0) + 1, parentSlotId: lower.id } : slot) }), "Vivarium stacked in 3D.");
  }

  function floorSelected() {
    if (!room || selected?.type !== "slot") return;
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, z: 0, stackGroupId: null, stackIndex: 0, parentSlotId: null } : slot) }), "Vivarium returned to floor.");
  }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><div className="rr3d-loading">Loading your 3D reptile room…</div></div>;
  if (!room) return <div className="page-container"><BackHomeButton /><div className="rr3d-loading">No reptile room exists yet. Open the 2D builder to create one.</div></div>;

  const sceneStyle = {
    width: roomPxWidth,
    height: roomPxDepth,
    transform: `scale(${zoom}) rotateX(${pitch}deg) rotateZ(${yaw}deg)`,
  };

  return <div className="page-container reptile-room-3d">
    <BackHomeButton />
    <header className="rr3d-header">
      <div><span className="rr3d-kicker">🏠 TINY TITANS · ROOM SIM</span><h1>{room.name}</h1><p>Walk around your reptile room in a lightweight 3D builder. Vivariums keep their real enclosure dimensions, snake assignments and room positions.</p></div>
      <div className="rr3d-header-actions"><button type="button" className={editing ? "rr3d-primary" : ""} onClick={() => setEditing((value) => !value)}>{editing ? "🔒 Finish arranging" : "✏ Arrange room"}</button><button type="button" onClick={() => { setYaw(-32); setPitch(56); setZoom(0.78); }}>↺ Reset camera</button></div>
    </header>
    {notice && <div className="rr3d-notice" role="status">{notice}</div>}
    <section className="rr3d-toolbar">
      <div className="rr3d-room-tabs">{rooms.map((item) => <button key={item.id} type="button" className={item.id === room.id ? "is-active" : ""} onClick={() => { setRoomId(item.id); setSelected(null); }}>{item.name}</button>)}</div>
      <div className="rr3d-controls"><button type="button" onClick={() => setZoom((value) => clamp(value + 0.08, 0.48, 1.35))}>＋</button><button type="button" onClick={() => setZoom((value) => clamp(value - 0.08, 0.48, 1.35))}>−</button><button type="button" onClick={stackSelected} disabled={selected?.type !== "slot"}>⬆ Stack</button><button type="button" onClick={floorSelected} disabled={selected?.type !== "slot"}>↕ Floor</button><span>{saving ? "⟳ Saving…" : "✓ Saved"}</span></div>
    </section>
    <main className="rr3d-layout">
      <section className="rr3d-stage" onPointerDown={beginOrbit} onPointerMove={orbitMove} onPointerUp={endOrbit} onPointerCancel={endOrbit} onWheel={zoomWheel}>
        <div className="rr3d-scene" style={sceneStyle}>
          <div className="rr3d-floor" style={{ width: roomPxWidth, height: roomPxDepth }}>
            {Array.from({ length: Math.ceil(width / 50) + 1 }).map((_, index) => <i key={`gx-${index}`} className="rr3d-grid-x" style={{ left: index * 50 * worldScale }} />)}
            {Array.from({ length: Math.ceil(depth / 50) + 1 }).map((_, index) => <i key={`gy-${index}`} className="rr3d-grid-y" style={{ top: index * 50 * worldScale }} />)}
          </div>
          <div className="rr3d-wall rr3d-wall-north" style={{ width: roomPxWidth, height: roomPxHeight }} />
          <div className="rr3d-wall rr3d-wall-west" style={{ width: roomPxDepth, height: roomPxHeight }} />
          <div className="rr3d-ceiling" style={{ width: roomPxWidth, height: roomPxDepth, transform: `translateZ(${roomPxHeight}px)` }} />
          {slots.map((slot) => {
            const snake = slotSnake(slot, snakesById);
            const selectedNow = selected?.type === "slot" && selected.id === slot.id;
            const w = slot.w * worldScale; const d = slot.h * worldScale; const h = (slot.height ?? 30) * worldScale; const z = (slot.z ?? 0) * worldScale;
            return <div key={slot.id} className={`rr3d-asset rr3d-vivarium ${selectedNow ? "is-selected" : ""} ${slot.snakeId ? "is-occupied" : "is-empty"} rr3d-interactive`} style={{ left: slot.x * worldScale, top: slot.y * worldScale, width: w, height: d, transform: `translateZ(${z}px)` }} onPointerDown={(event) => beginItemDrag(event, "slot", slot.id)} onPointerMove={itemDrag} onPointerUp={endItemDrag} onPointerCancel={endItemDrag}>
              <Box3D width={w} depth={d} height={h} label={snake ? `${snake.name}'s vivarium` : slot.label} />
              <span className="rr3d-label">{snake?.name ?? slot.label}<small>{slot.snakeId ? "Occupied" : "Empty"} · {Math.round(slot.z ?? 0)}cm</small></span>
            </div>;
          })}
          {objects.map((object: ReptileRoomObject) => {
            const selectedNow = selected?.type === "object" && selected.id === object.id;
            const size = worldSize(object); const w = size.w * worldScale; const d = size.d * worldScale; const h = object.height * worldScale; const z = (object.z ?? 0) * worldScale;
            return <div key={object.id} className={`rr3d-asset rr3d-object rr3d-interactive ${selectedNow ? "is-selected" : ""}`} style={{ left: object.x * worldScale, top: object.y * worldScale, width: w, height: d, transform: `translateZ(${z}px) rotateZ(${object.rotation ?? 0}deg)` }} onPointerDown={(event) => beginItemDrag(event, "object", object.id)} onPointerMove={itemDrag} onPointerUp={endItemDrag} onPointerCancel={endItemDrag}>
              <Box3D width={w} depth={d} height={h} label={object.label} />
              <span className="rr3d-label">{object.kind === "door" ? "🚪" : object.kind === "window" ? "🪟" : object.kind === "vent" ? "🌬" : "▦"} {object.label}</span>
            </div>;
          })}
        </div>
        <div className="rr3d-hud"><strong>3D ROOM</strong><span>Drag empty space to orbit · Wheel to zoom · Drag an asset to move it</span></div>
      </section>
      <aside className="rr3d-inspector">
        <div className="rr3d-inspector-title"><span>SELECTED ASSET</span><h2>{selected?.type === "slot" ? (slotSnake(slots.find((item) => item.id === selected.id)!, snakesById)?.name ?? slots.find((item) => item.id === selected.id)?.label ?? "Vivarium") : selected?.type === "object" ? objects.find((item) => item.id === selected.id)?.label ?? "Object" : "Nothing selected"}</h2></div>
        {selected?.type === "slot" && (() => { const slot = slots.find((item) => item.id === selected.id); if (!slot) return null; const snake = slotSnake(slot, snakesById); return <><div className="rr3d-stat"><span>Snake</span><strong>{snake?.name ?? "Unassigned"}</strong></div><div className="rr3d-stat"><span>Position</span><strong>{Math.round(slot.x)} × {Math.round(slot.y)} × {Math.round(slot.z ?? 0)} cm</strong></div><div className="rr3d-stat"><span>Size</span><strong>{Math.round(slot.w)} × {Math.round(slot.h)} × {Math.round(slot.height ?? 30)} cm</strong></div><p>Enclosure dimensions and snake data stay with the snake/enclosure. This 3D room only owns physical placement.</p></>; })()}
        {selected?.type === "object" && (() => { const object = objects.find((item) => item.id === selected.id); if (!object) return null; return <><div className="rr3d-stat"><span>Object</span><strong>{object.label}</strong></div><div className="rr3d-stat"><span>Position</span><strong>{Math.round(object.x)} × {Math.round(object.y)} × {Math.round(object.z ?? 0)} cm</strong></div><div className="rr3d-stat"><span>Size</span><strong>{Math.round(object.width)} × {Math.round(object.depth)} × {Math.round(object.height)} cm</strong></div></>; })()}
        {!selected && <p>Select a vivarium or room asset. The room is deliberately physical: the snake record stays attached to the enclosure while the room controls where that enclosure lives.</p>}
      </aside>
    </main>
  </div>;
}
