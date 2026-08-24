import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes, updateUserSnake } from "../services/snakeService";
import { deleteReptileRoom, loadReptileRooms, migrateLegacyRoom, saveReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomTemplate, type ReptileRoomUnit, type ReptileRoomWorkspace, type VivariumAvailability, type VivariumCondition, type VivariumLifecycleStatus } from "../services/reptileRoomService";
import type { Snake } from "../types/Snake";
import type { EquipmentMaintenanceItem, EquipmentMaintenanceStatus } from "../types/EquipmentMaintenance";
import BackHomeButton from "../components/BackHomeButton";
import EnclosurePhotoEditor from "../components/EnclosurePhotoEditor";
import "../styles/reptile-room.css";
import "../styles/reptile-room-v2.css";
import "../styles/reptile-room-v3.css";
import "../styles/reptile-room-v4.css";

const LEGACY_STORAGE_PREFIX = "tinyTitans.reptileRoom.layout.v6";
const DEFAULT_ROOM = { width: 360, depth: 300, height: 240, storageCapacity: 12 };
const DEFAULT_VIV = { width: 60, depth: 40, height: 30 };
const SNAP_CM = 2;

type LayoutPreset = "freeform" | "rack" | "wall" | "grid";

const TEMPLATE_NAMES: Record<ReptileRoomTemplate, string> = {
  blank: "Blank room", hatchling: "Hatchling room", breeding: "Breeding room", medical: "Medical / quarantine", brumation: "Brumation room", bioactive: "Bioactive room", custom: "Custom room",
};

