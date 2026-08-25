import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import {
  DEFAULT_ROOM,
  deleteReptileRoom,
  loadReptileRooms,
  migrateLegacyRoom,
  saveReptileRooms,
  type ReptileFurnitureKind,
  type ReptileRoomObject,
  type ReptileRoomSlot,
  type ReptileRoomTemplate,
  type ReptileRoomUnit,
  type ReptileRoomWorkspace,
  type ReptileWall,
  type VivariumAvailability,
  type VivariumLifecycleStatus,
} from "../services/reptileRoomService";
import { clamp, snapArchitecturalObject, snapNumber, stackZ, worldSize } from "../services/reptileRoomSpatialService";
import type { Snake } from "../types/Snake";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room.css";

const VIV = { width: 60, depth: 40, height: 30 };
const WALLS: ReptileWall[] = ["north", "east", "south", "west"];
const OBJECTS: Array<[ReptileFurnitureKind, string, number, number, number]> = [
  ["rack", "Rack", 120, 50, 200],
  ["shelving", "Shelving", 100, 40, 180],
  ["workbench", "Workbench", 140, 70, 90],
  ["storage-cabinet", "Storage", 100, 50, 180],
  ["equipment-station", "Equipment", 80, 50, 100],
  ["quarantine-area", "Quarantine", 120, 80, 100],
  ["door", "Door", 90, 12, 210],
  ["window", "Window", 120, 10, 100],
  ["vent", "Vent", 30, 10, 15],
];

const templates: Array<[ReptileRoomTemplate, string]> = [
  ["custom", "Custom"], ["blank", "Blank"], ["hatchling", "Hatchling"], ["breeding", "Breeding"], ["medical", "Medical / quarantine"], ["brumation", "Brumation"], ["bioactive", "Bioactive"],
];

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const cm = (value: number, unit: ReptileRoomUnit) => unit === "imperial" ? value / 2.54 : value;
const toCm = (value: number, unit: ReptileRoomUnit) => unit === "imperial" ? value * 2.54 : value;
const labelDim = (value: number, unit: ReptileRoomUnit) => `${cm(value, unit).toFixed(value >= 100 ? 0 : 1)} ${unit === "imperial" ? "in" : "cm"}`;

