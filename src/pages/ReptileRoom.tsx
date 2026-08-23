import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import type { EquipmentMaintenanceItem, EquipmentMaintenanceStatus } from "../types/EquipmentMaintenance";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room.css";

const ROOM_STORAGE_KEY = "tinyTitans.reptileRoom.layout.v3";
const ROOM_MAX_LENGTH_PERCENT = 34;
const SNAP_DISTANCE = 3;

type RoomSlot = { id: string; snakeId: string | null; label: string; x: number; y: number; w: number; h: number; lockX?: number; lockY?: number };
type LayoutPreset = "freeform" | "double-stack" | "rack";
type SnapResult = { x: number; y: number; lockX?: number; lockY?: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function readLayout(): RoomSlot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOM_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is RoomSlot => Boolean(item && typeof item.id === "string" && (item.snakeId === null || typeof item.snakeId === "string") && typeof item.label === "string" && typeof item.x === "number" && typeof item.y === "number" && typeof item.w === "number" && typeof item.h === "number"));
  } catch { return []; }
}

function saveLayout(layout: RoomSlot[]) {
  try { localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(layout)); } catch { /* layout is a local UI preference */ }
}

function roomScale(snakes: Snake[]): number {
  const longest = Math.max(...snakes.map((snake) => Number(snake.enclosure?.length) || 0), 0);
  return longest > 0 ? ROOM_MAX_LENGTH_PERCENT / longest : 0.22;
}

function slotSize(snake: Snake | null, scale: number): { w: number; h: number } {
  const length = Number(snake?.enclosure?.length) || 0;
  const width = Number(snake?.enclosure?.width) || 0;
  if (length > 0 && width > 0 && scale > 0) return { w: clamp(Number((length * scale).toFixed(2)), 8, 60), h: clamp(Number((width * scale).toFixed(2)), 6, 45) };
  return { w: 22, h: 16 };
}

function defaultSlots(snakes: Snake[]): RoomSlot[] {
  const scale = roomScale(snakes);
  return snakes.map((snake, index) => { const size = slotSize(snake, scale); return { id: `viv-${index + 1}`, snakeId: snake.id, label: `Vivarium ${String(index + 1).padStart(2, "0")}`, x: (index % 3) * 31 + 2, y: Math.floor(index / 3) * 31 + 3, ...size }; });
}

function dueDate(item: EquipmentMaintenanceItem): Date | null {
  const base = item.lastReplacedDate || item.installedDate;
  if (!base || !item.serviceIntervalDays || item.serviceIntervalDays <= 0) return null;
  const date = new Date(`${base}T00:00:00`); date.setDate(date.getDate() + item.serviceIntervalDays); return date;
}

function equipmentStatus(item: EquipmentMaintenanceItem, today = new Date()): EquipmentMaintenanceStatus {
  const due = dueDate(item); if (!due) return "unknown";
  const reminder = new Date(due); reminder.setDate(reminder.getDate() - Math.max(0, item.reminderLeadDays || 0));
  if (today >= due) return "overdue"; if (today >= reminder) return "upcoming"; return "ok";
}

function daysUntil(date: Date | null, today = new Date()): number | null {
  if (!date) return null;
  const start = new Date(today); start.setHours(0, 0, 0, 0); const target = new Date(date); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / 86400000);
}

function statusText(status: EquipmentMaintenanceStatus, days: number | null): string {
  if (status === "overdue") return days === null ? "Due" : `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (status === "upcoming") return days === null ? "Due soon" : days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} remaining`;
  if (status === "ok") return days === null ? "Tracked" : `${days} day${days === 1 ? "" : "s"} remaining`;
  return "Service interval not set";
}

function applyPreset(slots: RoomSlot[], preset: LayoutPreset): RoomSlot[] {
  return slots.map((slot, index) => {
    if (preset === "double-stack") return { ...slot, x: 3 + (index % 3) * 32, y: 4 + Math.floor(index / 3) * 43, lockX: undefined, lockY: undefined };
    if (preset === "rack") return { ...slot, x: 3 + (index % 4) * 24, y: 5 + Math.floor(index / 4) * 31, lockX: undefined, lockY: undefined };
    return { ...slot, x: clamp(slot.x, 1, 99 - slot.w), y: clamp(slot.y, 1, 99 - slot.h), lockX: undefined, lockY: undefined };
  });
}

