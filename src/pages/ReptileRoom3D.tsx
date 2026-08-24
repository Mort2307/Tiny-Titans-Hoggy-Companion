import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import type { Snake } from "../types/Snake";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room-3d.css";

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
type Selection = { type: "slot" | "object"; id: string } | null;
type Preset = { kind: ReptileFurnitureKind | "vivarium"; label: string; icon: string; width: number; depth: number; height: number };

const PRESETS: Preset[] = [
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snap = (value: number, grid = 5) => Math.round(value / grid) * grid;
const snakeName = (snake: Snake | undefined) => {
  if (!snake) return "Unnamed Hoggy";
  const value = snake as Snake & { name?: string; displayName?: string };
  return value.name ?? value.displayName ?? "Unnamed Hoggy";
};

function Box3D({ width, depth, height, className = "", label }: { width: number; depth: number; height: number; className?: string; label: string }) {
  return <div className={`rr3d-box ${className}`} style={{ width, height: depth, ["--box-height" as string]: `${height}px` }} aria-label={label}>
    <div className="rr3d-face rr3d-box-top" style={{ width, height: depth }} />
    <div className="rr3d-face rr3d-box-front" style={{ width, height }} />
    <div className="rr3d-face rr3d-box-right" style={{ width: depth, height }} />
  </div>;
}

export default function ReptileRoom3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<Selection>(null);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [yaw, setYaw] = useState(-28);
  const [pitch, setPitch] = useState(56);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 20 });
  const cameraRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const assetRef = useRef<{ type: "slot" | "object"; id: string; x: number; y: number } | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const snakeMap = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedItem = selected && room ? selected.type === "slot" ? slots.find((slot) => slot.id === selected.id) ?? null : objects.find((object) => object.id === selected.id) ?? null : null;

  const width = Math.max(100, room?.width ?? 490);
  const depth = Math.max(100, room?.depth ?? 315);
  const height = Math.max(100, room?.height ?? 245);
  const scale = Math.min(1.6, Math.max(0.85, 760 / Math.max(width, depth)));
  const roomW = width * scale;
  const roomD = depth * scale;
  const roomH = height * scale;

  const persist = useCallback(async (next: ReptileRoomWorkspace[], message?: string) => {
    const stamped = next.map((item) => ({ ...item, roomVersion: Math.max(3, item.roomVersion ?? 3), updatedAt: new Date().toISOString() }));
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
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms);
      setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateRoom = useCallback((fn: (room: ReptileRoomWorkspace) => ReptileRoomWorkspace, message?: string) => {
    if (!room) return;
    void persist(rooms.map((item) => item.id === room.id ? fn(item) : item), message);
  }, [persist, room, rooms]);

  const addAsset = (preset: Preset) => {
    if (!room) return;
    const x = clamp(snap((width - preset.width) / 2), 0, Math.max(0, width - preset.width));
    const y = clamp(snap((depth - preset.depth) / 2), 0, Math.max(0, depth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot: ReptileRoomSlot = { id: makeId("viv"), snakeId: null, label: "New Vivarium", x, y, z: 0, w: preset.width, h: preset.depth, depth: preset.depth, height: preset.height, lifecycleStatus: "empty", condition: "good", availability: "available", stackGroupId: null, stackIndex: 0, parentSlotId: null };
      updateRoom((current) => ({ ...current, slots: [...current.slots, slot] }), "Vivarium added.");
      setSelected({ type: "slot", id: slot.id });
      return;
    }
    const object: ReptileRoomObject = { id: makeId(preset.kind), kind: preset.kind, label: preset.label, x, y, z: 0, width: preset.width, depth: preset.depth, height: preset.height, rotation: 0, wall: null };
    updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), object] }), `${preset.label} added.`);
    setSelected({ type: "object", id: object.id });
  };

  const removeSelected = () => {
    if (!room || !selected) return;
    updateRoom((current) => selected.type === "slot" ? { ...current, slots: current.slots.filter((item) => item.id !== selected.id) } : { ...current, objects: (current.objects ?? []).filter((item) => item.id !== selected.id) }, "Asset removed.");
    setSelected(null);
  };

  const assignSnake = (snakeId: string) => {
    if (!room || selected?.type !== "slot") return;
    const snake = snakeMap.get(snakeId);
    updateRoom((current) => ({ ...current, slots: current.slots.map((item) => item.id === selected.id ? { ...item, snakeId: snakeId || null, label: snake ? `${snakeName(snake)}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snakeId ? "active" : "empty", availability: snakeId ? "occupied" : "available" } : item) }), snake ? `${snakeName(snake)} assigned.` : "Vivarium cleared.");
  };

  const beginCamera = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".rr3d-interactive")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.button === 1) panRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    else cameraRef.current = { x: event.clientX, y: event.clientY, yaw, pitch };
  };
  const moveCamera = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current) { const origin = panRef.current; setPan({ x: origin.panX + event.clientX - origin.x, y: origin.panY + event.clientY - origin.y }); return; }
    if (!cameraRef.current) return;
    const origin = cameraRef.current;
    setYaw(origin.yaw + (event.clientX - origin.x) * 0.32);
    setPitch(clamp(origin.pitch - (event.clientY - origin.y) * 0.2, 25, 78));
  };
  const endCamera = (event: ReactPointerEvent<HTMLDivElement>) => { try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ } cameraRef.current = null; panRef.current = null; };
  const wheel = (event: WheelEvent<HTMLDivElement>) => { event.preventDefault(); setZoom((value) => clamp(value - event.deltaY * 0.00055, 0.45, 1.5)); };

  const beginAsset = (event: ReactPointerEvent<HTMLDivElement>, type: "slot" | "object", itemId: string) => {
    if (!editing) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    setSelected({ type, id: itemId }); assetRef.current = { type, id: itemId, x: event.clientX, y: event.clientY };
  };
  const moveAsset = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = assetRef.current; if (!drag || !room) return;
    const dx = (event.clientX - drag.x) / (scale * zoom); const dy = (event.clientY - drag.y) / (scale * zoom); drag.x = event.clientX; drag.y = event.clientY;
    setRooms((current) => current.map((item) => {
      if (item.id !== room.id) return item;
      if (drag.type === "slot") return { ...item, slots: item.slots.map((slot) => slot.id === drag.id ? { ...slot, x: clamp(snap(slot.x + dx), 0, Math.max(0, width - slot.w)), y: clamp(snap(slot.y + dy), 0, Math.max(0, depth - slot.h)) } : slot) };
      return { ...item, objects: (item.objects ?? []).map((object) => object.id === drag.id ? { ...object, x: clamp(snap(object.x + dx), 0, Math.max(0, width - object.width)), y: clamp(snap(object.y + dy), 0, Math.max(0, depth - object.depth)) } : object) };
    }));
  };
  const endAsset = () => { if (!assetRef.current) return; assetRef.current = null; setRooms((current) => { void persist(current); return current; }); };

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><div className="rr3d-loading">Loading your reptile room…</div></div>;
  if (!room) return <div className="page-container"><BackHomeButton /><div className="rr3d-empty"><strong>No room loaded.</strong><p>Open the 2D builder to create a room first.</p></div></div>;

  const itemStyle = (x: number, y: number, z: number, w: number, d: number, rotation = 0) => ({ left: x * scale, top: y * scale, width: w * scale, height: d * scale, transform: `translateZ(${z * scale}px) rotateZ(${rotation}deg)` });

  return <div className="page-container reptile-room-3d">
    <BackHomeButton />
    <header className="rr3d-header"><div><span className="rr3d-kicker">🏠 TINY TITANS · ROOM SIM</span><h1>Build {room.name}</h1><p>{Math.round(width)} × {Math.round(depth)} × {Math.round(height)} cm · {slots.length} vivariums · {objects.length} room objects</p></div><div className="rr3d-header-actions"><label className="rr3d-room-picker">Room <select value={room.id} onChange={(event) => { setRoomId(event.target.value); setSelected(null); }}><option value={room.id}>{room.name}</option>{rooms.filter((item) => item.id !== room.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button onClick={() => setEditing((value) => !value)}>{editing ? "Editing" : "Viewing"}</button></div></header>
    {notice && <div className="rr3d-notice">{notice}</div>}
    <div className="rr3d-toolbar"><div className="rr3d-toolbar-left"><strong>Furniture & assets</strong><span>Drag anything in the room. Click to inspect.</span></div><div className="rr3d-controls"><button onClick={() => { setNotice("✓ Saved"); }}>✓ {saving ? "Saving…" : "Saved"}</button><button onClick={() => { setYaw(-28); setPitch(56); setZoom(.9); setPan({ x: 0, y: 20 }); }}>Reset camera</button><button onClick={() => updateRoom((current) => ({ ...current, ceilingVisible: current.ceilingVisible === false }), "Ceiling toggled.")}>{room.ceilingVisible === false ? "Show ceiling" : "Hide ceiling"}</button></div></div>
    <div className="rr3d-furniture-bar">{PRESETS.map((preset) => <button key={preset.kind} onClick={() => addAsset(preset)} disabled={!editing}><b>{preset.icon}</b><span>{preset.label}</span></button>)}</div>

    <div className="rr3d-layout">
      <section className="rr3d-stage" onPointerDown={beginCamera} onPointerMove={moveCamera} onPointerUp={endCamera} onPointerCancel={endCamera} onWheel={wheel} aria-label="Interactive 3D reptile room">
        <div className="rr3d-camera" style={{ transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${zoom}) rotateX(${pitch - 90}deg) rotateZ(${yaw}deg)` }}>
          <div className="rr3d-scene" style={{ width: roomW, height: roomD }}>
            <div className="rr3d-floor" style={{ width: roomW, height: roomD }} />
            <div className="rr3d-wall rr3d-wall-back" style={{ width: roomW, height: roomH, transform: `translateZ(${roomD}px) rotateY(180deg)` }} />
            <div className="rr3d-wall rr3d-wall-left" style={{ width: roomD, height: roomH, transformOrigin: "left top", transform: "rotateY(90deg)" }} />
            <div className="rr3d-wall rr3d-wall-right" style={{ width: roomD, height: roomH, left: `${roomW}px`, transformOrigin: "left top", transform: "rotateY(-90deg)" }} />
            <div className="rr3d-wall rr3d-wall-front" style={{ width: roomW, height: roomH, top: `${roomD}px`, transformOrigin: "left top", transform: "rotateX(90deg)" }} />
            {room.ceilingVisible !== false && <div className="rr3d-ceiling" style={{ width: roomW, height: roomD, transform: `translateZ(${roomH}px)` }} />}

            {slots.map((slot) => {
              const snake = slot.snakeId ? snakeMap.get(slot.snakeId) : undefined;
              const w = Math.max(10, slot.w); const d = Math.max(10, slot.h); const h = Math.max(8, slot.height ?? 45);
              return <div key={slot.id} className={`rr3d-asset rr3d-vivarium rr3d-interactive ${selected?.type === "slot" && selected.id === slot.id ? "is-selected" : ""}`} style={itemStyle(slot.x, slot.y, slot.z ?? 0, w, d)} onPointerDown={(event) => beginAsset(event, "slot", slot.id)} onPointerMove={moveAsset} onPointerUp={endAsset} onClick={(event) => { event.stopPropagation(); setSelected({ type: "slot", id: slot.id }); }}><Box3D width={w * scale} depth={d * scale} height={h * scale} className="rr3d-vivarium-box" label={slot.label} /><div className="rr3d-label">{snake ? snakeName(snake) : slot.label}<small>{w} × {d} × {h} cm</small></div></div>;
            })}

            {objects.map((object) => <div key={object.id} className={`rr3d-asset rr3d-object rr3d-kind-${object.kind} rr3d-interactive ${selected?.type === "object" && selected.id === object.id ? "is-selected" : ""}`} style={itemStyle(object.x, object.y, object.z ?? 0, object.width, object.depth, object.rotation)} onPointerDown={(event) => beginAsset(event, "object", object.id)} onPointerMove={moveAsset} onPointerUp={endAsset} onClick={(event) => { event.stopPropagation(); setSelected({ type: "object", id: object.id }); }}><Box3D width={object.width * scale} depth={object.depth * scale} height={object.height * scale} className="rr3d-object-box" label={object.label} /><div className="rr3d-label">{object.label}<small>{object.width} × {object.depth} × {object.height} cm</small></div></div>)}
          </div>
        </div>
        <div className="rr3d-hud"><strong>3D ROOM</strong><span>Left drag: orbit</span><span>Wheel: zoom</span><span>Middle drag: pan</span><span>Drag assets to move</span></div>
      </section>

      <aside className="rr3d-inspector"><span className="rr3d-inspector-kicker">{selectedItem ? `SELECTED ${selected?.type.toUpperCase()}` : "ROOM"}</span>{!selectedItem ? <><h2>{room.name}</h2><div className="rr3d-stat"><span>Dimensions</span><strong>{Math.round(width)} × {Math.round(depth)} × {Math.round(height)} cm</strong></div><div className="rr3d-stat"><span>Vivariums</span><strong>{slots.length}</strong></div><div className="rr3d-stat"><span>Room assets</span><strong>{objects.length}</strong></div><p>Click anything in the room to select it. Use the catalogue above to build the room like a tiny reptile Sims game.</p></> : <><h2>{selectedItem.label}</h2>{selected?.type === "slot" ? <><div className="rr3d-stat"><span>Dimensions</span><strong>{selectedItem.w} × {selectedItem.h} × {selectedItem.height ?? 45} cm</strong></div><label className="rr3d-field">Snake<select value={selectedItem.snakeId ?? ""} onChange={(event) => assignSnake(event.target.value)}><option value="">No snake assigned</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snakeName(snake)}</option>)}</select></label></> : <div className="rr3d-stat"><span>Dimensions</span><strong>{selectedItem.width} × {selectedItem.depth} × {selectedItem.height} cm</strong></div>}<div className="rr3d-inspector-actions"><button onClick={() => setSelected(null)}>Deselect</button>{selected?.type === "object" && <button onClick={() => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selected.id ? { ...object, rotation: (object.rotation + 90) % 360 } : object) }), "Object rotated.")}>Rotate</button>}<button className="danger" onClick={removeSelected}>Delete</button></div></>}</aside>
    </div>
  </div>;
}
