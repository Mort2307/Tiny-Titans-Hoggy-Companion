import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import type { EquipmentMaintenanceItem, EquipmentMaintenanceStatus } from "../types/EquipmentMaintenance";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-room.css";

const ROOM_STORAGE_KEY = "tinyTitans.reptileRoom.layout.v1";

type RoomSlot = { id: string; snakeId: string | null; label: string };

function readLayout(): RoomSlot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOM_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is RoomSlot => Boolean(item && typeof item.id === "string" && (item.snakeId === null || typeof item.snakeId === "string") && typeof item.label === "string"));
  } catch { return []; }
}

function saveLayout(layout: RoomSlot[]) {
  try { localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(layout)); } catch { /* optional device preference */ }
}

function dueDate(item: EquipmentMaintenanceItem): Date | null {
  const base = item.lastReplacedDate || item.installedDate;
  if (!base || !item.serviceIntervalDays || item.serviceIntervalDays <= 0) return null;
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + item.serviceIntervalDays);
  return date;
}

function equipmentStatus(item: EquipmentMaintenanceItem, today = new Date()): EquipmentMaintenanceStatus {
  const due = dueDate(item);
  if (!due) return "unknown";
  const reminder = new Date(due);
  reminder.setDate(reminder.getDate() - Math.max(0, item.reminderLeadDays || 0));
  if (today >= due) return "overdue";
  if (today >= reminder) return "upcoming";
  return "ok";
}

function daysUntil(date: Date | null, today = new Date()): number | null {
  if (!date) return null;
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / 86400000);
}

function statusText(status: EquipmentMaintenanceStatus, days: number | null): string {
  if (status === "overdue") return days === null ? "Due" : `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (status === "upcoming") return days === null ? "Due soon" : days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"} remaining`;
  if (status === "ok") return days === null ? "Tracked" : `${days} day${days === 1 ? "" : "s"} remaining`;
  return "Service interval not set";
}

function defaultSlots(snakes: Snake[]): RoomSlot[] {
  return snakes.map((snake, index) => ({ id: `viv-${index + 1}`, snakeId: snake.id, label: `Vivarium ${String(index + 1).padStart(2, "0")}` }));
}