function findSnap(moving: RoomSlot, others: RoomSlot[]): SnapResult {
  let best: { distance: number; x: number; y: number; lockX?: number; lockY?: number } | null = null;
  const candidates: SnapResult[] = [];
  for (const other of others) {
    const verticalOverlap = moving.y < other.y + other.h && moving.y + moving.h > other.y;
    const horizontalOverlap = moving.x < other.x + other.w && moving.x + moving.w > other.x;
    const alignedX = [other.x, other.x + other.w / 2 - moving.w / 2, other.x + other.w - moving.w];
    const alignedY = [other.y, other.y + other.h / 2 - moving.h / 2, other.y + other.h - moving.h];
    if (verticalOverlap) {
      candidates.push({ x: other.x - moving.w, y: moving.y, lockX: other.x - moving.w, lockY: moving.y });
      candidates.push({ x: other.x + other.w, y: moving.y, lockX: other.x + other.w, lockY: moving.y });
    }
    if (horizontalOverlap) {
      candidates.push({ x: moving.x, y: other.y - moving.h, lockX: moving.x, lockY: other.y - moving.h });
      candidates.push({ x: moving.x, y: other.y + other.h, lockX: moving.x, lockY: other.y + other.h });
    }
    for (const x of alignedX) {
      candidates.push({ x, y: other.y - moving.h, lockX: x, lockY: other.y - moving.h });
      candidates.push({ x, y: other.y + other.h, lockX: x, lockY: other.y + other.h });
    }
    for (const y of alignedY) {
      candidates.push({ x: other.x - moving.w, y, lockX: other.x - moving.w, lockY: y });
      candidates.push({ x: other.x + other.w, y, lockX: other.x + other.w, lockY: y });
    }
  }
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - moving.x, candidate.y - moving.y);
    if (distance <= SNAP_DISTANCE && (!best || distance < best.distance)) best = { distance, ...candidate };
  }
  if (!best) return { x: moving.x, y: moving.y };
  return { x: clamp(best.x, 1, 99 - moving.w), y: clamp(best.y, 1, 99 - moving.h), lockX: best.lockX, lockY: best.lockY };
}

