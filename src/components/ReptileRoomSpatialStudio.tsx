import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { createAndSaveSpatialRoom, duplicateSpatialRoom, listSpatialRooms, removeSpatialRoom, saveSpatialRoom, syncSpatialRoomToCloud, syncSpatialRoomsFromCloud } from "../services/reptileRoomSpatialService";
import { ROOM_TEMPLATES, rackCapacity, rackDimensions, type RackSpec, type RoomTemplateId, type SpatialObject, type SpatialRoom, type SpatialUnit } from "../types/ReptileRoomSpatial";
import type { Snake } from "../types/Snake";
import "../styles/reptile-room-spatial-studio.css";

const UNITS: SpatialUnit[] = ["mm", "cm", "m", "in", "ft"];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function blankRack(): RackSpec { return { tubsAcross: 3, tubsDown: 4, levels: 3, tubDimensions: { width: 40, depth: 30, height: 15, unit: "cm" }, calculateFrameFromTubs: true, frameThickness: 2, frameUnit: "cm", verticalClearance: 2, clearanceUnit: "cm" }; }
function roomLabel(template: RoomTemplateId) { return ROOM_TEMPLATES.find((item) => item.id === template)?.name ?? "Custom Room"; }
function roomArea(room: SpatialRoom) { return room.dimensions.width * room.dimensions.depth; }
function roomObjectArea(room: SpatialRoom) { return room.objects.reduce((sum, object) => sum + object.dimensions.width * object.dimensions.depth, 0); }