export default function ReptileRoom() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [slots, setSlots] = useState<RoomSlot[]>(() => readLayout());
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savingSnakeId, setSavingSnakeId] = useState<string | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoadingSnakes(true);
    try {
      const loaded = await getUserSnakes(user.uid);
      setSnakes(loaded);
      setSlots((current) => {
        const base = current.length ? current : defaultSlots(loaded);
        const known = new Set(loaded.map((snake) => snake.id));
        const cleaned = base.map((slot) => ({ ...slot, snakeId: slot.snakeId && known.has(slot.snakeId) ? slot.snakeId : null }));
        saveLayout(cleaned);
        return cleaned;
      });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load your reptile room.");
    } finally { setLoadingSnakes(false); }
  };

  useMemo(() => { if (!loading && !profileLoading && user) void reload(); }, [user, loading, profileLoading]);

  const snakeById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const assignedSnakeIds = useMemo(() => new Set(slots.map((slot) => slot.snakeId).filter((id): id is string => Boolean(id))), [slots]);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedSnake = selectedSlot?.snakeId ? snakeById.get(selectedSlot.snakeId) ?? null : null;
  const maintenance = selectedSnake?.enclosure?.equipmentMaintenance ?? [];
  const dueCount = maintenance.filter((item) => ["due", "overdue", "upcoming"].includes(equipmentStatus(item))).length;

  function persist(next: RoomSlot[]) { setSlots(next); saveLayout(next); }

  function addVivarium() {
    const nextNumber = slots.length + 1;
    persist([...slots, { id: `viv-${Date.now()}`, snakeId: null, label: `Vivarium ${String(nextNumber).padStart(2, "0")}` }]);
  }

  function assignSnake(slotId: string, snakeId: string) {
    const targetSnakeId = snakeId || null;
    const existing = slots.find((slot) => slot.snakeId === targetSnakeId && targetSnakeId);
    const next = slots.map((slot) => {
      if (slot.id === slotId) return { ...slot, snakeId: targetSnakeId };
      if (existing && slot.id === existing.id) return { ...slot, snakeId: null };
      return slot;
    });
    persist(next);
  }

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

  return <div className="page-container reptile-room-page"><BackHomeButton />
    <header className="reptile-room-header"><div><p className="reptile-room-eyebrow">🏠 MY SNAKES • REPTILE ROOM</p><h1>Build Your Reptile Room</h1><p className="page-subtitle">Your room is a visual layer over the enclosure records you already maintain. Move a snake between vivariums and its own setup data follows the snake.</p></div><button type="button" className="add-snake-button" onClick={addVivarium}>➕ Add Vivarium</button></header>
    {message && <p className="reptile-room-message" role="status">{message}</p>}
    <section className="reptile-room-summary"><strong>{snakes.length} Tiny Titan{snakes.length === 1 ? "" : "s"}</strong><span>{slots.filter((slot) => slot.snakeId).length} occupied vivarium{slots.filter((slot) => slot.snakeId).length === 1 ? "" : "s"}</span><span>{slots.filter((slot) => !slot.snakeId).length} empty</span><span>💡 Setup data follows the snake</span></section>
    <section className="reptile-room-layout" aria-label="Your reptile room">
      {slots.map((slot) => {
        const snake = slot.snakeId ? snakeById.get(slot.snakeId) : null;
        const enclosure = snake?.enclosure;
        const itemCount = enclosure?.equipmentMaintenance?.length ?? 0;
        return <button type="button" key={slot.id} className={`vivarium-card ${selectedSlotId === slot.id ? "is-selected" : ""}`} onClick={() => setSelectedSlotId(slot.id)}>
          <span className="vivarium-label">{slot.label}</span><span className="vivarium-glass" aria-hidden="true"><span className="vivarium-substrate" /><span className="vivarium-hide">▰</span>{snake ? <span className="vivarium-snake">〰 {snake.name}</span> : <span className="vivarium-empty">EMPTY VIVARIUM</span>}</span>
          <span className="vivarium-card-info">{snake ? `${enclosure?.length || "?"} × ${enclosure?.width || "?"} × ${enclosure?.height || "?"} cm` : "Assign a Tiny Titan"}</span>
          <span className="vivarium-card-meta">{snake ? `${enclosure?.heatingType || "Heating not recorded"} • ${itemCount} equipment item${itemCount === 1 ? "" : "s"}` : "Tap to assign"}</span>
        </button>;
      })}
      {!slots.length && <div className="reptile-room-empty"><strong>Your room is empty.</strong><p>Add a vivarium to start building the layout.</p><button type="button" className="add-snake-button" onClick={addVivarium}>➕ Add First Vivarium</button></div>}
    </section>

    {selectedSlot && <section className="vivarium-detail-panel"><div className="vivarium-detail-heading"><div><p className="reptile-room-eyebrow">{selectedSlot.label}</p><h2>{selectedSnake ? `${selectedSnake.name}'s Vivarium` : "Empty Vivarium"}</h2></div><button type="button" className="husbandry-button" onClick={() => setSelectedSlotId(null)}>Close</button></div>
      <label className="room-field"><span>Assign Tiny Titan</span><select value={selectedSlot.snakeId ?? ""} onChange={(event) => assignSnake(selectedSlot.id, event.target.value)}><option value="">— Empty —</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}{assignedSnakeIds.has(snake.id) && selectedSlot.snakeId !== snake.id ? " (move here)" : ""}</option>)}</select></label>
      {selectedSnake && <><div className="room-source-note">🧠 <strong>Live enclosure record:</strong> these details are read directly from {selectedSnake.name}'s saved enclosure profile. The room does not create a second copy of the setup.</div><div className="room-setup-grid"><div><span>📐 Size</span><strong>{selectedSnake.enclosure ? `${selectedSnake.enclosure.length} × ${selectedSnake.enclosure.width} × ${selectedSnake.enclosure.height} cm` : "Not recorded"}</strong></div><div><span>🔥 Heating</span><strong>{selectedSnake.enclosure?.heatingType || "Not recorded"}</strong></div><div><span>🪵 Substrate</span><strong>{selectedSnake.enclosure?.customSubstrate || selectedSnake.enclosure?.substrate || "Not recorded"}</strong></div><div><span>🌡️ Warm / cool</span><strong>{selectedSnake.enclosure?.warmSideTemperature ?? "—"}° / {selectedSnake.enclosure?.coolSideTemperature ?? "—"}°C</strong></div><div><span>💧 Humidity</span><strong>{selectedSnake.enclosure?.humidity ?? "—"}%</strong></div><div><span>☀️ UVB</span><strong>{selectedSnake.enclosure?.uvbEnabled ? selectedSnake.enclosure.uvbDetails || "Provided" : "Not recorded"}</strong></div></div>
        <div className="room-detail-actions"><a href={`/snakes/${selectedSnake.id}/enclosure`}>✏️ Open Enclosure Tab</a><a href={`/snakes/${selectedSnake.id}`}>👁️ Open Snake Profile</a></div>
        <section className="equipment-maintenance-panel"><div className="equipment-heading"><div><p className="reptile-room-eyebrow">🔧 EQUIPMENT LIFE & MAINTENANCE</p><h3>Replacement tracker</h3><p>Use the manufacturer's service-life guidance where available. Tiny Titans treats these intervals as reminders, not guarantees.</p></div>{dueCount > 0 && <span className="equipment-count-badge">⚠️ {dueCount} due / upcoming</span>}</div>{maintenance.length ? <div className="equipment-list">{maintenance.map((item) => { const status = equipmentStatus(item); const due = dueDate(item); const days = daysUntil(due); return <article key={item.id} className={`equipment-item equipment-${status}`}><div><strong>{item.name}</strong><span>{item.kind}{item.manufacturer ? ` • ${item.manufacturer}` : ""}{item.model ? ` • ${item.model}` : ""}</span>{item.manufacturerServiceLife && <small>Manufacturer guidance: {item.manufacturerServiceLife}</small>}</div><div className="equipment-timing"><strong>{statusText(status, days)}</strong><small>{due ? `Target replacement: ${due.toLocaleDateString()}` : "Set an installed/replacement date and interval in the enclosure record."}</small></div><div className="equipment-actions">{item.replacementNotificationsEnabled && <span title="Replacement reminder enabled">🔔</span>}<button type="button" onClick={() => void recordReplacement(item)} disabled={savingSnakeId === selectedSnake.id}>♻️ Replaced today</button></div></article>; })}</div> : <div className="equipment-empty"><strong>No equipment service records yet.</strong><p>Add equipment service-life records to the enclosure profile and they will appear here automatically.</p></div>}</section></>}
    </section>}
  </div>;
}