const STATUS_LABELS: Record<VivariumLifecycleStatus, string> = {
  active: "Active", stored: "Stored", empty: "Empty", reserved: "Reserved", retired: "Retired", quarantine: "Quarantine", breeding: "Breeding setup",
};
const CONDITION_LABELS: Record<VivariumCondition, string> = { excellent: "Excellent", good: "Good", fair: "Fair", "needs-repair": "Needs repair", retired: "Retired" };
const FURNITURE_LABELS: Record<ReptileFurnitureKind, string> = {
  rack: "Rack", shelving: "Shelving", workbench: "Workbench", "storage-cabinet": "Storage cabinet", "equipment-station": "Heat / equipment station", "quarantine-area": "Quarantine area", door: "Door", window: "Window", vent: "Vent",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const numberValue = (value: string, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function legacyKey(uid: string) { return `${LEGACY_STORAGE_PREFIX}:${uid}`; }
function readLegacyLayout(uid: string): ReptileRoomSlot[] {
  try {
    const raw = localStorage.getItem(legacyKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReptileRoomSlot => Boolean(item) && typeof item === "object" && typeof (item as ReptileRoomSlot).id === "string" && typeof (item as ReptileRoomSlot).x === "number" && typeof (item as ReptileRoomSlot).y === "number").map((slot) => ({ ...slot, snakeId: typeof slot.snakeId === "string" ? slot.snakeId : null, label: typeof slot.label === "string" ? slot.label : "Vivarium", w: Number(slot.w) || DEFAULT_VIV.width, h: Number(slot.h) || DEFAULT_VIV.depth }));
  } catch { return []; }
}

function toDisplay(valueCm: number, unit: ReptileRoomUnit) { return unit === "imperial" ? valueCm / 2.54 : valueCm; }
function fromDisplay(value: number, unit: ReptileRoomUnit) { return unit === "imperial" ? value * 2.54 : value; }
function formatDim(valueCm: number, unit: ReptileRoomUnit) { return `${toDisplay(valueCm, unit).toFixed(valueCm >= 100 ? 0 : 1)} ${unit === "imperial" ? "in" : "cm"}`; }

function defaultSlot(snake: Snake | null, index: number): ReptileRoomSlot {
  const width = Number(snake?.enclosure?.length) || DEFAULT_VIV.width;
  const depth = Number(snake?.enclosure?.width) || DEFAULT_VIV.depth;
  const height = Number(snake?.enclosure?.height) || DEFAULT_VIV.height;
  return { id: makeId("viv"), snakeId: snake?.id ?? null, label: snake ? `${snake.name}'s Vivarium` : `Vivarium ${String(index + 1).padStart(2, "0")}`, x: 10 + (index % 4) * Math.min(width + 12, 82), y: 12 + Math.floor(index / 4) * Math.min(depth + 14, 70), w: width, h: depth, depth, height, lifecycleStatus: snake ? "active" : "empty", condition: "good", availability: snake ? "occupied" : "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "" };
}

function normalizeSlot(slot: ReptileRoomSlot, snakeById: Map<string, Snake>): ReptileRoomSlot {
  const snake = slot.snakeId ? snakeById.get(slot.snakeId) : null;
  const width = Number(slot.w) || Number(snake?.enclosure?.length) || DEFAULT_VIV.width;
  const depth = Number(slot.h) || Number(snake?.enclosure?.width) || DEFAULT_VIV.depth;
  return { ...slot, w: width, h: depth, depth: Number(slot.depth) || depth, height: Number(slot.height) || Number(snake?.enclosure?.height) || DEFAULT_VIV.height, lifecycleStatus: slot.lifecycleStatus ?? (snake ? "active" : "empty"), condition: slot.condition ?? "good", availability: slot.availability ?? (snake ? "occupied" : "available"), storageLocation: slot.storageLocation ?? "", storageNote: slot.storageNote ?? "", notes: slot.notes ?? "", maintenanceNote: slot.maintenanceNote ?? "" };
}

function createRoom(name: string, template: ReptileRoomTemplate, snakes: Snake[]): ReptileRoomWorkspace {
  const now = new Date().toISOString();
  const slots = template === "blank" ? [] : snakes.map((snake, index) => defaultSlot(snake, index));
  return { id: makeId("room"), name, template, unit: "metric", width: DEFAULT_ROOM.width, depth: DEFAULT_ROOM.depth, height: DEFAULT_ROOM.height, storageCapacity: DEFAULT_ROOM.storageCapacity, slots, storedSlots: [], objects: [], createdAt: now, updatedAt: now };
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
function daysUntil(date: Date | null) { if (!date) return null; const now = new Date(); now.setHours(0, 0, 0, 0); const target = new Date(date); target.setHours(0, 0, 0, 0); return Math.ceil((target.getTime() - now.getTime()) / 86400000); }
function statusText(status: EquipmentMaintenanceStatus, days: number | null) { if (status === "overdue") return `Overdue by ${Math.abs(days ?? 0)} day${Math.abs(days ?? 0) === 1 ? "" : "s"}`; if (status === "upcoming") return days === 0 ? "Due today" : `${days ?? 0} day${days === 1 ? "" : "s"} remaining`; if (status === "ok") return `${days ?? 0} day${days === 1 ? "" : "s"} remaining`; return "Service interval not set"; }

export default function ReptileRoom() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"asset" | "object" | "storage" | null>(null);
  const [message, setMessage] = useState("");
  const [editMode, setEditMode] = useState(true);
  const [newRoomTemplate, setNewRoomTemplate] = useState<ReptileRoomTemplate>("custom");
  const [roomNameDraft, setRoomNameDraft] = useState("");
  const [savingSnakeId, setSavingSnakeId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null;
  const roomUnit = activeRoom?.unit ?? "metric";
  const slots = activeRoom?.slots ?? [];
  const storedSlots = activeRoom?.storedSlots ?? [];
  const objects = activeRoom?.objects ?? [];
  const snakeById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedSnake = selectedSlot?.snakeId ? snakeById.get(selectedSlot.snakeId) ?? null : null;
  const selectedObject = objects.find((object) => object.id === selectedObjectId) ?? null;
  const assignedSnakeIds = useMemo(() => new Set(rooms.flatMap((room) => room.slots.map((slot) => slot.snakeId).filter((id): id is string => Boolean(id)))), [rooms]);
  const allStored = useMemo(() => rooms.flatMap((room) => room.storedSlots.map((slot) => ({ slot, room }))), [rooms]);
  const roomWidth = Math.max(100, activeRoom?.width ?? DEFAULT_ROOM.width);
  const roomDepth = Math.max(100, activeRoom?.depth ?? DEFAULT_ROOM.depth);
  const roomArea = roomWidth * roomDepth;
  const occupiedArea = slots.reduce((total, slot) => total + slot.w * slot.h, 0);
  const furnitureArea = objects.reduce((total, object) => total + object.width * object.depth, 0);
  const usableArea = Math.max(0, roomArea - furnitureArea);
  const unusedArea = Math.max(0, usableArea - occupiedArea);
  const storageCapacity = activeRoom?.storageCapacity ?? DEFAULT_ROOM.storageCapacity;
  const storageUsed = storedSlots.length;
  const capacityPercent = roomArea ? Math.min(100, Math.round((occupiedArea + furnitureArea) / roomArea * 100)) : 0;
  const fitWarnings = slots.filter((slot) => slot.x < 0 || slot.y < 0 || slot.x + slot.w > roomWidth || slot.y + slot.h > roomDepth).length;
  const maintenance = selectedSnake?.enclosure?.equipmentMaintenance ?? [];
  const dueCount = maintenance.filter((item) => ["overdue", "upcoming"].includes(equipmentStatus(item))).length;

  const persistRooms = useCallback(async (nextRooms: ReptileRoomWorkspace[], successMessage?: string) => {
    const stamped = nextRooms.map((room) => ({ ...room, updatedAt: new Date().toISOString() }));
    setRooms(stamped);
    if (!user) return;
    try { await saveReptileRooms(user.uid, stamped); if (successMessage) setMessage(successMessage); }
    catch { setMessage("Saved locally, but cloud sync failed. The next room change will retry the sync."); }
  }, [user]);

  const loadRoom = useCallback(async () => {
    if (!user) return;
    setLoadingRoom(true);
    try {
      const loadedSnakes = await getUserSnakes(user.uid);
      let loadedRooms = await loadReptileRooms(user.uid);
      if (!loadedRooms.length) {
        const legacy = readLegacyLayout(user.uid);
        loadedRooms = migrateLegacyRoom(user.uid, legacy);
        if (loadedRooms.length) await saveReptileRooms(user.uid, loadedRooms);
      }
      if (!loadedRooms.length) {
        const main = createRoom("Main Reptile Room", "custom", loadedSnakes);
        loadedRooms = [main]; await saveReptileRooms(user.uid, loadedRooms);
      }
      const map = new Map(loadedSnakes.map((snake) => [snake.id, snake]));
      loadedRooms = loadedRooms.map((room) => ({ ...room, unit: room.unit ?? "metric", width: room.width ?? DEFAULT_ROOM.width, depth: room.depth ?? DEFAULT_ROOM.depth, height: room.height ?? DEFAULT_ROOM.height, storageCapacity: room.storageCapacity ?? DEFAULT_ROOM.storageCapacity, objects: room.objects ?? [], slots: room.slots.map((slot) => normalizeSlot(slot, map)), storedSlots: room.storedSlots.map((slot) => ({ ...normalizeSlot(slot, map), lifecycleStatus: "stored" as VivariumLifecycleStatus })) }));
      setSnakes(loadedSnakes); setRooms(loadedRooms); setActiveRoomId((current) => loadedRooms.some((room) => room.id === current) ? current : loadedRooms[0].id); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load your reptile rooms."); }
    finally { setLoadingRoom(false); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void loadRoom(); }, [loading, profileLoading, user, loadRoom]);
  useEffect(() => { if (activeRoom) setRoomNameDraft(activeRoom.name); }, [activeRoom]);

  function updateActiveRoom(updater: (room: ReptileRoomWorkspace) => ReptileRoomWorkspace, successMessage?: string) {
    if (!activeRoom) return;
    void persistRooms(rooms.map((room) => room.id === activeRoom.id ? updater(room) : room), successMessage);
  }

  function addVivarium() {
    if (!activeRoom) return;
    const slot = defaultSlot(null, slots.length + storedSlots.length);
    slot.x = clamp(10 + (slots.length % 4) * 72, 0, roomWidth - slot.w); slot.y = clamp(10 + Math.floor(slots.length / 4) * 58, 0, roomDepth - slot.h);
    updateActiveRoom((room) => ({ ...room, slots: [...room.slots, slot] })); setSelectedSlotId(slot.id); setSelectedObjectId(null); setDrawer("asset");
  }

  function duplicateVivarium(slot: ReptileRoomSlot) {
    const copy: ReptileRoomSlot = { ...slot, id: makeId("viv"), snakeId: null, label: `${slot.label} copy`, x: clamp(slot.x + slot.w + 8, 0, roomWidth - slot.w), lifecycleStatus: "empty", availability: "available" };
    updateActiveRoom((room) => ({ ...room, slots: [...room.slots, copy] })); setSelectedSlotId(copy.id); setDrawer("asset");
  }

  function storeVivarium(slotId: string) {
    if (!activeRoom) return;
    const slot = slots.find((item) => item.id === slotId); if (!slot) return;
    const stored = { ...slot, lifecycleStatus: "stored" as VivariumLifecycleStatus, storageLocation: slot.storageLocation || "Vivarium Storage", availability: slot.snakeId ? "occupied" as VivariumAvailability : "available" as VivariumAvailability };
    updateActiveRoom((room) => ({ ...room, slots: room.slots.filter((item) => item.id !== slotId), storedSlots: [...room.storedSlots, stored] }), "Vivarium moved to storage. Snake history remains untouched.");
    setSelectedSlotId(null); setDrawer(null);
  }

  function removePlacement(slotId: string) { storeVivarium(slotId); }

  function retireStored(slotId: string, roomId: string) {
    const next = rooms.map((room) => room.id === roomId ? { ...room, storedSlots: room.storedSlots.map((slot) => slot.id === slotId ? { ...slot, lifecycleStatus: "retired" as VivariumLifecycleStatus, condition: "retired" as VivariumCondition } : slot) } : room);
    void persistRooms(next, "Vivarium retired. It remains in your asset history.");
  }

  function restoreToRoom(slotId: string, sourceRoomId: string, destinationRoomId: string) {
    const source = rooms.find((room) => room.id === sourceRoomId); const destination = rooms.find((room) => room.id === destinationRoomId); if (!source || !destination) return;
    const stored = source.storedSlots.find((slot) => slot.id === slotId); if (!stored) return;
    const restored = { ...stored, lifecycleStatus: stored.snakeId ? "active" as VivariumLifecycleStatus : "empty" as VivariumLifecycleStatus, x: 8, y: 8, storageLocation: "", storageNote: "" };
    const next = rooms.map((room) => room.id === sourceRoomId ? { ...room, storedSlots: room.storedSlots.filter((slot) => slot.id !== slotId) } : room.id === destinationRoomId ? { ...room, slots: [...room.slots, { ...restored, x: clamp(restored.x, 0, Math.max(0, (room.width ?? DEFAULT_ROOM.width) - restored.w)), y: clamp(restored.y, 0, Math.max(0, (room.depth ?? DEFAULT_ROOM.depth) - restored.h)) }] } : room);
    void persistRooms(next, `Vivarium restored to ${destination.name}.`); setActiveRoomId(destinationRoomId); setSelectedSlotId(restored.id); setDrawer("asset");
  }

  function removeRoom() {
    if (!activeRoom || rooms.length <= 1 || !user) return;
    const remaining = rooms.filter((room) => room.id !== activeRoom.id);
    void deleteReptileRoom(user.uid, activeRoom.id).then(() => { setRooms(remaining); setActiveRoomId(remaining[0].id); setSelectedSlotId(null); setDrawer(null); setMessage(`${activeRoom.name} removed. Snake and asset records in other rooms remain safe.`); }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to remove the room."));
  }

  function duplicateRoom() {
    if (!activeRoom) return;
    const now = new Date().toISOString();
    const copy: ReptileRoomWorkspace = { ...activeRoom, id: makeId("room"), name: `${activeRoom.name} — Planning Copy`, slots: activeRoom.slots.map((slot) => ({ ...slot, id: makeId("viv"), snakeId: null, lifecycleStatus: "empty", availability: "available", label: `${slot.label} plan` })), storedSlots: activeRoom.storedSlots.map((slot) => ({ ...slot, id: makeId("viv") })), objects: activeRoom.objects?.map((object) => ({ ...object, id: makeId("obj") })) ?? [], createdAt: now, updatedAt: now };
    void persistRooms([...rooms, copy], "Planning copy created. No snakes were moved."); setActiveRoomId(copy.id); setSelectedSlotId(null); setDrawer(null);
  }

  function saveRoomName() { const name = roomNameDraft.trim(); if (!name) return; updateActiveRoom((room) => ({ ...room, name }), "Room name saved."); }
  function updateRoomDimension(key: "width" | "depth" | "height" | "storageCapacity", displayValue: string) {
    if (!activeRoom) return;
    const raw = numberValue(displayValue, 0); const value = key === "storageCapacity" ? Math.max(0, Math.round(raw)) : Math.max(50, fromDisplay(raw, roomUnit));
    updateActiveRoom((room) => ({ ...room, [key]: value }));
  }
  function changeRoomUnit(unit: ReptileRoomUnit) { updateActiveRoom((room) => ({ ...room, unit })); }

  function updateSlot(slotId: string, patch: Partial<ReptileRoomSlot>) {
    updateActiveRoom((room) => ({ ...room, slots: room.slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot) }));
  }
  function assignSnake(slotId: string, snakeId: string) {
    const target = snakeId || null;
    const snake = target ? snakeById.get(target) : null;
    const next = rooms.map((room) => ({ ...room, slots: room.slots.map((slot) => slot.id === slotId ? { ...slot, snakeId: target, lifecycleStatus: target ? "active" as VivariumLifecycleStatus : "empty" as VivariumLifecycleStatus, availability: target ? "occupied" as VivariumAvailability : "available" as VivariumAvailability, label: target ? `${snake?.name ?? "Snake"}'s Vivarium` : slot.label } : target && slot.snakeId === target ? { ...slot, snakeId: null, lifecycleStatus: "empty" as VivariumLifecycleStatus, availability: "available" as VivariumAvailability } : slot) }));
    void persistRooms(next, snake ? `${snake.name} is now assigned to this vivarium.` : "Vivarium is now unassigned.");
  }

  function addObject(kind: ReptileFurnitureKind) {
    if (!activeRoom) return;
    const defaults: Record<ReptileFurnitureKind, [number, number, number]> = { rack: [120, 50, 200], shelving: [100, 40, 180], workbench: [140, 70, 90], "storage-cabinet": [100, 50, 180], "equipment-station": [80, 50, 100], "quarantine-area": [120, 80, 100], door: [90, 12, 210], window: [120, 10, 100], vent: [30, 10, 10] };
    const [width, depth, height] = defaults[kind];
    const object: ReptileRoomObject = { id: makeId("obj"), kind, label: FURNITURE_LABELS[kind], x: 12, y: 12, width, depth, height, rotation: 0, notes: "" };
    updateActiveRoom((room) => ({ ...room, objects: [...(room.objects ?? []), object] })); setSelectedObjectId(object.id); setSelectedSlotId(null); setDrawer("object");
  }

  function updateObject(objectId: string, patch: Partial<ReptileRoomObject>) { updateActiveRoom((room) => ({ ...room, objects: (room.objects ?? []).map((object) => object.id === objectId ? { ...object, ...patch } : object) })); }
  function removeObject(objectId: string) { updateActiveRoom((room) => ({ ...room, objects: (room.objects ?? []).filter((object) => object.id !== objectId) }), "Room object removed."); setSelectedObjectId(null); setDrawer(null); }

  function moveItem(id: string, clientX: number, clientY: number, rect: DOMRect, isObject: boolean) {
    if (!activeRoom || !rect.width || !rect.height) return;
    const roomW = activeRoom.width ?? DEFAULT_ROOM.width; const roomD = activeRoom.depth ?? DEFAULT_ROOM.depth;
    if (isObject) {
      const object = objects.find((item) => item.id === id); if (!object) return;
      const x = clamp(((clientX - rect.left) / rect.width) * roomW - object.width / 2, 0, Math.max(0, roomW - object.width));
      const y = clamp(((clientY - rect.top) / rect.height) * roomD - object.depth / 2, 0, Math.max(0, roomD - object.depth));
      setRooms((current) => current.map((room) => room.id === activeRoom.id ? { ...room, objects: (room.objects ?? []).map((item) => item.id === id ? { ...item, x, y } : item) } : room));
    } else {
      const slot = slots.find((item) => item.id === id); if (!slot) return;
      const x = clamp(((clientX - rect.left) / rect.width) * roomW - slot.w / 2, 0, Math.max(0, roomW - slot.w));
      const y = clamp(((clientY - rect.top) / rect.height) * roomD - slot.h / 2, 0, Math.max(0, roomD - slot.h));
      setRooms((current) => current.map((room) => room.id === activeRoom.id ? { ...room, slots: room.slots.map((item) => item.id === id ? { ...item, x, y } : item) } : room));
    }
  }

  function pointerDrag(event: ReactPointerEvent<HTMLElement>, id: string, isObject: boolean) {
    if (!editMode) return;
    const canvas = event.currentTarget.closest(".reptile-room-floor") as HTMLElement | null; if (!canvas) return;
    event.preventDefault(); setDragging(id); const rect = canvas.getBoundingClientRect();
    const onMove = (move: PointerEvent) => moveItem(id, move.clientX, move.clientY, rect, isObject);
    const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); setDragging(null); void persistRooms(rooms); };
    document.addEventListener("pointermove", onMove); document.addEventListener("pointerup", onUp);
  }

  function applyPreset(preset: LayoutPreset) {
    if (!activeRoom) return;
    const roomW = activeRoom.width ?? DEFAULT_ROOM.width; const roomD = activeRoom.depth ?? DEFAULT_ROOM.depth;
    const nextSlots = slots.map((slot, index) => {
      if (preset === "rack") return { ...slot, x: 8 + (index % 4) * Math.min(slot.w + 8, 90), y: 10 + Math.floor(index / 4) * Math.min(slot.h + 10, 65) };
      if (preset === "wall") return { ...slot, x: 8 + (index % 3) * Math.min(slot.w + 10, 120), y: 8 };
      if (preset === "grid") return { ...slot, x: 8 + (index % 3) * Math.min(slot.w + 14, 115), y: 12 + Math.floor(index / 3) * Math.min(slot.h + 14, 80) };
      return { ...slot, x: clamp(slot.x, 0, roomW - slot.w), y: clamp(slot.y, 0, roomD - slot.h) };
    });
    updateActiveRoom((room) => ({ ...room, slots: nextSlots }));
  }

  async function recordReplacement(item: EquipmentMaintenanceItem) {
    if (!user || !selectedSnake?.enclosure) return;
    setSavingSnakeId(selectedSnake.id); const today = new Date().toISOString().slice(0, 10);
    const equipmentMaintenance = (selectedSnake.enclosure.equipmentMaintenance ?? []).map((entry) => entry.id === item.id ? { ...entry, lastReplacedDate: today } : entry);
    try { const updated = await updateUserSnake(user.uid, { ...selectedSnake, enclosure: { ...selectedSnake.enclosure, equipmentMaintenance } }); setSnakes((current) => current.map((snake) => snake.id === updated.id ? updated : snake)); setMessage(`${item.name} replacement recorded.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the replacement record."); }
    finally { setSavingSnakeId(null); }
  }

  if (loading || profileLoading || loadingRoom) return <div className="page-container"><BackHomeButton /><h1>🏠 My Reptile Room</h1><div className="tracker-card"><h3>Building your room…</h3><p>Loading your rooms, assets and Tiny Titans.</p></div></div>;

  const roomDimensionInput = (key: "width" | "depth" | "height", label: string) => <label><span>{label}</span><input type="number" min="50" step="1" value={toDisplay(activeRoom?.[key] ?? DEFAULT_ROOM[key], roomUnit).toFixed(1)} onChange={(event) => updateRoomDimension(key, event.target.value)} /><small>{roomUnit === "imperial" ? "inches" : "cm"}</small></label>;

  return <div className="page-container reptile-room-page">
    <BackHomeButton />
    <header className="reptile-room-header"><div><p className="reptile-room-eyebrow">🏠 MY SNAKES • ROOM PLANNER</p><h1>Build Your Reptile Room</h1><p className="page-subtitle">A real-scale room planner. Rooms, vivariums and furniture are assets/locations; your snake remains the authoritative husbandry record.</p></div><div className="room-toolbar"><a className="husbandry-button" href="/snakes">🐍 Snake Tiles</a><button type="button" className={`husbandry-button ${editMode ? "is-active" : ""}`} onClick={() => setEditMode((value) => !value)}>{editMode ? "🔒 Finish arranging" : "✏️ Arrange room"}</button><button type="button" className="add-snake-button" onClick={addVivarium}>➕ Add Vivarium</button></div></header>
    {message && <p className="reptile-room-message" role="status">{message}</p>}

    <section className="reptile-room-workspace-manager"><div className="room-manager-heading"><div><p className="reptile-room-eyebrow">ROOM WORKSPACES</p><h2>{rooms.length} room{rooms.length === 1 ? "" : "s"}</h2></div><div className="room-create-controls"><select value={newRoomTemplate} onChange={(event) => setNewRoomTemplate(event.target.value as ReptileRoomTemplate)} aria-label="Room template">{Object.entries(TEMPLATE_NAMES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" className="add-snake-button" onClick={() => { const room = createRoom(TEMPLATE_NAMES[newRoomTemplate], newRoomTemplate, snakes); void persistRooms([...rooms, room], `${room.name} created.`); setActiveRoomId(room.id); }}>➕ New room</button><button type="button" className="husbandry-button" onClick={duplicateRoom}>⧉ Duplicate room</button></div></div>
      <div className="room-tabs" role="tablist">{rooms.map((room) => <button key={room.id} type="button" role="tab" aria-selected={room.id === activeRoom?.id} className={room.id === activeRoom?.id ? "is-active" : ""} onClick={() => { setActiveRoomId(room.id); setSelectedSlotId(null); setDrawer(null); }}>{room.name}<small>{room.slots.filter((slot) => slot.snakeId).length} occupied • {room.slots.length} vivariums • {room.storedSlots.length} stored</small></button>)}</div>
    </section>

    {activeRoom && <section className="room-control-card"><div className="room-control-head"><div><p className="reptile-room-eyebrow">ROOM SPECIFICATION</p><h2>{activeRoom.name}</h2><p>Set the actual physical room size. The floor plan now scales against these dimensions rather than an arbitrary percentage canvas.</p></div><div className="room-control-actions"><button type="button" className="husbandry-button" onClick={() => setDrawer("storage")}>📦 Vivarium Storage ({allStored.length})</button><button type="button" className="danger-button" onClick={removeRoom} disabled={rooms.length <= 1}>🗑️ Remove room</button></div></div><div className="room-spec-grid"><label><span>Units</span><select value={roomUnit} onChange={(event) => changeRoomUnit(event.target.value as ReptileRoomUnit)}><option value="metric">Metric (cm)</option><option value="imperial">Imperial (in)</option></select></label>{roomDimensionInput("width", "Room width")}{roomDimensionInput("depth", "Room depth")}{roomDimensionInput("height", "Room height")}<label><span>Storage capacity</span><input type="number" min="0" step="1" value={activeRoom.storageCapacity ?? DEFAULT_ROOM.storageCapacity} onChange={(event) => updateRoomDimension("storageCapacity", event.target.value)} /><small>assets</small></label><label><span>Room name</span><input value={roomNameDraft} onChange={(event) => setRoomNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveRoomName(); }} /><small><button type="button" onClick={saveRoomName}>Save</button></small></label></div></section>}

    <section className="reptile-room-intelligence"><div><strong>📐 {formatDim(roomWidth, roomUnit)} × {formatDim(roomDepth, roomUnit)}</strong><span>{formatDim(activeRoom?.height ?? DEFAULT_ROOM.height, roomUnit)} high</span></div><div><strong>{capacityPercent}% planned footprint</strong><span>{formatDim(unusedArea, roomUnit)}² unused floor area</span></div><div><strong>{slots.filter((slot) => slot.snakeId).length} occupied</strong><span>{slots.filter((slot) => !slot.snakeId).length} available vivariums</span></div><div><strong>{storageUsed}/{storageCapacity} stored</strong><span>{Math.max(0, storageCapacity - storageUsed)} storage spaces available</span></div>{fitWarnings > 0 && <div className="room-warning"><strong>⚠️ {fitWarnings} fit warning{fitWarnings === 1 ? "" : "s"}</strong><span>Object extends outside the physical room</span></div>}</section>

    <section className="room-layout-tools"><span>Layout:</span><button type="button" onClick={() => applyPreset("freeform")}>↗️ Freeform</button><button type="button" onClick={() => applyPreset("grid")}>▦ Grid</button><button type="button" onClick={() => applyPreset("rack")}>▤ Rack</button><button type="button" onClick={() => applyPreset("wall")}>🧱 Wall</button><span className="room-layout-divider" /><span>Furniture:</span>{(Object.keys(FURNITURE_LABELS) as ReptileFurnitureKind[]).map((kind) => <button key={kind} type="button" onClick={() => addObject(kind)}>＋ {FURNITURE_LABELS[kind]}</button>)}</section>

    <section className="reptile-room-floor-shell"><div className="floor-ruler floor-ruler-x"><span>0</span><span>{formatDim(roomWidth / 2, roomUnit)}</span><span>{formatDim(roomWidth, roomUnit)}</span></div><div className="reptile-room-floor" style={{ aspectRatio: `${roomWidth} / ${roomDepth}` }} aria-label={`${activeRoom?.name ?? "Reptile room"} scaled floor plan`}>
      <div className="floor-wall-label">{activeRoom?.name.toUpperCase()} • {formatDim(roomWidth, roomUnit)} × {formatDim(roomDepth, roomUnit)}</div>
      {objects.map((object) => <button type="button" key={object.id} className={`room-object room-object-${object.kind} ${selectedObjectId === object.id ? "is-selected" : ""} ${dragging === object.id ? "is-dragging" : ""}`} style={{ left: `${object.x / roomWidth * 100}%`, top: `${object.y / roomDepth * 100}%`, width: `${object.width / roomWidth * 100}%`, height: `${object.depth / roomDepth * 100}%`, transform: `rotate(${object.rotation}deg)` }} onPointerDown={(event) => pointerDrag(event, object.id, true)} onClick={() => { setSelectedObjectId(object.id); setSelectedSlotId(null); setDrawer("object"); }}><strong>{FURNITURE_LABELS[object.kind]}</strong><small>{object.label}</small></button>)}
      {slots.map((slot) => { const snake = slot.snakeId ? snakeById.get(slot.snakeId) : null; const selected = selectedSlotId === slot.id; return <button type="button" key={slot.id} className={`room-vivarium ${selected ? "is-selected" : ""} ${dragging === slot.id ? "is-dragging" : ""} status-${slot.lifecycleStatus ?? "empty"}`} style={{ left: `${slot.x / roomWidth * 100}%`, top: `${slot.y / roomDepth * 100}%`, width: `${slot.w / roomWidth * 100}%`, height: `${slot.h / roomDepth * 100}%` }} onPointerDown={(event) => pointerDrag(event, slot.id, false)} onClick={() => { setSelectedSlotId(slot.id); setSelectedObjectId(null); setDrawer("asset"); }} aria-label={`${slot.label}${snake ? `, ${snake.name}` : ", empty"}`}><span className="room-vivarium-top"><strong>{snake?.name || slot.label}</strong><em>{STATUS_LABELS[slot.lifecycleStatus ?? "empty"]}</em></span><span className="room-vivarium-dims">{formatDim(slot.w, roomUnit)} × {formatDim(slot.h, roomUnit)} × {formatDim(slot.height ?? DEFAULT_VIV.height, roomUnit)}</span><span className="room-vivarium-snake">{snake ? `🐍 ${snake.name}` : "EMPTY / AVAILABLE"}</span></button>})}
      {!slots.length && <div className="reptile-room-empty"><strong>Your physical room is ready.</strong><p>Add a vivarium or furniture and build the layout to scale.</p><button type="button" className="add-snake-button" onClick={addVivarium}>➕ Add First Vivarium</button></div>}
    </div></section>

    <section className="room-lifecycle-strip"><div><strong>Vivarium lifecycle</strong><span>Active • Stored • Empty • Reserved • Retired • Quarantine • Breeding setup</span></div><button type="button" className="husbandry-button" onClick={() => setDrawer("storage")}>Open storage drawer</button></section>

    {drawer === "storage" && <aside className="room-drawer room-storage-drawer"><div className="drawer-head"><div><p className="reptile-room-eyebrow">📦 ASSET STORAGE</p><h2>Vivarium Storage</h2><p>Stored vivariums remain assets. Restore any one to any room without changing the snake's history.</p></div><button type="button" onClick={() => setDrawer(null)}>✕</button></div><div className="storage-capacity"><strong>{allStored.length}/{storageCapacity}</strong><span>stored in {rooms.length} room workspace{rooms.length === 1 ? "" : "s"}</span></div>{allStored.length ? <div className="drawer-list">{allStored.map(({ slot, room }) => { const snake = slot.snakeId ? snakeById.get(slot.snakeId) : null; return <article key={`${room.id}-${slot.id}`} className="storage-asset"><div><strong>{snake?.name || slot.label}</strong><span>{room.name} • {STATUS_LABELS[slot.lifecycleStatus ?? "stored"]}</span><small>{formatDim(slot.w, roomUnit)} × {formatDim(slot.h, roomUnit)} × {formatDim(slot.height ?? DEFAULT_VIV.height, roomUnit)} • {CONDITION_LABELS[slot.condition ?? "good"]}</small>{slot.storageLocation && <small>📍 {slot.storageLocation}</small>}{slot.storageNote && <small>📝 {slot.storageNote}</small>}</div><div className="storage-actions"><select aria-label={`Restore ${slot.label}`} defaultValue={activeRoom?.id ?? rooms[0]?.id} onChange={(event) => restoreToRoom(slot.id, room.id, event.target.value)}><option value="" disabled>Restore to…</option>{rooms.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select><button type="button" onClick={() => retireStored(slot.id, room.id)}>Retire</button></div></article>; })}</div> : <div className="equipment-empty"><strong>Storage is empty.</strong><p>Use Store vivarium from the edit drawer to put an asset here.</p></div>}</aside>}

    {drawer === "object" && selectedObject && <aside className="room-drawer"><div className="drawer-head"><div><p className="reptile-room-eyebrow">ROOM OBJECT</p><h2>{FURNITURE_LABELS[selectedObject.kind]}</h2></div><button type="button" onClick={() => setDrawer(null)}>✕</button></div><div className="drawer-form"><label>Label<input value={selectedObject.label} onChange={(event) => updateObject(selectedObject.id, { label: event.target.value })} /></label><div className="drawer-grid"><label>Width<input type="number" value={toDisplay(selectedObject.width, roomUnit).toFixed(1)} onChange={(event) => updateObject(selectedObject.id, { width: Math.max(5, fromDisplay(numberValue(event.target.value), roomUnit)) })} /></label><label>Depth<input type="number" value={toDisplay(selectedObject.depth, roomUnit).toFixed(1)} onChange={(event) => updateObject(selectedObject.id, { depth: Math.max(5, fromDisplay(numberValue(event.target.value), roomUnit)) })} /></label><label>Height<input type="number" value={toDisplay(selectedObject.height, roomUnit).toFixed(1)} onChange={(event) => updateObject(selectedObject.id, { height: Math.max(1, fromDisplay(numberValue(event.target.value), roomUnit)) })} /></label><label>Rotation<input type="number" value={selectedObject.rotation} onChange={(event) => updateObject(selectedObject.id, { rotation: numberValue(event.target.value) })} /></label></div><label>Notes<textarea value={selectedObject.notes ?? ""} onChange={(event) => updateObject(selectedObject.id, { notes: event.target.value })} /></label><button type="button" className="danger-button" onClick={() => removeObject(selectedObject.id)}>🗑️ Remove object</button></div></aside>}

    {drawer === "asset" && selectedSlot && <aside className="room-drawer room-asset-drawer"><div className="drawer-head"><div><p className="reptile-room-eyebrow">VIVARIUM ASSET</p><h2>{selectedSnake ? `${selectedSnake.name}'s Vivarium` : selectedSlot.label}</h2><p>Snake and vivarium are deliberately separate. Moving this asset never rewrites the snake's husbandry history.</p></div><button type="button" onClick={() => setDrawer(null)}>✕</button></div><div className="drawer-form"><label>Label<input value={selectedSlot.label} onChange={(event) => updateSlot(selectedSlot.id, { label: event.target.value })} /></label><label>Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => assignSnake(selectedSlot.id, event.target.value)}><option value="">— Empty / unassigned —</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}{assignedSnakeIds.has(snake.id) && selectedSlot.snakeId !== snake.id ? " (move here)" : ""}</option>)}</select></label><div className="drawer-grid"><label>Width<input type="number" value={toDisplay(selectedSlot.w, roomUnit).toFixed(1)} onChange={(event) => updateSlot(selectedSlot.id, { w: Math.max(5, fromDisplay(numberValue(event.target.value), roomUnit)) })} /></label><label>Depth<input type="number" value={toDisplay(selectedSlot.h, roomUnit).toFixed(1)} onChange={(event) => updateSlot(selectedSlot.id, { h: Math.max(5, fromDisplay(numberValue(event.target.value), roomUnit)), depth: Math.max(5, fromDisplay(numberValue(event.target.value), roomUnit)) })} /></label><label>Height<input type="number" value={toDisplay(selectedSlot.height ?? DEFAULT_VIV.height, roomUnit).toFixed(1)} onChange={(event) => updateSlot(selectedSlot.id, { height: Math.max(5, fromDisplay(numberValue(event.target.value), roomUnit)) })} /></label><label>Status<select value={selectedSlot.lifecycleStatus ?? "empty"} onChange={(event) => updateSlot(selectedSlot.id, { lifecycleStatus: event.target.value as VivariumLifecycleStatus })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Condition<select value={selectedSlot.condition ?? "good"} onChange={(event) => updateSlot(selectedSlot.id, { condition: event.target.value as VivariumCondition })}>{Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Availability<select value={selectedSlot.availability ?? "available"} onChange={(event) => updateSlot(selectedSlot.id, { availability: event.target.value as VivariumAvailability })}><option value="available">Available</option><option value="occupied">Occupied</option></select></label></div><label>Location / storage location<input value={selectedSlot.storageLocation ?? ""} onChange={(event) => updateSlot(selectedSlot.id, { storageLocation: event.target.value })} placeholder="e.g. Garage rack B2" /></label><label>Notes<textarea value={selectedSlot.notes ?? ""} onChange={(event) => updateSlot(selectedSlot.id, { notes: event.target.value })} /></label><label>Maintenance note<textarea value={selectedSlot.maintenanceNote ?? ""} onChange={(event) => updateSlot(selectedSlot.id, { maintenanceNote: event.target.value })} /></label><div className="asset-actions"><button type="button" className="husbandry-button" onClick={() => duplicateVivarium(selectedSlot)}>⧉ Duplicate</button><button type="button" className="husbandry-button" onClick={() => storeVivarium(selectedSlot.id)}>📦 Store</button><button type="button" className="danger-button" onClick={() => removePlacement(selectedSlot.id)}>↪ Remove placement</button></div>
      {selectedSnake && <><EnclosurePhotoEditor snake={selectedSnake} onUpdated={(updated) => setSnakes((current) => current.map((snake) => snake.id === updated.id ? updated : snake))} /><div className="room-source-note">🧠 <strong>Authoritative snake record:</strong> husbandry, enclosure setup, photos and history live with {selectedSnake.name}. This room asset only records physical placement and asset state.</div><div className="room-setup-grid"><div><span>📐 Snake enclosure</span><strong>{selectedSnake.enclosure ? `${selectedSnake.enclosure.length} × ${selectedSnake.enclosure.width} × ${selectedSnake.enclosure.height} cm` : "Not recorded"}</strong></div><div><span>🔥 Heating</span><strong>{selectedSnake.enclosure?.heatingType || "Not recorded"}</strong></div><div><span>🪵 Substrate</span><strong>{selectedSnake.enclosure?.customSubstrate || selectedSnake.enclosure?.substrate || "Not recorded"}</strong></div><div><span>🌡️ Warm / cool</span><strong>{selectedSnake.enclosure?.warmSideTemperature ?? "—"}° / {selectedSnake.enclosure?.coolSideTemperature ?? "—"}°C</strong></div></div><div className="room-detail-actions"><a href={`/snakes/${selectedSnake.id}/enclosure`}>✏️ Open Enclosure Tab</a><a href={`/snakes/${selectedSnake.id}`}>👁️ Open Snake Profile</a></div><section className="equipment-maintenance-panel"><div className="equipment-heading"><div><p className="reptile-room-eyebrow">🔧 EQUIPMENT LIFE & MAINTENANCE</p><h3>Replacement tracker</h3></div>{dueCount > 0 && <span className="equipment-count-badge">⚠️ {dueCount} due / upcoming</span>}</div>{maintenance.length ? <div className="equipment-list">{maintenance.map((item) => { const status = equipmentStatus(item); const due = dueDate(item); const days = daysUntil(due); return <article key={item.id} className={`equipment-item equipment-${status}`}><div><strong>{item.name}</strong><span>{item.kind}{item.manufacturer ? ` • ${item.manufacturer}` : ""}{item.model ? ` • ${item.model}` : ""}</span></div><div className="equipment-timing"><strong>{statusText(status, days)}</strong><small>{due ? `Target replacement: ${due.toLocaleDateString()}` : "No interval set"}</small></div><button type="button" onClick={() => void recordReplacement(item)} disabled={savingSnakeId === selectedSnake.id}>♻️ Replaced today</button></article>; })}</div> : <div className="equipment-empty"><strong>No equipment service records yet.</strong><p>Add service-life records in the enclosure profile.</p></div>}</section></>}
    </div></aside>}
  </div>;
}