export default function ReptileRoom() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [slots, setSlots] = useState<RoomSlot[]>(() => readLayout());
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savingSnakeId, setSavingSnakeId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoadingSnakes(true);
    try {
      const loaded = await getUserSnakes(user.uid);
      setSnakes(loaded);
      setSlots((current) => {
        const base = current.length ? current : defaultSlots(loaded);
        const scale = roomScale(loaded);
        const known = new Set(loaded.map((snake) => snake.id));
        const cleaned = base.map((slot) => {
          const snake = slot.snakeId ? loaded.find((item) => item.id === slot.snakeId) : null;
          return { ...slot, snakeId: slot.snakeId && known.has(slot.snakeId) ? slot.snakeId : null, ...(snake ? slotSize(snake, scale) : {}) };
        });
        saveLayout(cleaned); return cleaned;
      });
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load your reptile room."); }
    finally { setLoadingSnakes(false); }
  };

  useEffect(() => { if (!loading && !profileLoading && user) void reload(); }, [user, loading, profileLoading]);

  const snakeById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const assignedSnakeIds = useMemo(() => new Set(slots.map((slot) => slot.snakeId).filter((id): id is string => Boolean(id))), [slots]);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedSnake = selectedSlot?.snakeId ? snakeById.get(selectedSlot.snakeId) ?? null : null;
  const maintenance = selectedSnake?.enclosure?.equipmentMaintenance ?? [];
  const dueCount = maintenance.filter((item) => ["overdue", "upcoming"].includes(equipmentStatus(item))).length;
  const scale = roomScale(snakes);

  function persist(next: RoomSlot[]) { setSlots(next); saveLayout(next); }

  function addVivarium(source?: RoomSlot) {
    const nextNumber = slots.length + 1;
    const size = source ? { w: source.w, h: source.h } : { w: 22, h: 16 };
    const x = source ? clamp(source.x + 8, 1, 99 - size.w) : 4 + (slots.length % 3) * 31;
    const y = source ? clamp(source.y + source.h + 4, 1, 99 - size.h) : 4 + Math.floor(slots.length / 3) * 31;
    const next = [...slots, { id: `viv-${Date.now()}`, snakeId: null, label: `Vivarium ${String(nextNumber).padStart(2, "0")}`, x, y, ...size }];
    persist(next); setSelectedSlotId(next[next.length - 1].id);
  }

  function assignSnake(slotId: string, snakeId: string) {
    const targetSnakeId = snakeId || null;
    const existing = slots.find((slot) => slot.snakeId === targetSnakeId && Boolean(targetSnakeId));
    const snake = targetSnakeId ? snakeById.get(targetSnakeId) : null;
    const size = snake ? slotSize(snake, scale) : null;
    persist(slots.map((slot) => {
      if (slot.id === slotId) return { ...slot, snakeId: targetSnakeId, ...(size || {}), lockX: undefined, lockY: undefined };
      if (existing && slot.id === existing.id) return { ...slot, snakeId: null, lockX: undefined, lockY: undefined };
      return slot;
    }));
  }

  function moveSlot(slotId: string, clientX: number, clientY: number, rect: DOMRect) {
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    const x = clamp(((clientX - rect.left) / rect.width) * 100 - slot.w / 2, 1, 99 - slot.w);
    const y = clamp(((clientY - rect.top) / rect.height) * 100 - slot.h / 2, 1, 99 - slot.h);
    const snapped = findSnap({ ...slot, x, y }, slots.filter((item) => item.id !== slotId));
    const grid = (value: number) => Math.round(value / 2) * 2;
    setSlots((current) => current.map((item) => item.id === slotId ? { ...item, x: snapped.lockX === undefined ? grid(snapped.x) : snapped.x, y: snapped.lockY === undefined ? grid(snapped.y) : snapped.y, lockX: snapped.lockX, lockY: snapped.lockY } : item));
  }

  function finishDrag() {
    if (!draggingId) return;
    const dragged = slots.find((slot) => slot.id === draggingId);
    if (dragged) {
      const released = findSnap(dragged, slots.filter((slot) => slot.id !== draggingId));
      persist(slots.map((slot) => slot.id === draggingId ? { ...slot, ...released } : slot));
    }
    setDraggingId(null); dragStart.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>, slotId: string) {
    if (!editMode) return;
    const canvas = event.currentTarget.closest(".reptile-room-canvas") as HTMLElement | null;
    if (!canvas) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(slotId);
    dragStart.current = { x: event.clientX, y: event.clientY };
    const onMove = (moveEvent: PointerEvent) => moveSlot(slotId, moveEvent.clientX, moveEvent.clientY, canvas.getBoundingClientRect());
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); finishDrag(); };
    document.addEventListener("pointermove", onMove); document.addEventListener("pointerup", onUp);
  }

  function resetLayout() { persist(applyPreset(slots, "double-stack")); setMessage("Room arranged into a double-stack starting layout. Drag any vivarium to customise it."); }

  async function recordReplacement(item: EquipmentMaintenanceItem) {
    if (!user || !selectedSnake?.enclosure) return;
    setSavingSnakeId(selectedSnake.id); setMessage("");
    const today = new Date().toISOString().slice(0, 10);
    const nextItems = (selectedSnake.enclosure.equipmentMaintenance ?? []).map((entry) => entry.id === item.id ? { ...entry, lastReplacedDate: today } : entry);
    try {
      const updated = await updateUserSnake(user.uid, { ...selectedSnake, enclosure: { ...selectedSnake.enclosure, equipmentMaintenance: nextItems } });
      setSnakes((current) => current.map((snake) => snake.id === updated.id ? updated : snake));
      setMessage(`${item.name} replacement recorded.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the replacement record."); }
    finally { setSavingSnakeId(null); }
  }

  if (loading || profileLoading || loadingSnakes) return <div className="page-container"><BackHomeButton /><h1>🏠 My Reptile Room</h1><div className="tracker-card"><h3>Building your room...</h3><p>Loading your Tiny Titans and their enclosure records.</p></div></div>;

  return (
    <div className="page-container reptile-room-page">
      <BackHomeButton />
      <header className="reptile-room-header">
        <div><p className="reptile-room-eyebrow">🏠 MY SNAKES • REPTILE ROOM</p><h1>Build Your Reptile Room</h1><p className="page-subtitle">Build the room you actually own — stacked vivariums, racks, wall builds or a completely custom layout. The physical arrangement belongs to the room; enclosure husbandry still belongs to the snake.</p></div>
        <div className="room-toolbar"><button type="button" className={`husbandry-button ${editMode ? "is-active" : ""}`} onClick={() => setEditMode((value) => !value)}>{editMode ? "🔒 Finish arranging" : "✋ Arrange room"}</button><button type="button" className="add-snake-button" onClick={() => addVivarium()}>➕ Add Vivarium</button></div>
      </header>
      {message && <p className="reptile-room-message" role="status">{message}</p>}
      <section className="reptile-room-summary"><strong>{snakes.length} Tiny Titan{snakes.length === 1 ? "" : "s"}</strong><span>{slots.filter((slot) => slot.snakeId).length} occupied</span><span>{slots.filter((slot) => !slot.snakeId).length} empty</span><span>🧠 Snake data follows the snake</span><span>🧲 Magnetic snapping</span></section>
      <div className="room-layout-tools" aria-label="Room layout tools"><span>Layout:</span><button type="button" onClick={() => persist(applyPreset(slots, "freeform"))}>↗️ Freeform</button><button type="button" onClick={() => persist(applyPreset(slots, "double-stack"))}>▦ Double-stack</button><button type="button" onClick={() => persist(applyPreset(slots, "rack"))}>▤ Rack</button><button type="button" onClick={resetLayout}>↺ Reset arrangement</button><span className="room-layout-hint">Drag vivariums together to magnetically snap their edges. Pull one away to release it.</span></div>
      <section className="reptile-room-canvas" aria-label="Your custom reptile room layout"><div className="room-wall-label">YOUR REPTILE ROOM • PROPORTIONAL SCALE</div>{slots.map((slot) => { const snake = slot.snakeId ? snakeById.get(slot.snakeId) : null; const enclosure = snake?.enclosure; const itemCount = enclosure?.equipmentMaintenance?.length ?? 0; const locked = slot.lockX !== undefined || slot.lockY !== undefined; return <button type="button" key={slot.id} className={`vivarium-card ${selectedSlotId === slot.id ? "is-selected" : ""} ${draggingId === slot.id ? "is-dragging" : ""} ${locked ? "is-locked" : ""}`} style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }} onClick={() => { if (!draggingId) setSelectedSlotId(slot.id); }} onPointerDown={(event) => handlePointerDown(event, slot.id)} aria-label={`${slot.label}${snake ? `, ${snake.name}` : ", empty"}`}><span className="vivarium-label">{slot.label}</span><span className="vivarium-glass" aria-hidden="true"><span className="vivarium-substrate" /><span className="vivarium-hide">▰</span>{snake ? <span className="vivarium-snake">〰 {snake.name}</span> : <span className="vivarium-empty">EMPTY VIVARIUM</span>}</span><span className="vivarium-card-info">{snake ? `${enclosure?.length || "?"} × ${enclosure?.width || "?"} × ${enclosure?.height || "?"} cm` : "Empty enclosure"}</span><span className="vivarium-card-meta">{snake ? `${enclosure?.heatingType || "Heating not recorded"} • ${itemCount} equipment item${itemCount === 1 ? "" : "s"}` : "Drag into place or assign a Tiny Titan"}</span>{editMode && <span className="vivarium-drag-hint">✋ drag</span>}{locked && <span className="vivarium-lock-indicator" title="Magnetically aligned">🧲</span>}</button>; })}{!slots.length && <div className="reptile-room-empty"><strong>Your room is empty.</strong><p>Add a vivarium or complete enclosure records for your snakes to build the room automatically.</p><button type="button" className="add-snake-button" onClick={() => addVivarium()}>➕ Add First Vivarium</button></div>}</section>
      {selectedSlot && <section className="vivarium-detail-panel"><div className="vivarium-detail-heading"><div><p className="reptile-room-eyebrow">{selectedSlot.label}</p><h2>{selectedSnake ? `${selectedSnake.name}'s Vivarium` : "Empty Vivarium"}</h2></div><div className="room-detail-actions"><button type="button" className="husbandry-button" onClick={() => addVivarium(selectedSlot)}>⧉ Duplicate position</button><button type="button" className="husbandry-button" onClick={() => setSelectedSlotId(null)}>Close</button></div></div><label className="room-field"><span>Assign Tiny Titan</span><select value={selectedSlot.snakeId ?? ""} onChange={(event) => assignSnake(selectedSlot.id, event.target.value)}><option value="">— Empty —</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}{assignedSnakeIds.has(snake.id) && selectedSlot.snakeId !== snake.id ? " (move here)" : ""}</option>)}</select></label>{selectedSnake && <><div className="room-source-note">🧠 <strong>Live enclosure record:</strong> these details are read directly from {selectedSnake.name}'s saved enclosure profile. Moving the vivarium never moves or duplicates the snake's husbandry data.</div><div className="room-setup-grid"><div><span>📐 Size</span><strong>{selectedSnake.enclosure ? `${selectedSnake.enclosure.length} × ${selectedSnake.enclosure.width} × ${selectedSnake.enclosure.height} cm` : "Not recorded"}</strong></div><div><span>🔥 Heating</span><strong>{selectedSnake.enclosure?.heatingType || "Not recorded"}</strong></div><div><span>🪵 Substrate</span><strong>{selectedSnake.enclosure?.customSubstrate || selectedSnake.enclosure?.substrate || "Not recorded"}</strong></div><div><span>🌡️ Warm / cool</span><strong>{selectedSnake.enclosure?.warmSideTemperature ?? "—"}° / {selectedSnake.enclosure?.coolSideTemperature ?? "—"}°C</strong></div><div><span>💧 Humidity</span><strong>{selectedSnake.enclosure?.humidity ?? "—"}%</strong></div><div><span>☀️ UVB</span><strong>{selectedSnake.enclosure?.uvbEnabled ? selectedSnake.enclosure.uvbDetails || "Provided" : "Not recorded"}</strong></div></div><div className="room-detail-actions"><a href={`/snakes/${selectedSnake.id}/enclosure`}>✏️ Open Enclosure Tab</a><a href={`/snakes/${selectedSnake.id}`}>👁️ Open Snake Profile</a></div><section className="equipment-maintenance-panel"><div className="equipment-heading"><div><p className="reptile-room-eyebrow">🔧 EQUIPMENT LIFE & MAINTENANCE</p><h3>Replacement tracker</h3><p>Use the manufacturer's service-life guidance where available. Tiny Titans treats these intervals as reminders, not guarantees.</p></div>{dueCount > 0 && <span className="equipment-count-badge">⚠️ {dueCount} due / upcoming</span>}</div>{maintenance.length ? <div className="equipment-list">{maintenance.map((item) => { const status = equipmentStatus(item); const due = dueDate(item); const days = daysUntil(due); return <article key={item.id} className={`equipment-item equipment-${status}`}><div><strong>{item.name}</strong><span>{item.kind}{item.manufacturer ? ` • ${item.manufacturer}` : ""}{item.model ? ` • ${item.model}` : ""}</span>{item.manufacturerServiceLife && <small>Manufacturer guidance: {item.manufacturerServiceLife}</small>}</div><div className="equipment-timing"><strong>{statusText(status, days)}</strong><small>{due ? `Target replacement: ${due.toLocaleDateString()}` : "Set an installed/replacement date and interval in the enclosure record."}</small></div><div className="equipment-actions">{item.replacementNotificationsEnabled && <span title="Replacement reminder enabled">🔔</span>}<button type="button" onClick={() => void recordReplacement(item)} disabled={savingSnakeId === selectedSnake.id}>♻️ Replaced today</button></div></article>; })}</div> : <div className="equipment-empty"><strong>No equipment service records yet.</strong><p>Add equipment service-life records to the enclosure profile and they will appear here automatically.</p></div>}</section></>}</section>}
    </div>
  );
}