export default function ReptileRoomSpatialStudio() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<SpatialRoom[]>([]);
  const [roomIndex, setRoomIndex] = useState(0);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showRack, setShowRack] = useState(false);
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [newName, setNewName] = useState("My Reptile Room");
  const [newTemplate, setNewTemplate] = useState<RoomTemplateId>("blank");
  const [rack, setRack] = useState<RackSpec>(blankRack());

  const room = rooms[roomIndex] ?? null;
  const selected = room?.objects.find((object) => object.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    if (!user) return;
    const local = listSpatialRooms();
    setRooms(local);
    setRoomIndex((current) => clamp(current, 0, Math.max(0, local.length - 1)));
    try { setSnakes(await getUserSnakes(user.uid)); } catch { setSnakes([]); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void refresh(); }, [loading, profileLoading, user, refresh]);

  const updateRoom = useCallback((updater: (room: SpatialRoom) => SpatialRoom) => {
    if (!room) return;
    const updated = saveSpatialRoom(updater(room));
    setRooms((current) => current.map((item) => item.id === updated.id ? updated : item));
  }, [room]);

  const createRoom = () => {
    const created = createAndSaveSpatialRoom(newName.trim() || roomLabel(newTemplate), newTemplate);
    setRooms((current) => [...current, created]);
    setRoomIndex(rooms.length);
    setSelectedId(null);
    setShowCreate(false);
    setMessage("Room created locally. Use Save / Sync when you want it on your other devices.");
  };

  const deleteRoom = () => {
    if (!room || !window.confirm(`Remove “${room.name}”? This removes the room layout, not your snakes.`)) return;
    removeSpatialRoom(room.id);
    const next = rooms.filter((item) => item.id !== room.id);
    setRooms(next); setRoomIndex(clamp(roomIndex, 0, Math.max(0, next.length - 1))); setSelectedId(null);
  };

  const duplicate = () => {
    if (!room) return;
    const copy = duplicateSpatialRoom(room.id);
    if (!copy) return;
    setRooms((current) => [...current, copy]); setRoomIndex(rooms.length); setMessage("Room duplicated.");
  };

  const addVivarium = () => {
    if (!room) return;
    const object: SpatialObject = { id: id("vivarium"), kind: "vivarium", label: "New Vivarium", position: { x: 0.25, y: 0.25, unit: room.dimensions.unit }, dimensions: { width: 120, depth: 60, height: 60, unit: "cm" } };
    updateRoom((current) => ({ ...current, objects: [...current.objects, object] })); setSelectedId(object.id);
  };

  const addRack = () => {
    if (!room) return;
    const dimensions = rackDimensions(rack);
    const object: SpatialObject = { id: id("rack"), kind: "rack", label: `Rack · ${rackCapacity(rack)} tubs`, position: { x: 0.25, y: 1, unit: room.dimensions.unit }, dimensions, metadata: { tubsAcross: rack.tubsAcross, tubsDown: rack.tubsDown, levels: rack.levels, tubWidth: rack.tubDimensions.width, tubDepth: rack.tubDimensions.depth, tubHeight: rack.tubDimensions.height, tubUnit: rack.tubDimensions.unit } };
    updateRoom((current) => ({ ...current, objects: [...current.objects, object] })); setSelectedId(object.id); setShowRack(false);
  };

  const updateDimensions = (axis: "width" | "depth" | "height", value: number, unit: SpatialUnit) => {
    if (!room) return;
    const dimensions = { ...room.dimensions, [axis]: Math.max(0.01, value), unit };
    updateRoom((current) => ({ ...current, dimensions, walls: current.walls.map((wall) => ({ ...wall, length: wall.position === "north" || wall.position === "south" ? dimensions.width : dimensions.depth, height: dimensions.height, unit })) }));
  };

  const moveSelected = (dx: number, dy: number) => {
    if (!selected) return;
    updateRoom((current) => ({ ...current, objects: current.objects.map((object) => object.id === selected.id ? { ...object, position: { ...object.position, x: Math.max(0, object.position.x + dx), y: Math.max(0, object.position.y + dy) } } : object) }));
  };

  const deleteSelected = () => { if (!selected) return; updateRoom((current) => ({ ...current, objects: current.objects.filter((object) => object.id !== selected.id) })); setSelectedId(null); };

  const assignSnake = (snakeId: string) => { if (!selected) return; updateRoom((current) => ({ ...current, objects: current.objects.map((object) => object.id === selected.id ? { ...object, snakeId: snakeId || null } : object) })); };

  const sync = async () => {
    if (!user || !room) return;
    setSyncing(true); setMessage("");
    try { await syncSpatialRoomToCloud(user.uid, room); setMessage("Saved and synced. No continuous cloud writes are used."); }
    catch { setMessage("Cloud sync failed. Your local room is still safe."); }
    finally { setSyncing(false); }
  };

  const pull = async () => {
    if (!user) return;
    setSyncing(true);
    try { const remote = await syncSpatialRoomsFromCloud(user.uid); setRooms(remote); setRoomIndex(0); setSelectedId(null); setMessage(remote.length ? "Cloud rooms loaded." : "No cloud rooms found; local rooms remain available."); }
    finally { setSyncing(false); }
  };

  const occupancy = useMemo(() => room ? { area: roomArea(room), used: roomObjectArea(room), count: room.objects.length, racks: room.objects.filter((o) => o.kind === "rack").length, tubs: room.objects.filter((o) => o.kind === "tub").length } : null, [room]);
  if (!room) return <section className="spatial-room-shell"><header><div><span className="spatial-kicker">TINY TITANS · SPATIAL STUDIO</span><h1>Build your reptile room</h1><p>True-scale planning for vivariums, racks, tubs and equipment.</p></div><button className="tt-primary" onClick={() => setShowCreate(true)}>＋ Create room</button></header>{showCreate && <CreateRoomDialog name={newName} setName={setNewName} template={newTemplate} setTemplate={setNewTemplate} onCreate={createRoom} onClose={() => setShowCreate(false)} />}</section>;

  const roomWidth = room.dimensions.width;
  const roomDepth = room.dimensions.depth;
  return <section className="spatial-room-shell">
    <header className="spatial-room-header"><div><span className="spatial-kicker">TINY TITANS · SPATIAL STUDIO</span><h1>{room.name}</h1><p>{roomLabel(room.templateId)} · {room.dimensions.width} {room.dimensions.unit} × {room.dimensions.depth} {room.dimensions.unit} × {room.dimensions.height} {room.dimensions.unit}</p></div><div className="spatial-room-actions"><button onClick={() => setShowCreate(true)}>＋ Room</button><button onClick={duplicate}>Duplicate</button><button onClick={pull} disabled={syncing}>Sync from cloud</button><button className="tt-primary" onClick={sync} disabled={syncing}>{syncing ? "Syncing…" : "Save / Sync"}</button></div></header>
    <div className="spatial-room-tabs"><button onClick={() => setRoomIndex((roomIndex - 1 + rooms.length) % rooms.length)}>‹</button>{rooms.map((item, index) => <button key={item.id} className={index === roomIndex ? "active" : ""} onClick={() => { setRoomIndex(index); setSelectedId(null); }}>{item.name}</button>)}<button onClick={() => setRoomIndex((roomIndex + 1) % rooms.length)}>›</button></div>
    <div className="spatial-room-grid">
      <aside className="spatial-panel">
        <h2>Room scale</h2><label>Width<input type="number" min="0.01" value={roomWidth} onChange={(e) => updateDimensions("width", Number(e.target.value), room.dimensions.unit)} /></label><label>Depth<input type="number" min="0.01" value={roomDepth} onChange={(e) => updateDimensions("depth", Number(e.target.value), room.dimensions.unit)} /></label><label>Height<input type="number" min="0.01" value={room.dimensions.height} onChange={(e) => updateDimensions("height", Number(e.target.value), room.dimensions.unit)} /></label><label>Units<select value={room.dimensions.unit} onChange={(e) => updateDimensions("width", room.dimensions.width, e.target.value as SpatialUnit)}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        <div className="spatial-stat-grid"><span>Objects<strong>{occupancy?.count}</strong></span><span>Racks<strong>{occupancy?.racks}</strong></span><span>Floor used<strong>{occupancy ? `${Math.min(100, (occupancy.used / Math.max(occupancy.area, 0.01)) * 100).toFixed(0)}%` : "0%"}</strong></span></div>
        <h2>Build</h2><button className="build-button" onClick={addVivarium}>＋ Normal vivarium</button><button className="build-button" onClick={() => setShowRack(true)}>＋ Rack / tub bank</button>
        <h2>Selected</h2>{selected ? <><strong>{selected.label}</strong><label>Snake<select value={selected.snakeId ?? ""} onChange={(e) => assignSnake(e.target.value)}><option value="">Unassigned</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label><div className="nudge-grid"><button onClick={() => moveSelected(-0.05, 0)}>←</button><button onClick={() => moveSelected(0, -0.05)}>↑</button><button onClick={() => moveSelected(0, 0.05)}>↓</button><button onClick={() => moveSelected(0.05, 0)}>→</button></div><button className="danger-button" onClick={deleteSelected}>Remove from room</button></> : <p className="muted">Select a room object to edit it.</p>}
        <button className="danger-button" onClick={deleteRoom}>Remove room</button>
      </aside>
      <main className="spatial-canvas-wrap"><div className="true-scale-note">TRUE SCALE · {roomWidth} {room.dimensions.unit} wide × {roomDepth} {room.dimensions.unit} deep</div><div className="spatial-canvas" style={{ aspectRatio: `${Math.max(roomWidth, 0.1)} / ${Math.max(roomDepth, 0.1)}` }}><div className="wall north"/><div className="wall east"/><div className="wall south"/><div className="wall west"/>{room.objects.map((object) => { const x = (object.position.x / roomWidth) * 100; const y = (object.position.y / roomDepth) * 100; const w = (object.dimensions.width / roomWidth) * 100; const h = (object.dimensions.depth / roomDepth) * 100; return <button key={object.id} className={`spatial-object ${object.kind} ${selectedId === object.id ? "selected" : ""}`} style={{ left: `${clamp(x, 0, 100)}%`, top: `${clamp(y, 0, 100)}%`, width: `${clamp(w, 2, 98)}%`, height: `${clamp(h, 2, 98)}%` }} onClick={() => setSelectedId(object.id)} title={`${object.label} · ${object.dimensions.width} ${object.dimensions.unit} × ${object.dimensions.depth} ${object.dimensions.unit}`}>{object.kind === "rack" ? "🗄️" : object.kind === "vivarium" ? "🦎" : "📦"}<span>{object.label}</span></button>; })}<div className="dimension-line top">{roomWidth} {room.dimensions.unit}</div><div className="dimension-line side">{roomDepth} {room.dimensions.unit}</div></div>{message && <div className="spatial-message">{message}</div>}</main>
    </div>
    {showCreate && <CreateRoomDialog name={newName} setName={setNewName} template={newTemplate} setTemplate={setNewTemplate} onCreate={createRoom} onClose={() => setShowCreate(false)} />}
    {showRack && <RackDialog rack={rack} setRack={setRack} onAdd={addRack} onClose={() => setShowRack(false)} />}
  </section>;
}

