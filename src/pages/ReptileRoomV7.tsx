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
import "../styles/reptile-room-v7.css";

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
    const copy = { ...room, id: id("room"), name: `${room.name} — Planning Copy`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), slots: room.slots.map((slot) => ({ ...slot, id: id("viv"), snakeId: null, label: `${slot.label} plan`, lifecycleStatus: "empty" as VivariumLifecycleStatus, availability: "available" as VivariumAvailability, stackGroupId: null, stackIndex: 0, parentSlotId: null, z: 0 })), storedSlots: room.storedSlots.map((slot) => ({ ...slot, id: id("viv") })), objects: (room.objects ?? []).map((object) => ({ ...object, id: id("obj") })) };
    void persist([...rooms, copy], "Planning copy created — no snakes were moved."); setRoomId(copy.id); setSelected(null);
  }

  async function removeRoom() {
    if (!room || rooms.length <= 1 || !user) return;
    const remaining = rooms.filter((item) => item.id !== room.id);
    try { await deleteReptileRoom(user.uid, room.id); setRooms(remaining); setRoomId(remaining[0].id); setSelected(null); setNotice("Room removed."); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to remove room."); }
  }

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h1>🏠 Build Your Reptile Room</h1><div className="tracker-card">Loading your room…</div></div>;
  if (!room) return <div className="page-container"><BackHomeButton /><h1>🏠 Build Your Reptile Room</h1><div className="rr7-empty"><h2>Let's build your first room.</h2><p>Create a real room, then place your vivariums and equipment inside it.</p><button type="button" onClick={() => { const created = newRoom("Main Reptile Room", "custom", snakes); setRooms([created]); setRoomId(created.id); }}>Create Main Reptile Room</button></div></div>;

  const scale = Math.min(1, 920 / width, 620 / depth);
  const floorWidth = width * scale;
  const floorDepth = depth * scale;
  const highest = Math.max(0, ...slots.map((slot) => slot.z + (slot.height ?? VIV.height)), ...objects.map((object) => object.z + object.height));
  const selectedLabel = selectedSlot ? (snakesById.get(selectedSlot.snakeId ?? "")?.name ?? selectedSlot.label) : selectedObject?.label ?? "Nothing selected";

  return <div className="page-container reptile-room-v7">
    <BackHomeButton />
    <header className="rr7-header"><div><span className="rr7-kicker">🏠 MY SNAKES · ROOM BUILDER</span><h1>Build Your Reptile Room</h1><p>Design the physical room, place real vivariums, stack them vertically, add furniture and keep every snake record attached to its vivarium.</p></div><div className="rr7-header-actions"><button type="button" className={editing ? "rr7-primary" : ""} onClick={() => setEditing((value) => !value)}>{editing ? "🔒 Finish arranging" : "✏ Arrange room"}</button><button type="button" className="rr7-primary" onClick={addVivarium}>＋ Vivarium</button></div></header>
    {notice && <div className="rr7-notice" role="status">{notice}</div>}

    <section className="rr7-workspaces"><div className="rr7-section-title"><div><span>ROOM WORKSPACES</span><h2>{rooms.length} room{rooms.length === 1 ? "" : "s"}</h2></div><div className="rr7-actions"><select value={template} onChange={(event) => setTemplate(event.target.value as ReptileRoomTemplate)}>{templates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" onClick={() => { const created = newRoom(templates.find(([value]) => value === template)?.[1] ?? "New Room", template, snakes); void persist([...rooms, created], "Room created."); setRoomId(created.id); setSelected(null); }}>＋ New room</button><button type="button" onClick={duplicateRoom}>⧉ Duplicate</button></div></div><div className="rr7-room-tabs">{rooms.map((item) => <button key={item.id} type="button" className={item.id === room.id ? "is-active" : ""} onClick={() => { setRoomId(item.id); setSelected(null); }}>{item.name}<small>{item.slots.filter((slot) => slot.snakeId).length}/{item.slots.length} occupied</small></button>)}</div></section>

    <section className="rr7-spec"><div><span>ROOM</span><input value={room.name} onChange={(event) => setRooms((current) => current.map((item) => item.id === room.id ? { ...item, name: event.target.value } : item))} onBlur={() => void persist(rooms, "Room name saved.")} /></div><label>Units<select value={unit} onChange={(event) => updateRoom((current) => ({ ...current, unit: event.target.value as ReptileRoomUnit }))}><option value="metric">cm</option><option value="imperial">in</option></select></label><label>Width<input type="number" min="50" value={cm(width, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, width: Math.max(50, toCm(Number(event.target.value), unit)) }))} /></label><label>Depth<input type="number" min="50" value={cm(depth, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, depth: Math.max(50, toCm(Number(event.target.value), unit)) }))} /></label><label>Height<input type="number" min="50" value={cm(height, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, height: Math.max(50, toCm(Number(event.target.value), unit)) }))} /></label><div className="rr7-metric"><strong>{slots.length}</strong><span>vivariums</span></div><div className="rr7-metric"><strong>{labelDim(highest, unit)}</strong><span>highest point</span></div><button type="button" className="rr7-danger" disabled={rooms.length <= 1} onClick={() => void removeRoom()}>🗑 Room</button></section>

    <section className="rr7-toolbar"><div className="rr7-view"><span>View</span><button type="button" className={view === "floor" ? "is-active" : ""} onClick={() => setView("floor")}>▦ Floor</button><button type="button" className={view === "elevation" ? "is-active" : ""} onClick={() => setView("elevation")}>▥ Elevation</button></div><div><span>Furniture</span>{OBJECTS.map(([kind, label]) => <button key={kind} type="button" onClick={() => addObject(kind)}>＋ {label}</button>)}</div><div className="rr7-save">{saving ? "⟳ Saving…" : "✓ Saved"}</div></section>

    <main className="rr7-builder">
      <section className="rr7-canvas-card"><div className="rr7-canvas-head"><div><strong>{room.name}</strong><span>{labelDim(width, unit)} × {labelDim(depth, unit)} × {labelDim(height, unit)}</span></div><div><button type="button" onClick={() => updateRoom((current) => ({ ...current, slots: current.slots.map((slot, index) => ({ ...slot, x: clamp(10 + (index % 4) * (slot.w + 8), 0, width - slot.w), y: clamp(10 + Math.floor(index / 4) * (slot.h + 8), 0, depth - slot.h) })) }), "Grid layout applied.")}>▦ Grid</button><button type="button" onClick={() => updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => ({ ...slot, x: 8, y: slot.y })) }), "Wall layout applied.")}>🧱 Wall</button></div></div>
        {view === "floor" ? <div className="rr7-floor-scroll"><div className="rr7-floor" style={{ width: floorWidth, height: floorDepth }}>
          <span className="rr7-wall north">NORTH</span><span className="rr7-wall south">SOUTH</span><span className="rr7-wall west">WEST</span><span className="rr7-wall east">EAST</span>
          {slots.map((slot) => { const selectedSlotNow = selected?.type === "slot" && selected.id === slot.id; const snake = slot.snakeId ? snakesById.get(slot.snakeId) : null; return <button key={slot.id} type="button" className={`rr7-item rr7-viv ${selectedSlotNow ? "is-selected" : ""} ${dragging === slot.id ? "is-dragging" : ""}`} style={{ left: slot.x * scale, top: slot.y * scale, width: slot.w * scale, height: slot.h * scale, zIndex: selectedSlotNow ? 500 : 20 + Math.round(slot.z) }} onPointerDown={(event) => moveSelected(event, "slot", slot.id)} onClick={() => setSelected({ type: "slot", id: slot.id })}><strong>{snake?.name ?? slot.label}</strong><small>{slot.stackGroupId ? `Stack L${(slot.stackIndex ?? 0) + 1}` : "Floor"} · Z {labelDim(slot.z, unit)}</small></button>; })}
          {objects.map((object) => { const selectedObjectNow = selected?.type === "object" && selected.id === object.id; const size = worldSize(object); return <button key={object.id} type="button" className={`rr7-item rr7-object rr7-${object.kind} ${selectedObjectNow ? "is-selected" : ""}`} style={{ left: object.x * scale, top: object.y * scale, width: size.w * scale, height: size.d * scale, zIndex: selectedObjectNow ? 600 : 100 + Math.round(object.z) }} onPointerDown={(event) => moveSelected(event, "object", object.id)} onClick={() => setSelected({ type: "object", id: object.id })}><strong>{object.kind === "door" ? "🚪" : object.kind === "window" ? "🪟" : object.kind === "vent" ? "🌬" : "▦"}</strong><span>{object.label}</span></button>; })}
        </div></div> : <div className="rr7-elevation"><div className="rr7-elevation-wall" style={{ width: floorWidth, height: Math.max(360, height * scale) }}>{slots.map((slot) => <button key={slot.id} type="button" className={`rr7-elev-item ${selected?.type === "slot" && selected.id === slot.id ? "is-selected" : ""}`} style={{ left: slot.x * scale, bottom: slot.z * scale, width: slot.w * scale, height: (slot.height ?? VIV.height) * scale }} onClick={() => setSelected({ type: "slot", id: slot.id })}><strong>{snakesById.get(slot.snakeId ?? "")?.name ?? slot.label}</strong><small>Z {labelDim(slot.z, unit)}</small></button>)}</div><p>Elevation makes vertical stacking and real Z heights obvious.</p></div>}
      </section>

      <aside className="rr7-inspector">{selectedSlot ? <><div className="rr7-inspector-title"><span>🐍 VIVARIUM</span><h2>{selectedLabel}</h2></div><label>Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => assignSnake(event.target.value)}><option value="">No snake assigned</option>{freeSnakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label><div className="rr7-grid"><label>Width<input type="number" value={cm(selectedSlot.w, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, w: Math.max(5, toCm(Number(event.target.value), unit)) } : slot) }))} /></label><label>Depth<input type="number" value={cm(selectedSlot.h, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, h: Math.max(5, toCm(Number(event.target.value), unit)), depth: Math.max(5, toCm(Number(event.target.value), unit)) } : slot) }))} /></label><label>Height<input type="number" value={cm(selectedSlot.height ?? VIV.height, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, height: Math.max(5, toCm(Number(event.target.value), unit)) } : slot) }))} /></label><label>Z height<input type="number" value={cm(selectedSlot.z, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, z: Math.max(0, toCm(Number(event.target.value), unit)) } : slot) }))} /></label></div><label>Label<input value={selectedSlot.label} onChange={(event) => updateRoom((current) => ({ ...current, slots: current.slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, label: event.target.value } : slot) }))} /></label><div className="rr7-stack"><strong>Stacking</strong><div><button type="button" onClick={stackAbove}>⬆ Stack above</button><button type="button" onClick={unstack}>↕ Floor</button></div><small>{selectedSlot.stackGroupId ? `Level ${(selectedSlot.stackIndex ?? 0) + 1} · Z ${labelDim(selectedSlot.z, unit)}` : "Floor level"}</small></div><button type="button" className="rr7-danger" onClick={removeSelected}>🗑 Remove vivarium</button></> : selectedObject ? <><div className="rr7-inspector-title"><span>🧱 ROOM OBJECT</span><h2>{selectedObject.label}</h2></div><label>Label<input value={selectedObject.label} onChange={(event) => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, label: event.target.value } : object) }))} /></label><div className="rr7-grid"><label>Width<input type="number" value={cm(selectedObject.width, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, width: Math.max(1, toCm(Number(event.target.value), unit)) } : object) }))} /></label><label>Depth<input type="number" value={cm(selectedObject.depth, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, depth: Math.max(1, toCm(Number(event.target.value), unit)) } : object) }))} /></label><label>Height<input type="number" value={cm(selectedObject.height, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, height: Math.max(1, toCm(Number(event.target.value), unit)) } : object) }))} /></label><label>Z height<input type="number" value={cm(selectedObject.z, unit).toFixed(1)} onChange={(event) => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, z: Math.max(0, toCm(Number(event.target.value), unit)) } : object) }))} /></label></div>{(selectedObject.kind === "door" || selectedObject.kind === "window" || selectedObject.kind === "vent") && <label>Wall<select value={selectedObject.wall ?? "none"} onChange={(event) => updateRoom((current) => ({ ...current, objects: (current.objects ?? []).map((object) => object.id === selectedObject.id ? { ...object, wall: event.target.value === "none" ? null : event.target.value as ReptileWall } : object) }))}><option value="none">Free standing</option>{WALLS.map((wall) => <option key={wall} value={wall}>{wall}</option>)}</select></label>}<button type="button" className="rr7-danger" onClick={removeSelected}>🗑 Remove object</button></> : <div className="rr7-no-selection"><strong>Select something in the room.</strong><p>Click a vivarium or furniture item to edit its real dimensions, assignment, elevation and placement.</p></div>}</aside>
    </main>
    <footer className="rr7-footer"><span>{slots.filter((slot) => slot.snakeId).length} snakes placed</span><span>{objects.length} room objects</span><span>{rooms.reduce((sum, item) => sum + item.storedSlots.length, 0)} stored assets</span><span className={highest > height ? "rr7-bad" : ""}>{highest > height ? "⚠ Asset exceeds room height" : "✓ Geometry within room height"}</span></footer>
  </div>;
}