function slotFor(snake: Snake | null, index: number): ReptileRoomSlot {
  const width = Number(snake?.enclosure?.length) || VIV.width;
  const depth = Number(snake?.enclosure?.width) || VIV.depth;
  const height = Number(snake?.enclosure?.height) || VIV.height;
  return { id: id("viv"), snakeId: snake?.id ?? null, label: snake ? `${snake.name}'s Vivarium` : `Vivarium ${index + 1}`, x: 10 + (index % 4) * (width + 8), y: 10 + Math.floor(index / 4) * (depth + 8), z: 0, w: width, h: depth, depth, height, lifecycleStatus: snake ? "active" : "empty", condition: "good", availability: snake ? "occupied" : "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null };
}

function newRoom(name: string, template: ReptileRoomTemplate, snakes: Snake[]): ReptileRoomWorkspace {
  const now = new Date().toISOString();
  return { id: id("room"), name, template, unit: "metric", width: DEFAULT_ROOM.width, depth: DEFAULT_ROOM.depth, height: DEFAULT_ROOM.height, storageCapacity: DEFAULT_ROOM.storageCapacity, slots: template === "blank" ? [] : snakes.map(slotFor), storedSlots: [], objects: [], roomVersion: 2, createdAt: now, updatedAt: now };
}

export default function ReptileRoomV7() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<{ type: "slot" | "object"; id: string } | null>(null);
  const [view, setView] = useState<"floor" | "elevation">("floor");
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [template, setTemplate] = useState<ReptileRoomTemplate>("custom");
  const [dragging, setDragging] = useState<string | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const slots = room?.slots ?? [];
  const objects = room?.objects ?? [];
  const unit = room?.unit ?? "metric";
  const width = Math.max(100, room?.width ?? DEFAULT_ROOM.width);
  const depth = Math.max(100, room?.depth ?? DEFAULT_ROOM.depth);
  const height = Math.max(100, room?.height ?? DEFAULT_ROOM.height);
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedSlot = selected?.type === "slot" ? slots.find((item) => item.id === selected.id) ?? null : null;
  const selectedObject = selected?.type === "object" ? objects.find((item) => item.id === selected.id) ?? null : null;
  const assigned = useMemo(() => new Set(rooms.flatMap((item) => item.slots.map((slot) => slot.snakeId).filter(Boolean))), [rooms]);
  const freeSnakes = useMemo(() => snakes.filter((snake) => !assigned.has(snake.id) || snake.id === selectedSlot?.snakeId), [snakes, assigned, selectedSlot?.snakeId]);

  const persist = useCallback(async (next: ReptileRoomWorkspace[], message?: string) => {
    const stamped = next.map((item) => ({ ...item, roomVersion: 2, updatedAt: new Date().toISOString() }));
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
      const loadedSnakes = await getUserSnakes(user.uid);
      let loaded = await loadReptileRooms(user.uid);
      if (!loaded.length) {
        loaded = migrateLegacyRoom(user.uid, []);
      }
      if (!loaded.length) {
        loaded = [newRoom("Main Reptile Room", "custom", loadedSnakes)];
        await saveReptileRooms(user.uid, loaded);
      }
      const snakeMap = new Map(loadedSnakes.map((snake) => [snake.id, snake]));
      const normalized = loaded.map((item) => ({
        ...item,
        unit: item.unit ?? "metric",
        width: item.width ?? DEFAULT_ROOM.width,
        depth: item.depth ?? DEFAULT_ROOM.depth,
        height: item.height ?? DEFAULT_ROOM.height,
        storageCapacity: item.storageCapacity ?? DEFAULT_ROOM.storageCapacity,
        objects: item.objects ?? [],
        slots: item.slots.map((slot) => ({ ...slot, depth: slot.depth ?? slot.h, height: slot.height ?? VIV.height, lifecycleStatus: slot.lifecycleStatus ?? (slot.snakeId ? "active" : "empty"), availability: slot.availability ?? (slot.snakeId ? "occupied" : "available") })),
        storedSlots: item.storedSlots.map((slot) => ({ ...slot, lifecycleStatus: "stored" as VivariumLifecycleStatus })),
      }));
      setSnakes(loadedSnakes); setRooms(normalized); setRoomId((current) => normalized.some((item) => item.id === current) ? current : normalized[0].id);
      void snakeMap;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load the reptile room."); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const updateRoom = useCallback((fn: (current: ReptileRoomWorkspace) => ReptileRoomWorkspace, message?: string) => {
    if (!room) return;
    void persist(rooms.map((item) => item.id === room.id ? fn(item) : item), message);
  }, [persist, room, rooms]);

  function addVivarium() {
    if (!room) return;
    const slot = slotFor(null, slots.length);
    slot.x = Math.max(0, Math.min(slot.x, width - slot.w)); slot.y = Math.max(0, Math.min(slot.y, depth - slot.h));
    updateRoom((current) => ({ ...current, slots: [...current.slots, slot] }), "Vivarium added.");
    setSelected({ type: "slot", id: slot.id });
  }

  function assignSnake(snakeId: string) {
    if (!selectedSlot) return;
    const target = snakeId || null;
    const snake = target ? snakesById.get(target) : null;
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => {
      if (slot.id === selectedSlot.id) return { ...slot, snakeId: target, label: snake ? `${snake.name}'s Vivarium` : slot.label, lifecycleStatus: target ? "active" : "empty", availability: target ? "occupied" : "available" };
      if (target && slot.snakeId === target) return { ...slot, snakeId: null, lifecycleStatus: "empty", availability: "available" };
      return slot;
    }) }), snake ? `${snake.name} assigned.` : "Snake unassigned.");
  }

  function addObject(kind: ReptileFurnitureKind) {
    if (!room) return;
    const definition = OBJECTS.find((item) => item[0] === kind); if (!definition) return;
    const [, label, w, d, h] = definition;
    let object: ReptileRoomObject = { id: id("obj"), kind, label, x: 10, y: 10, z: kind === "window" ? 100 : kind === "vent" ? 160 : 0, width: w, depth: d, height: h, rotation: 0, wall: null, openingType: kind === "door" ? "swing" : undefined, swingDirection: "inward-right", swingAngle: 90, sillHeight: kind === "window" ? 100 : kind === "vent" ? 160 : 0, stackGroupId: null, stackIndex: 0, parentAssetId: null, notes: "" };
    if (kind === "door" || kind === "window" || kind === "vent") object = snapArchitecturalObject({ ...object, wall: "north" }, width, depth);
    updateRoom((current) => ({ ...current, objects: [...(current.objects ?? []), object] }), `${label} added to room.`);
    setSelected({ type: "object", id: object.id });
  }

  function moveSelected(event: ReactPointerEvent<HTMLElement>, type: "slot" | "object", itemId: string) {
    if (!editing || !room) return;
    const canvas = event.currentTarget.closest(".rr7-floor") as HTMLElement | null; if (!canvas) return;
    event.preventDefault(); event.stopPropagation(); setDragging(itemId);
    const rect = canvas.getBoundingClientRect(); let latest = rooms;
    const move = (pointer: PointerEvent) => {
      const current = latest.find((item) => item.id === room.id); if (!current) return;
      const x = ((pointer.clientX - rect.left) / rect.width) * width;
      const y = ((pointer.clientY - rect.top) / rect.height) * depth;
      latest = latest.map((item) => {
        if (item.id !== room.id) return item;
        if (type === "slot") return { ...item, slots: item.slots.map((slot) => slot.id === itemId ? { ...slot, x: clamp(snapNumber(x - slot.w / 2), 0, Math.max(0, width - slot.w)), y: clamp(snapNumber(y - slot.h / 2), 0, Math.max(0, depth - slot.h)) } : slot) };
        const object = item.objects?.find((entry) => entry.id === itemId); if (!object) return item;
        const size = worldSize(object); const moved = { ...object, x: x - size.w / 2, y: y - size.d / 2 };
        const snapped = object.wall ? snapArchitecturalObject(moved, width, depth) : { ...moved, x: clamp(snapNumber(moved.x), 0, Math.max(0, width - size.w)), y: clamp(snapNumber(moved.y), 0, Math.max(0, depth - size.d)) };
        return { ...item, objects: item.objects?.map((entry) => entry.id === itemId ? snapped : entry) };
      });
      setRooms(latest);
    };
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); setDragging(null); void persist(latest); };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up);
  }

  function stackAbove() {
    if (!selectedSlot || !room) return;
    const group = selectedSlot.stackGroupId ?? id("stack");
    const same = slots.filter((slot) => slot.stackGroupId === group || (Math.abs(slot.x - selectedSlot.x) < 1 && Math.abs(slot.y - selectedSlot.y) < 1)).sort((a, b) => a.z - b.z);
    const below = same.at(-1);
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, stackGroupId: group, stackIndex: same.length, parentSlotId: below?.id ?? null, z: below ? stackZ(below) : stackZ(slot) } : slot) }), "Vivarium stacked above.");
  }

  function unstack() { if (!selectedSlot) return; updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, z: 0, stackGroupId: null, stackIndex: 0, parentSlotId: null } : slot) }), "Vivarium returned to floor level."); }

  function removeSelected() {
    if (!room || !selected) return;
    if (selected.type === "slot") updateRoom((current) => ({ ...current, slots: current.slots.filter((slot) => slot.id !== selected.id) }), "Vivarium removed. Snake record was kept.");
    else updateRoom((current) => ({ ...current, objects: (current.objects ?? []).filter((object) => object.id !== selected.id) }), "Room object removed.");
    setSelected(null);
  }

  function duplicateRoom() {
    if (!room) return;
    const copy = { ...room, id: id("room"), name: `${room.name} — Planning Copy`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), slots: room.slots.map((slot) => ({ ...slot, id: id("viv"), snakeId: null, label: `${slot.label} plan`, lifecycleStatus: "empty" as VivariumLifecycleStatus, availability: "available" as VivariumAvailability, stackGroupId: null, stackIndex: 0, parentSlotId: null, z: 0 })) };
    void persist([...rooms, copy], "Room duplicated for planning.");
    setRoomId(copy.id);
    setSelected(null);
  }

  function createRoom() {
    const next = newRoom(`Reptile Room ${rooms.length + 1}`, template, snakes);
    void persist([...rooms, next], "New room created.");
    setRoomId(next.id);
    setSelected(null);
  }

  async function removeRoom() {
    if (!room || rooms.length <= 1) return;
    const remaining = rooms.filter((item) => item.id !== room.id);
    await deleteReptileRoom(user?.uid ?? "", room.id).catch(() => undefined);
    setRooms(remaining); setRoomId(remaining[0].id); setSelected(null);
    setNotice("Room deleted.");
  }

  function updateSelectedSlot(patch: Partial<ReptileRoomSlot>) {
    if (!selectedSlot) return;
    updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, ...patch } : slot) }));
  }

  function updateSelectedObject(patch: Partial<ReptileRoomObject>) {
    if (!selectedObject) return;
    updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, ...patch } : object) }));
  }

  const floorScale = 4;
  const floorWidth = width * floorScale;
  const floorDepth = depth * floorScale;
  const elevationHeight = height * floorScale;

  if (loading || profileLoading) return <main className="reptile-room-v7"><div className="rr7-empty">Loading your reptile rooms…</div></main>;
  if (!user) return <main className="reptile-room-v7"><div className="rr7-empty">Sign in to build and save your reptile rooms.</div></main>;

  return (
    <main className="reptile-room-v7">
      <div className="rr7-header">
        <div>
          <div className="rr7-kicker">TINY TITANS • REPTILE SPACE BUILDER</div>
          <h1>Build Your Reptile Room</h1>
          <p>Design a real scaled reptile room around your actual vivariums. Rooms, placements, stacking, storage capacity and architectural objects stay tied to your workspace.</p>
        </div>
        <div className="rr7-header-actions"><BackHomeButton /><button onClick={duplicateRoom} disabled={!room}>Duplicate room</button><button onClick={removeRoom} disabled={!room || rooms.length <= 1}>Delete room</button></div>
      </div>

      {notice && <div className="rr7-notice">{notice}</div>}

      <section className="rr7-workspaces">
        <div className="rr7-section-title"><div><span>WORKSPACES</span><h2>Rooms</h2></div><div className="rr7-actions"><select value={template} onChange={(event) => setTemplate(event.target.value as ReptileRoomTemplate)}>{templates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="rr7-primary" onClick={createRoom}>Create room</button></div></div>
        <div className="rr7-room-tabs">{rooms.map((item) => <button key={item.id} className={item.id === room?.id ? "is-active" : ""} onClick={() => { setRoomId(item.id); setSelected(null); }}><strong>{item.name}</strong><small>{item.template} • {labelDim(item.width, item.unit)} × {labelDim(item.depth, item.unit)}</small></button>)}</div>
      </section>

      {room && <>
        <section className="rr7-spec">
          <div><span>ROOM NAME</span><input value={room.name} onChange={(event) => updateRoom((current) => ({ ...current, name: event.target.value }))} /></div>
          <label>WIDTH<input type="number" min={100} value={Math.round(cm(room.width, unit) * 10) / 10} onChange={(event) => updateRoom((current) => ({ ...current, width: Math.max(100, toCm(Number(event.target.value) || 100, unit)) }))} /></label>
          <label>DEPTH<input type="number" min={100} value={Math.round(cm(room.depth, unit) * 10) / 10} onChange={(event) => updateRoom((current) => ({ ...current, depth: Math.max(100, toCm(Number(event.target.value) || 100, unit)) }))} /></label>
          <label>HEIGHT<input type="number" min={100} value={Math.round(cm(room.height, unit) * 10) / 10} onChange={(event) => updateRoom((current) => ({ ...current, height: Math.max(100, toCm(Number(event.target.value) || 100, unit)) }))} /></label>
          <label>UNIT<select value={unit} onChange={(event) => updateRoom((current) => ({ ...current, unit: event.target.value as ReptileRoomUnit }))}><option value="metric">cm</option><option value="imperial">in</option></select></label>
          <div className="rr7-metric"><span>VIVARIUMS</span><strong>{slots.length}</strong></div>
          <div className="rr7-metric"><span>OBJECTS</span><strong>{objects.length}</strong></div>
          <button className="rr7-danger" onClick={removeRoom} disabled={rooms.length <= 1}>Delete</button>
        </section>

        <div className="rr7-toolbar">
          <div><span>VIEW</span><button className={view === "floor" ? "is-active" : ""} onClick={() => setView("floor")}>Floor plan</button><button className={view === "elevation" ? "is-active" : ""} onClick={() => setView("elevation")}>Elevation</button></div>
          <div><span>ROOM</span><button className={editing ? "is-active" : ""} onClick={() => setEditing((current) => !current)}>{editing ? "Editing on" : "Editing off"}</button><button onClick={addVivarium}>+ Vivarium</button></div>
          <div><span>OBJECTS</span>{OBJECTS.map(([kind, label]) => <button key={kind} onClick={() => addObject(kind)}>{label}</button>)}</div>
          <div className="rr7-save">{saving ? "Saving…" : "Saved"}</div>
        </div>

        <div className="rr7-builder">
          <section className="rr7-canvas-card">
            <div className="rr7-canvas-head"><div><strong>{room.name}</strong><span>{labelDim(room.width, unit)} × {labelDim(room.depth, unit)} × {labelDim(room.height, unit)}</span></div><div className="rr7-view"><span>Grid 25cm</span></div></div>
            {view === "floor" ? <div className="rr7-floor-scroll"><div className="rr7-floor" style={{ width: floorWidth, height: floorDepth }}>{WALLS.map((wall) => <div key={wall} className={`rr7-wall ${wall}`}>{wall.toUpperCase()}</div>)}{objects.map((object) => <button key={object.id} type="button" className={`rr7-item rr7-object rr7-${object.kind} ${selected?.type === "object" && selected.id === object.id ? "is-selected" : ""} ${dragging === object.id ? "is-dragging" : ""}`} style={{ left: object.x * floorScale, top: object.y * floorScale, width: object.width * floorScale, height: Math.max(20, object.depth * floorScale), zIndex: 20 + object.z }} onPointerDown={(event) => { setSelected({ type: "object", id: object.id }); moveSelected(event, "object", object.id); }}>{object.label}<small>{object.height}cm</small></button>)}{slots.map((slot) => { const snake = slot.snakeId ? snakesById.get(slot.snakeId) : null; return <button key={slot.id} type="button" className={`rr7-item rr7-viv ${selected?.type === "slot" && selected.id === slot.id ? "is-selected" : ""} ${dragging === slot.id ? "is-dragging" : ""}`} style={{ left: slot.x * floorScale, top: slot.y * floorScale, width: slot.w * floorScale, height: slot.h * floorScale, zIndex: 100 + slot.z }} onPointerDown={(event) => { setSelected({ type: "slot", id: slot.id }); moveSelected(event, "slot", slot.id); }}><strong>{snake?.name ?? "Empty vivarium"}</strong><span>{slot.label}</span><small>{slot.lifecycleStatus} • {slot.condition}</small></button>; })}</div></div> : <div className="rr7-elevation"><div className="rr7-elevation-wall" style={{ width: floorWidth, height: elevationHeight }}>{slots.map((slot) => <button key={slot.id} type="button" className={`rr7-elev-item ${selected?.type === "slot" && selected.id === slot.id ? "is-selected" : ""}`} style={{ left: slot.x * floorScale, bottom: slot.z * floorScale, width: slot.w * floorScale, height: slot.height * floorScale }} onClick={() => setSelected({ type: "slot", id: slot.id })}>{slot.label}</button>)}</div><p>Elevation uses the room's real height and vivarium elevation/stack data.</p></div>}
          </section>

          <aside className="rr7-inspector">
            {selectedSlot ? <>
              <div className="rr7-inspector-title"><span>VIVARIUM INSPECTOR</span><h2>{selectedSlot.label}</h2></div>
              <label>SNAKE<select value={selectedSlot.snakeId ?? ""} onChange={(event) => assignSnake(event.target.value)}><option value="">Unassigned</option>{freeSnakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>
              <label>LABEL<input value={selectedSlot.label} onChange={(event) => updateSelectedSlot({ label: event.target.value })} /></label>
              <div className="rr7-grid"><label>WIDTH<input type="number" value={selectedSlot.w} onChange={(event) => updateSelectedSlot({ w: Math.max(10, Number(event.target.value) || 10) })} /></label><label>DEPTH<input type="number" value={selectedSlot.h} onChange={(event) => updateSelectedSlot({ h: Math.max(10, Number(event.target.value) || 10, ) })} /></label><label>HEIGHT<input type="number" value={selectedSlot.height} onChange={(event) => updateSelectedSlot({ height: Math.max(1, Number(event.target.value) || 1) })} /></label><label>ELEVATION<input type="number" value={selectedSlot.z} onChange={(event) => updateSelectedSlot({ z: Math.max(0, Number(event.target.value) || 0) })} /></label></div>
              <div className="rr7-stack"><strong>Stacking</strong><small>{selectedSlot.stackGroupId ? `Stack ${selectedSlot.stackIndex + 1}` : "Floor level"}</small><div><button onClick={stackAbove}>Stack above</button><button onClick={unstack}>Unstack</button></div></div>
              <div className="rr7-actions"><button className="rr7-danger" onClick={removeSelected}>Remove vivarium</button></div>
            </> : selectedObject ? <>
              <div className="rr7-inspector-title"><span>ROOM OBJECT</span><h2>{selectedObject.label}</h2></div>
              <label>LABEL<input value={selectedObject.label} onChange={(event) => updateSelectedObject({ label: event.target.value })} /></label>
              <div className="rr7-grid"><label>WIDTH<input type="number" value={selectedObject.width} onChange={(event) => updateSelectedObject({ width: Math.max(5, Number(event.target.value) || 5) })} /></label><label>DEPTH<input type="number" value={selectedObject.depth} onChange={(event) => updateSelectedObject({ depth: Math.max(5, Number(event.target.value) || 5) })} /></label><label>HEIGHT<input type="number" value={selectedObject.height} onChange={(event) => updateSelectedObject({ height: Math.max(1, Number(event.target.value) || 1) })} /></label><label>ROTATION<input type="number" value={selectedObject.rotation} onChange={(event) => updateSelectedObject({ rotation: Number(event.target.value) || 0 })} /></label></div>
              <div className="rr7-stack"><strong>Spatial placement</strong><small>{selectedObject.wall ? `Snapped to ${selectedObject.wall} wall` : "Free placement"}</small><div>{WALLS.map((wall) => <button key={wall} onClick={() => updateSelectedObject({ wall })}>{wall}</button>)}</div></div>
              <div className="rr7-actions"><button className="rr7-danger" onClick={removeSelected}>Remove object</button></div>
            </> : <div className="rr7-no-selection">Select a vivarium or room object to inspect its dimensions, placement and spatial controls.</div>}
          </aside>
        </div>

        <div className="rr7-footer"><span>Rooms: {rooms.length}</span><span>Vivarium slots: {slots.length}</span><span>Free snakes: {freeSnakes.length}</span><span className={editing ? "" : "rr7-bad"}>{editing ? "Drag mode enabled" : "Drag mode disabled"}</span></div>
      </>}
    </main>
  );
}