function CreateRoomDialog({ name, setName, template, setTemplate, onCreate, onClose }: { name: string; setName: (v: string) => void; template: RoomTemplateId; setTemplate: (v: RoomTemplateId) => void; onCreate: () => void; onClose: () => void }) { return <div className="spatial-modal"><div className="spatial-modal-card"><h2>Create a room</h2><label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label><div className="template-grid">{ROOM_TEMPLATES.map((item) => <button key={item.id} className={template === item.id ? "active" : ""} onClick={() => setTemplate(item.id)}><strong>{item.name}</strong><small>{item.description}</small></button>)}</div><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="tt-primary" onClick={onCreate}>Create scaled room</button></div></div></div>; }

function RackDialog({ rack, setRack, onAdd, onClose }: { rack: RackSpec; setRack: (r: RackSpec) => void; onAdd: () => void; onClose: () => void }) { const dims = rackDimensions(rack); return <div className="spatial-modal"><div className="spatial-modal-card"><h2>Build a rack</h2><p>Describe the rack by tubs across × tubs down × levels, or use the frame dimensions.</p><div className="rack-grid"><label>Tubs across<input type="number" min="1" value={rack.tubsAcross} onChange={(e) => setRack({ ...rack, tubsAcross: Math.max(1, Number(e.target.value)) })} /></label><label>Tubs down<input type="number" min="1" value={rack.tubsDown} onChange={(e) => setRack({ ...rack, tubsDown: Math.max(1, Number(e.target.value)) })} /></label><label>Levels<input type="number" min="1" value={rack.levels} onChange={(e) => setRack({ ...rack, levels: Math.max(1, Number(e.target.value)) })} /></label><label>Tub unit<select value={rack.tubDimensions.unit} onChange={(e) => setRack({ ...rack, tubDimensions: { ...rack.tubDimensions, unit: e.target.value as SpatialUnit } })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Tub width<input type="number" min="0.1" value={rack.tubDimensions.width} onChange={(e) => setRack({ ...rack, tubDimensions: { ...rack.tubDimensions, width: Number(e.target.value) } })} /></label><label>Tub depth<input type="number" min="0.1" value={rack.tubDimensions.depth} onChange={(e) => setRack({ ...rack, tubDimensions: { ...rack.tubDimensions, depth: Number(e.target.value) } })} /></label><label>Tub height<input type="number" min="0.1" value={rack.tubDimensions.height} onChange={(e) => setRack({ ...rack, tubDimensions: { ...rack.tubDimensions, height: Number(e.target.value) } })} /></label></div><div className="rack-result"><strong>{rackCapacity(rack)} tubs</strong><span>Calculated rack envelope: {dims.width.toFixed(1)} × {dims.depth.toFixed(1)} × {dims.height.toFixed(1)} {dims.unit}</span></div><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="tt-primary" onClick={onAdd}>Add rack</button></div></div></div>; }
