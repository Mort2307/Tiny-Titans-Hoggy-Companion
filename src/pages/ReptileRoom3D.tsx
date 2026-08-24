import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { clamp, snapNumber, stackZ, worldSize } from "../services/reptileRoomSpatialService";
import type { Snake } from "../types/Snake";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room-3d.css";

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
type SelectedAsset = { type: "slot" | "object"; id: string } | null;
type FurniturePreset = { kind: ReptileFurnitureKind | "vivarium"; label: string; icon: string; width: number; depth: number; height: number };
const FURNITURE: FurniturePreset[] = [
  { kind: "vivarium", label: "Vivarium", icon: "🦎", width: 100, depth: 50, height: 45 },
  { kind: "rack", label: "Rack", icon: "▤", width: 100, depth: 55, height: 180 },
  { kind: "shelving", label: "Shelving", icon: "▥", width: 90, depth: 40, height: 160 },
  { kind: "table", label: "Table", icon: "▱", width: 120, depth: 60, height: 75 },
  { kind: "sofa", label: "Sofa", icon: "🛋️", width: 160, depth: 80, height: 80 },
  { kind: "chair", label: "Chair", icon: "🪑", width: 55, depth: 55, height: 85 },
  { kind: "workbench", label: "Workbench", icon: "🔧", width: 140, depth: 65, height: 90 },
  { kind: "storage-cabinet", label: "Cabinet", icon: "🗄️", width: 90, depth: 50, height: 120 },
  { kind: "plant", label: "Plant", icon: "🪴", width: 45, depth: 45, height: 100 },
  { kind: "lamp", label: "Lamp", icon: "💡", width: 35, depth: 35, height: 150 },
  { kind: "equipment-station", label: "Equipment", icon: "⚡", width: 90, depth: 50, height: 80 },
];
function getSnakeLabel(snake: Snake) { const value = snake as Snake & { name?: string; displayName?: string }; return value.name ?? value.displayName ?? "Unnamed Hoggy"; }
function slotSnake(slot: ReptileRoomSlot, snakes: Map<string, Snake>) { return slot.snakeId ? snakes.get(slot.snakeId) ?? null : null; }
function Box3D({ width, depth, height, className = "", label }: { width: number; depth: number; height: number; className?: string; label: string }) {
  return <div className={`rr3d-box ${className}`} style={{ width, height: depth, ["--rr3d-height" as string]: `${height}px` }} aria-label={label}><span className="rr3d-face rr3d-top" style={{ width, height: depth }} /><span className="rr3d-face rr3d-front" style={{ width, height }} /><span className="rr3d-face rr3d-right" style={{ width: depth, height }} /></div>;
}

export default function ReptileRoom3D() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<SelectedAsset>(null);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [yaw, setYaw] = useState(-28);
  const [pitch, setPitch] = useState(58);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 10 });
  const orbitRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const dragRef = useRef<{ type: "slot" | "object"; id: string; x: number; y: number } | null>(null);
  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedItem = selected && room ? selected.type === "slot" ? room.slots.find((item) => item.id === selected.id) ?? null : (room.objects ?? []).find((item) => item.id === selected.id) ?? null : null;
  const width = Math.max(100, room?.width ?? 490);
  const depth = Math.max(100, room?.depth ?? 315);
  const height = Math.max(100, room?.height ?? 245);
  const scale = Math.min(1.75, Math.max(1.05, 760 / Math.max(width, depth)));
  const roomW = width * scale;
  const roomD = depth * scale;
  const roomH = height * scale;

  const persist = useCallback(async (next: ReptileRoomWorkspace[], message?: string) => {
    const stamped = next.map((item) => ({ ...item, roomVersion: Math.max(3, item.roomVersion ?? 3), updatedAt: new Date().toISOString() }));
    setRooms(stamped);
    if (!user) return;
    setSaving(true);
    try { await saveReptileRooms(user.uid, stamped); if (message) setNotice(message); } catch { setNotice("Saved locally. Cloud sync failed, but the room is still safe on this device."); } finally { setSaving(false); }
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedSnakes, loadedRooms] = await Promise.all([getUserSnakes(user.uid), loadReptileRooms(user.uid)]);
      setSnakes(loadedSnakes);
      setRooms(loadedRooms);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load the reptile room."); }
  }, [user]);
  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateRoom = useCallback((fn: (current: ReptileRoomWorkspace) => ReptileRoomWorkspace, message?: string) => {
    if (!room) return;
    void persist(rooms.map((item) => item.id === room.id ? fn(item) : item), message);
  }, [persist, room, rooms]);

  const addAsset = useCallback((preset: FurniturePreset) => {
    if (!room) return;
    const x = clamp(snapNumber((width - preset.width) / 2), 0, Math.max(0, width - preset.width));
    const y = clamp(snapNumber((depth - preset.depth) / 2), 0, Math.max(0, depth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot: ReptileRoomSlot = { id: makeId("viv"), snakeId: null, label: "New Vivarium", x, y, z: 0, w: preset.width, h: preset.depth, depth: preset.depth, height: preset.height, lifecycleStatus: "empty", condition: "good", availability: "available", stackGroupId: null, stackIndex: 0, parentSlotId: null };
      updateRoom((current) => ({ ...current, slots: [...current.slots, slot] }), "Vivarium added to the room.");
      setSelected({ type: "slot", id: slot.id });
      return;
    }
    const object: ReptileRoomObject = { id: makeId(preset.kind), kind: preset.kind, label: preset.label, x, y, z: 0, width: preset.width, depth: preset.depth, height: preset.height, rotation: 0, wall: null };
    updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), object] }), `${preset.label} added.`);
    setSelected({ type: "object", id: object.id });
  }, [depth, room, updateRoom, width]);

  function removeSelected() {
    if (!room || !selected) return;
    updateRoom((current) => selected.type === "slot" ? { ...current, slots: current.slots.filter((item) => item.id !== selected.id) } : { ...current, objects: (current.objects ?? []).filter((item) => item.id !== selected.id) }, "Asset removed.");
    setSelected(null);
  }
  function rotateSelected() {
    if (!room || !selected || selected.type !== "object") return;
    updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((item) => item.id === selected.id ? { ...item, rotation: (item.rotation + 90) % 360 } : item) }), "Object rotated.");
  }
  function assignSnake(snakeId: string) {
    if (!room || selected?.type !== "slot") return;
    const snake = snakeId ? snakesById.get(snakeId) : null;
    updateRoom((current) => ({ ...current, slots: current.slots.map((item) => item.id === selected.id ? { ...item, snakeId: snakeId || null, label: snake ? `${getSnakeLabel(snake)}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snakeId ? "active" : "empty", availability: snakeId ? "occupied" : "available" } : item) }), snake ? `${getSnakeLabel(snake)} assigned to the vivarium.` : "Vivarium cleared.");
  }

  function beginOrbit(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".rr3d-interactive")) return;
    if (event.button === 1) { panRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); return; }
    orbitRef.current = { x: event.clientX, y: event.clientY, yaw, pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function orbitMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (panRef.current) { const origin = panRef.current; setPan({ x: origin.panX + event.clientX - origin.x, y: origin.panY + event.clientY - origin.y }); return; }
    if (!orbitRef.current) return;
    const origin = orbitRef.current;
    setYaw(origin.yaw + (event.clientX - origin.x) * 0.35);
    setPitch(clamp(origin.pitch - (event.clientY - origin.y) * 0.22, 35, 78));
  }
  function endOrbit(event: ReactPointerEvent<HTMLDivElement>) { if (orbitRef.current || panRef.current) event.currentTarget.releasePointerCapture(event.pointerId); orbitRef.current = null; panRef.current = null; }
  function zoomWheel(event: WheelEvent<HTMLDivElement>) { event.preventDefault(); setZoom((value) => clamp(value - event.deltaY * 0.00055, 0.45, 1.5)); }
  function beginDrag(event: ReactPointerEvent<HTMLElement>, type: "slot" | "object", itemId: string) {
    if (!editing) return;
    event.preventDefault(); event.stopPropagation(); setSelected({ type, id: itemId }); dragRef.current = { type, id: itemId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current; if (!drag || !room) return;
    const dx = (event.clientX - drag.x) / (scale * zoom); const dy = (event.clientY - drag.y) / (scale * zoom); drag.x = event.clientX; drag.y = event.clientY;
    setRooms((current) => current.map((item) => {
      if (item.id !== room.id) return item;
      if (drag.type === "slot") return { ...item, slots: item.slots.map((slot) => slot.id === drag.id ? { ...slot, x: clamp(snapNumber(slot.x + dx), 0, Math.max(0, width - slot.w)), y: clamp(snapNumber(slot.y + dy), 0, Math.max(0, depth - slot.h)) } : slot) };
      return { ...item, objects: (item.objects ?? []).map((object) => object.id === drag.id ? { ...object, x: clamp(snapNumber(object.x + dx), 0, Math.max(0, width - worldSize(object).w)), y: clamp(snapNumber(object.y + dy), 0, Math.max(0, depth - worldSize(object).d)) } : object) };
    }));
  }
  function endDrag() { if (!dragRef.current) return; dragRef.current = null; setRooms((current) => { void persist(current); return current; }); }
  function stackSelected() {
    if (!room || selected?.type !== "slot") return;
    const moving = room.slots.find((slot) => slot.id === selected.id); if (!moving) return;
    const lower = room.slots.filter((slot) => slot.id !== moving.id && Math.abs(slot.x - moving.x) < 4 && Math.abs(slot.y - moving.y) < 4).sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).at(-1);
    if (!lower) return setNotice("Put the vivarium directly over another vivarium first.");
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === moving.id ? { ...slot, z: stackZ(lower), stackGroupId: lower.stackGroupId ?? makeId("stack"), stackIndex: (lower.stackIndex ?? 0) + 1, parentSlotId: lower.id } : slot) }), "Vivarium stacked.");
  }
  function floorSelected() { if (!room || selected?.type !== "slot") return; updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selected.id ? { ...slot, z: 0, stackGroupId: null, stackIndex: 0, parentSlotId: null } : slot) }), "Vivarium returned to floor."); }
  function toggleCeiling() { updateRoom((current) => ({ ...current, ceilingVisible: current.ceilingVisible === false }), "Ceiling visibility updated."); }
  function resetCamera() { setYaw(-28); setPitch(58); setZoom(0.9); setPan({ x: 0, y: 10 }); }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><div className="rr3d-loading">Loading your reptile room…</div></div>;
  if (!room) return <div className="page-container"><BackHomeButton /><div className="rr3d-empty"><strong>No room loaded.</strong><p>Switch to 2D Builder to create a room, then return to 3D.</p></div></div>;

  return <div className="page-container reptile-room-3d">
    <BackHomeButton />
    <header className="rr3d-header">
      <div><span className="rr3d-kicker">🏠 TINY TITANS · ROOM SIM</span><h1>Build {room.name}</h1><p>{Math.round(width)} × {Math.round(depth)} × {Math.round(height)} cm · {slots.length} vivariums · {objects.length} room objects</p></div>
      <div className="rr3d-header-actions"><label className="rr3d-room-picker">Room <select value={room.id} onChange={(event) => { setRoomId(event.target.value); setSelected(null); }}>{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className={editing ? "rr3d-primary" : ""} onClick={() => setEditing((value) => !value)}>{editing ? "🔒 Finish arranging" : "✏ Arrange room"}</button><button type="button" onClick={resetCamera}>↺ Reset</button></div>
    </header>
    {notice && <div className="rr3d-notice" role="status">{notice}</div>}
    <section className="rr3d-toolbar"><div className="rr3d-toolbar-left"><strong>Furniture & assets</strong><span>{editing ? "Drag anything in the room. Click to inspect." : "View mode"}</span></div><div className="rr3d-controls"><button type="button" onClick={() => setZoom((value) => clamp(value + 0.08, 0.45, 1.5))}>＋</button><button type="button" onClick={() => setZoom((value) => clamp(value - 0.08, 0.45, 1.5))}>−</button><button type="button" onClick={() => setPan({ x: 0, y: 10 })}>⌖ Center</button><button type="button" onClick={toggleCeiling}>☁ {room.ceilingVisible === false ? "Show ceiling" : "Hide ceiling"}</button><button type="button" onClick={stackSelected} disabled={selected?.type !== "slot"}>⬆ Stack</button><button type="button" onClick={floorSelected} disabled={selected?.type !== "slot"}>↕ Floor</button><span>{saving ? "⟳ Saving…" : "✓ Saved"}</span></div></section>
    <section className="rr3d-furniture-bar" aria-label="Room furniture catalogue">{FURNITURE.map((preset) => <button key={preset.kind} type="button" onClick={() => addAsset(preset)} disabled={!editing} title={`Add ${preset.label}`}><b>{preset.icon}</b><span>{preset.label}</span></button>)}</section>
    <main className="rr3d-layout">
      <section className="rr3d-stage" onPointerDown={beginOrbit} onPointerMove={orbitMove} onPointerUp={endOrbit} onPointerCancel={endOrbit} onWheel={zoomWheel}>
        <div className="rr3d-camera"><div className="rr3d-scene" style={{ width: roomW, height: roomD, transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${zoom}) rotateX(${pitch}deg) rotateY(${yaw}deg)` }}>
          <div className="rr3d-floor" style={{ width: roomW, height: roomD }}>{Array.from({ length: Math.ceil(width / 50) + 1 }).map((_, index) => <i key={`gx-${index}`} className="rr3d-grid-x" style={{ left: index * 50 * scale }} />)}{Array.from({ length: Math.ceil(depth / 50) + 1 }).map((_, index) => <i key={`gy-${index}`} className="rr3d-grid-y" style={{ top: index * 50 * scale }} />)}</div>
          <div className="rr3d-wall rr3d-wall-north" style={{ width: roomW, height: roomH }} /><div className="rr3d-wall rr3d-wall-south" style={{ width: roomW, height: roomH }} /><div className="rr3d-wall rr3d-wall-west" style={{ width: roomD, height: roomH }} /><div className="rr3d-wall rr3d-wall-east" style={{ width: roomD, height: roomH }} />
          {room.ceilingVisible !== false && <div className="rr3d-ceiling" style={{ width: roomW, height: roomD, transform: `translateZ(${roomH}px)` }} />}
          {(room.objects ?? []).map((object) => { const size = worldSize(object); const selectedNow = selected?.type === "object" && selected.id === object.id; return <div key={object.id} className={`rr3d-asset rr3d-object rr3d-interactive rr3d-kind-${object.kind} ${selectedNow ? "is-selected" : ""}`} style={{ left: object.x * scale, top: object.y * scale, width: size.w * scale, height: size.d * scale, transform: `translateZ(${object.z * scale}px) rotateZ(${object.rotation}deg)` }} onPointerDown={(event) => beginDrag(event, "object", object.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={(event) => { event.stopPropagation(); setSelected({ type: "object", id: object.id }); }}><Box3D width={size.w * scale} depth={size.d * scale} height={object.height * scale} label={object.label} /><span className="rr3d-label">{object.label}</span></div>; })}
          {room.slots.map((slot) => { const selectedNow = selected?.type === "slot" && selected.id === slot.id; const snake = slotSnake(slot, snakesById); const w = slot.w * scale; const d = (slot.depth ?? slot.h) * scale; const h = (slot.height ?? 45) * scale; const z = (slot.z ?? 0) * scale; return <div key={slot.id} className={`rr3d-asset rr3d-vivarium rr3d-interactive ${slot.snakeId ? "is-occupied" : "is-empty"} ${selectedNow ? "is-selected" : ""}`} style={{ left: slot.x * scale, top: slot.y * scale, width: w, height: d, transform: `translateZ(${z}px)` }} onPointerDown={(event) => beginDrag(event, "slot", slot.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={(event) => { event.stopPropagation(); setSelected({ type: "slot", id: slot.id }); }}><Box3D width={w} depth={d} height={h} className="rr3d-vivarium-box" label={slot.label} /><span className="rr3d-label">{snake ? getSnakeLabel(snake) : slot.label}<small>{Math.round(slot.w)} × {Math.round(slot.depth ?? slot.h)} × {Math.round(slot.height ?? 45)} cm</small></span></div>; })}
        </div></div>
        <div className="rr3d-hud"><strong>3D ROOM</strong><span>Left drag: orbit</span><span>Wheel: zoom</span><span>Middle drag: pan</span><span>Drag assets to move</span></div>
      </section>
      <aside className="rr3d-inspector">
        {!selectedItem && <div><span className="rr3d-inspector-kicker">ROOM</span><h2>{room.name}</h2><div className="rr3d-stat"><span>Dimensions</span><strong>{width} × {depth} × {height} cm</strong></div><div className="rr3d-stat"><span>Vivariums</span><strong>{slots.length}</strong></div><div className="rr3d-stat"><span>Room assets</span><strong>{objects.length}</strong></div><p>Click anything in the room to select it. Use the catalogue above to build the room like a tiny reptile Sims game.</p></div>}
        {selected?.type === "slot" && selectedItem && "snakeId" in selectedItem && <div><span className="rr3d-inspector-kicker">VIVARIUM</span><h2>{selectedItem.label}</h2><label className="rr3d-field">Snake<select value={selectedItem.snakeId ?? ""} onChange={(event) => assignSnake(event.target.value)}><option value="">No snake assigned</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{getSnakeLabel(snake)}</option>)}</select></label><div className="rr3d-stat"><span>Dimensions</span><strong>{Math.round(selectedItem.w)} × {Math.round(selectedItem.depth ?? selectedItem.h)} × {Math.round(selectedItem.height ?? 45)} cm</strong></div><div className="rr3d-stat"><span>Position</span><strong>{Math.round(selectedItem.x)}, {Math.round(selectedItem.y)}, {Math.round(selectedItem.z)} cm</strong></div><div className="rr3d-inspector-actions"><button type="button" onClick={stackSelected}>⬆ Stack</button><button type="button" onClick={floorSelected}>↕ Floor</button><button type="button" className="danger" onClick={removeSelected}>Delete</button></div></div>}
        {selected?.type === "object" && selectedItem && "kind" in selectedItem && <div><span className="rr3d-inspector-kicker">OBJECT</span><h2>{selectedItem.label}</h2><div className="rr3d-stat"><span>Type</span><strong>{selectedItem.kind}</strong></div><div className="rr3d-stat"><span>Size</span><strong>{Math.round(selectedItem.width)} × {Math.round(selectedItem.depth)} × {Math.round(selectedItem.height)} cm</strong></div><div className="rr3d-stat"><span>Position</span><strong>{Math.round(selectedItem.x)}, {Math.round(selectedItem.y)}, {Math.round(selectedItem.z)} cm</strong></div><div className="rr3d-inspector-actions"><button type="button" onClick={rotateSelected}>↻ Rotate</button><button type="button" className="danger" onClick={removeSelected}>Delete</button></div></div>}
      </aside>
    </main>
  </div>;
}
