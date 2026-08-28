import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import {
  loadReptileRooms,
  saveReptileRooms,
  type ReptileRoomObject,
  type ReptileRoomWorkspace,
  type ReptileRoomSlot,
} from "../services/reptileRoomService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { getCameraForwardSpawn } from "../components/reptile-room-3d/RoomCamera3D";
import type { Room3DSelection, Room3DAssetPreset } from "../types/reptileRoom3D";
import { clamp, snapArchitecturalObject, snapNumber } from "../services/reptileRoomSpatialService";
import type { Snake } from "../types/Snake";

const MOVE_STEP_CM = 5;
const MAGNET_GAP_CM = 10;

type RoomItem = {
  type: "slot" | "object";
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  stackGroupId: string | null;
};

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makePlacedObject(
  kind: Exclude<Room3DAssetPreset["kind"], "vivarium">,
  label: string,
  width: number,
  depth: number,
  height: number,
  x: number,
  y: number,
  assetType: ReptileRoomObject["assetType"] = "furniture",
): ReptileRoomObject {
  return {
    id: createId("room-object"), kind, label, x, y, z: 0, width, depth, height,
    rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null,
    clearance: {}, notes: "", assetType,
  };
}

function makeVivarium(width: number, depth: number, height: number, x: number, y: number): ReptileRoomSlot {
  return {
    id: createId("viv"), snakeId: null, label: "Empty Vivarium", x, y, z: 0,
    w: width, h: depth, depth, height, lifecycleStatus: "empty", condition: "good",
    availability: "available", storageLocation: "", storageNote: "", notes: "",
    maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null, photoUrl: "",
  };
}

function itemFromObject(item: ReptileRoomObject): RoomItem {
  return { type: "object", id: item.id, x: item.x, y: item.y, z: item.z ?? 0, width: item.width, depth: item.depth, height: item.height, stackGroupId: item.stackGroupId ?? null };
}

function itemFromSlot(item: ReptileRoomSlot): RoomItem {
  return { type: "slot", id: item.id, x: item.x, y: item.y, z: item.z ?? 0, width: item.w, depth: item.depth ?? item.w, height: item.height ?? item.h, stackGroupId: item.stackGroupId ?? null };
}

function gapBetween(a: RoomItem, b: RoomItem): number {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.depth), b.y - (a.y + a.depth), 0);
  const dz = Math.min(Math.abs(a.z + a.height - b.z), Math.abs(b.z + b.height - a.z));
  return Math.hypot(dx, dy, dz);
}

export default function ReptileRoomDigitalTwin3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [notice, setNotice] = useState("");
  const [localObjects, setLocalObjects] = useState<ReptileRoomObject[]>([]);
  const [localSlots, setLocalSlots] = useState<ReptileRoomSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"slot" | "object" | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"edit" | "occupant">("edit");

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedSlot = selectedType === "slot" ? localSlots.find((slot) => slot.id === selectedId) ?? null : null;
  const selectedObject = selectedType === "object" ? localObjects.find((object) => object.id === selectedId) ?? null : null;
  const selectedSnake = selectedSlot?.snakeId ? snakesById.get(selectedSlot.snakeId) : undefined;
  const selectedStackLocked = Boolean(selectedSlot?.stackGroupId || selectedObject?.stackGroupId);

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
  useEffect(() => {
    setLocalObjects(room?.objects ?? []);
    setLocalSlots(room?.slots ?? []);
    setSelectedId(null);
    setSelectedType(null);
  }, [room]);

  const persistState = useCallback(async (objects: ReptileRoomObject[], slots: ReptileRoomSlot[], message?: string) => {
    if (!room) return;
    const nextRooms = rooms.map((entry) => entry.id === room.id ? { ...entry, objects, slots, roomVersion: 2, updatedAt: new Date().toISOString() } : entry);
    setLocalObjects(objects);
    setLocalSlots(slots);
    setRooms(nextRooms);
    if (!user) return;
    try {
      await saveReptileRooms(user.uid, nextRooms);
      if (message) setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Saved locally, but cloud sync failed.");
    }
  }, [room, rooms, user]);

  const handleSelect = useCallback((selection: Room3DSelection) => {
    if (!selection) {
      setSelectedId(null);
      setSelectedType(null);
      return;
    }
    setSelectedId(selection.id);
    setSelectedType(selection.type);
    setInspectorTab("edit");
  }, []);

  const addObject = useCallback((object: ReptileRoomObject) => {
    setLocalObjects((current) => [...current, object]);
    setSelectedId(object.id);
    setSelectedType("object");
  }, []);

  const spawnAsset = useCallback((preset: Room3DAssetPreset) => {
    if (!room) return;
    const camera = (window as Window & { __tinyTitansRoom3DCamera?: import("three").Camera }).__tinyTitansRoom3DCamera;
    if (!camera) {
      setNotice("3D camera is still starting - try the asset again in a moment.");
      return;
    }
    const point = getCameraForwardSpawn(camera, 120, room);
    const roomWidth = room.width ?? 0;
    const roomDepth = room.depth ?? 0;
    const x = clamp(snapNumber(point.xCm - preset.width / 2), 0, Math.max(0, roomWidth - preset.width));
    const y = clamp(snapNumber(point.zCm - preset.depth / 2), 0, Math.max(0, roomDepth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot = makeVivarium(preset.width, preset.depth, preset.height, x, y);
      setLocalSlots((current) => [...current, slot]);
      setSelectedId(slot.id);
      setSelectedType("slot");
      setInspectorTab("edit");
      return;
    }
    addObject(makePlacedObject(preset.kind, preset.label, preset.width, preset.depth, preset.height, x, y, preset.assetType));
  }, [room, addObject]);

  const createVivariumAtCamera = useCallback(() => {
    if (!room) return;
    const camera = (window as Window & { __tinyTitansRoom3DCamera?: import("three").Camera }).__tinyTitansRoom3DCamera;
    if (!camera) {
      setNotice("3D camera is still starting - try again in a moment.");
      return;
    }
    const point = getCameraForwardSpawn(camera, 120, room);
    const width = 90;
    const depth = 45;
    const x = clamp(snapNumber(point.xCm - width / 2), 0, Math.max(0, (room.width ?? width) - width));
    const y = clamp(snapNumber(point.zCm - depth / 2), 0, Math.max(0, (room.depth ?? depth) - depth));
    const slot = makeVivarium(width, depth, 45, x, y);
    setLocalSlots((current) => [...current, slot]);
    setSelectedId(slot.id);
    setSelectedType("slot");
    setInspectorTab("edit");
  }, [room]);

  const createSnakeVivarium = useCallback((snake: Snake) => {
    if (!room) return;
    const existing = localSlots.find((slot) => slot.snakeId === snake.id);
    if (existing) {
      setSelectedId(existing.id);
      setSelectedType("slot");
      setInspectorTab("occupant");
      return;
    }
    const camera = (window as Window & { __tinyTitansRoom3DCamera?: import("three").Camera }).__tinyTitansRoom3DCamera;
    if (!camera) {
      setNotice("3D camera is still starting - try again in a moment.");
      return;
    }
    const point = getCameraForwardSpawn(camera, 120, room);
    const width = 90;
    const depth = 45;
    const x = clamp(snapNumber(point.xCm - width / 2), 0, Math.max(0, (room.width ?? width) - width));
    const y = clamp(snapNumber(point.zCm - depth / 2), 0, Math.max(0, (room.depth ?? depth) - depth));
    const slot: ReptileRoomSlot = { ...makeVivarium(width, depth, 45, x, y), snakeId: snake.id, label: snake.name, lifecycleStatus: "occupied", photoUrl: "" };
    setLocalSlots((current) => [...current, slot]);
    setSelectedId(slot.id);
    setSelectedType("slot");
    setInspectorTab("occupant");
  }, [room, localSlots]);

  const getSelectedItem = useCallback((): RoomItem | null => {
    if (selectedType === "object") {
      const item = localObjects.find((entry) => entry.id === selectedId);
      return item ? itemFromObject(item) : null;
    }
    if (selectedType === "slot") {
      const item = localSlots.find((entry) => entry.id === selectedId);
      return item ? itemFromSlot(item) : null;
    }
    return null;
  }, [localObjects, localSlots, selectedId, selectedType]);

  const updateSelectedPosition = useCallback((axis: "x" | "y" | "z", delta: number) => {
    if (selectedType === "object") setLocalObjects((current) => current.map((item) => item.id === selectedId ? { ...item, [axis]: (item[axis] ?? 0) + delta } : item));
    if (selectedType === "slot") setLocalSlots((current) => current.map((item) => item.id === selectedId ? { ...item, [axis]: (item[axis] ?? 0) + delta } : item));
  }, [selectedId, selectedType]);

  const snapSelected = useCallback(() => {
    if (!room) return;
    if (selectedType === "object") setLocalObjects((current) => current.map((item) => item.id === selectedId ? snapArchitecturalObject(item, room.width ?? 0, room.depth ?? 0) : item));
    if (selectedType === "slot") setLocalSlots((current) => current.map((item) => item.id === selectedId ? { ...item, x: snapNumber(item.x), y: snapNumber(item.y) } : item));
  }, [room, selectedId, selectedType]);

  const autoPlaceSelected = useCallback(() => {
    const selected = getSelectedItem();
    if (!selected || !room) return;
    const all = [...localObjects.map(itemFromObject), ...localSlots.map(itemFromSlot)].filter((item) => item.id !== selected.id);
    const candidates = [
      { x: selected.x, y: selected.y },
      ...all.map((item) => ({ x: item.x + item.width + MAGNET_GAP_CM, y: item.y })),
      ...all.map((item) => ({ x: item.x, y: item.y + item.depth + MAGNET_GAP_CM })),
    ];
    const best = candidates.map((candidate) => {
      const x = clamp(snapNumber(candidate.x), 0, Math.max(0, (room.width ?? selected.width) - selected.width));
      const y = clamp(snapNumber(candidate.y), 0, Math.max(0, (room.depth ?? selected.depth) - selected.depth));
      const test = { ...selected, x, y };
      const collision = all.reduce((score, item) => score + (gapBetween(test, item) < MAGNET_GAP_CM ? 100000 : gapBetween(test, item)), 0);
      return { x, y, score: collision };
    }).sort((a, b) => a.score - b.score)[0];
    if (!best) return;
    if (selectedType === "object") setLocalObjects((current) => current.map((item) => item.id === selected.id ? { ...item, x: best.x, y: best.y } : item));
    if (selectedType === "slot") setLocalSlots((current) => current.map((item) => item.id === selected.id ? { ...item, x: best.x, y: best.y } : item));
  }, [getSelectedItem, localObjects, localSlots, room, selectedType]);

  const toggleStackLock = useCallback(() => {
    const selected = getSelectedItem();
    if (!selected) return;
    const newGroupId = selected.stackGroupId ?? createId("stack");
    const others = [...localObjects.map((item) => ({ type: "object" as const, item })), ...localSlots.map((item) => ({ type: "slot" as const, item }))].filter((entry) => !(entry.type === selected.type && entry.item.id === selected.id));
    const target = others.map((entry) => {
      const item = entry.type === "object" ? itemFromObject(entry.item) : itemFromSlot(entry.item);
      return { entry, distance: gapBetween(selected, item) };
    }).sort((a, b) => a.distance - b.distance)[0];
    const joinGroup = Boolean(target && target.distance <= 8);
    const groupId = selected.stackGroupId ? selected.stackGroupId : (joinGroup ? (target!.entry.item.stackGroupId ?? newGroupId) : newGroupId);
    if (selectedType === "object") setLocalObjects((current) => current.map((item) => item.id === selected.id ? { ...item, stackGroupId: selectedStackLocked ? null : groupId } : item));
    if (selectedType === "slot") setLocalSlots((current) => current.map((item) => item.id === selected.id ? { ...item, stackGroupId: selectedStackLocked ? null : groupId } : item));
  }, [getSelectedItem, localObjects, localSlots, selectedStackLocked, selectedType]);

  const updateRoom = useCallback((patch: Partial<ReptileRoomWorkspace>) => {
    if (!room) return;
    setRooms((current) => current.map((entry) => entry.id === room.id ? { ...entry, ...patch } : entry));
  }, [room]);

  const saveCurrent = useCallback(() => { void persistState(localObjects, localSlots, "Room changes saved."); }, [localObjects, localSlots, persistState]);

  const selectedLabel = selectedSnake ? `${selectedSnake.name} · ${selectedSlot?.label ?? "Vivarium"}` : selectedObject?.label ?? selectedSlot?.label ?? "Nothing selected";
  const assetPresets: Room3DAssetPreset[] = [
    { kind: "rack", label: "Vivarium Rack", width: 120, depth: 50, height: 180, assetType: "furniture" },
    { kind: "shelf", label: "Shelf", width: 100, depth: 35, height: 120, assetType: "furniture" },
    { kind: "cabinet", label: "Storage Cabinet", width: 80, depth: 45, height: 100, assetType: "furniture" },
    { kind: "workbench", label: "Workbench", width: 140, depth: 65, height: 90, assetType: "furniture" },
    { kind: "table", label: "Keeper Table", width: 100, depth: 60, height: 75, assetType: "furniture" },
    { kind: "chair", label: "Chair", width: 50, depth: 50, height: 90, assetType: "furniture" },
    { kind: "sofa", label: "Sofa", width: 180, depth: 80, height: 85, assetType: "furniture" },
    { kind: "plant", label: "Plant", width: 45, depth: 45, height: 100, assetType: "decor" },
    { kind: "lamp", label: "Lamp", width: 30, depth: 30, height: 140, assetType: "equipment" },
    { kind: "vent", label: "Ventilation Unit", width: 50, depth: 20, height: 20, assetType: "equipment" },
  ];

  if (!user || loading || profileLoading) return <main className="reptile-room-digital-twin"><p>Loading your reptile room…</p></main>;
  if (!room) return <main className="reptile-room-digital-twin"><section><h1>Reptile Room Digital Twin</h1><p>Create your first room to start building.</p></section></main>;

  return (
    <main className="reptile-room-digital-twin reptile-room-digital-twin--immersive">
      <header className="reptile-room-digital-twin__header">
        <div><span className="eyebrow">TINY TITANS · DIGITAL TWIN</span><h1>{room.name}</h1><p>Build, position and understand your real reptile room in 3D.</p></div>
        <div className="reptile-room-digital-twin__actions">
          <button type="button" onClick={saveCurrent}>Save Room</button>
          <button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide Grid" : "Show Grid"}</button>
          <button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide Ceiling" : "Show Ceiling"}</button>
        </div>
      </header>
      {notice && <div className="reptile-room-digital-twin__notice" role="status">{notice}</div>}
      <section className="reptile-room-digital-twin__layout">
        <section className="reptile-room-digital-twin__viewport">
          <Room3D room={room} objects={localObjects} slots={localSlots} showGrid={showGrid} showCeiling={showCeiling} onSelect={handleSelect} />
          <div className="reptile-room-digital-twin__selection">
            <strong>{selectedLabel}</strong>
            {(selectedObject || selectedSlot) && <div>
              <button type="button" onClick={() => updateSelectedPosition("x", -MOVE_STEP_CM)}>← X</button>
              <button type="button" onClick={() => updateSelectedPosition("x", MOVE_STEP_CM)}>X →</button>
              <button type="button" onClick={() => updateSelectedPosition("y", -MOVE_STEP_CM)}>↑ Y</button>
              <button type="button" onClick={() => updateSelectedPosition("y", MOVE_STEP_CM)}>Y ↓</button>
              <button type="button" onClick={() => updateSelectedPosition("z", MOVE_STEP_CM)}>Z +</button>
              <button type="button" onClick={() => updateSelectedPosition("z", -MOVE_STEP_CM)}>Z −</button>
              <button type="button" onClick={snapSelected}>Snap</button>
              <button type="button" onClick={autoPlaceSelected}>Auto Place</button>
              <button type="button" onClick={toggleStackLock}>{selectedStackLocked ? "Unlock Stack" : "Lock Stack"}</button>
            </div>}
          </div>
        </section>

        <details className="reptile-room-digital-twin__controls">
          <summary>⚙ Room Controls</summary>
          <div className="reptile-room-digital-twin__controls-body">
            <section><h2>Add to Room</h2><button type="button" onClick={createVivariumAtCamera}>＋ Empty Vivarium</button>{snakes.length > 0 && <div><h3>Your Snakes</h3>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => createSnakeVivarium(snake)}>🐍 {snake.name}</button>)}</div>}</section>
            <section><h2>Props & Equipment</h2><div className="reptile-room-digital-twin__asset-list">{assetPresets.map((preset) => <button key={`${preset.kind}-${preset.label}`} type="button" onClick={() => spawnAsset(preset)}>{preset.label}<small>{preset.width} × {preset.depth} × {preset.height} cm</small></button>)}</div></section>
            <section><h2>Room</h2><label>Width<input type="number" value={room.width ?? 0} onChange={(event) => updateRoom({ width: Number(event.target.value) || 0 })} /></label><label>Depth<input type="number" value={room.depth ?? 0} onChange={(event) => updateRoom({ depth: Number(event.target.value) || 0 })} /></label><label>Height<input type="number" value={room.height ?? 0} onChange={(event) => updateRoom({ height: Number(event.target.value) || 0 })} /></label></section>
            <section><h2>Inspector</h2>
              {selectedSlot ? <>
                <p><strong>{selectedSlot.label}</strong></p>
                <div className="reptile-room-digital-twin__tabs" role="tablist"><button type="button" onClick={() => setInspectorTab("edit")}>Position</button><button type="button" onClick={() => setInspectorTab("occupant")}>Occupant</button></div>
                {inspectorTab === "edit" && <div className="reptile-room-digital-twin__inspector-fields"><label>X<input type="number" value={selectedSlot.x} onChange={(event) => setLocalSlots((current) => current.map((item) => item.id === selectedSlot.id ? { ...item, x: Number(event.target.value) || 0 } : item))} /></label><label>Y<input type="number" value={selectedSlot.y} onChange={(event) => setLocalSlots((current) => current.map((item) => item.id === selectedSlot.id ? { ...item, y: Number(event.target.value) || 0 } : item))} /></label><label>Z<input type="number" value={selectedSlot.z ?? 0} onChange={(event) => setLocalSlots((current) => current.map((item) => item.id === selectedSlot.id ? { ...item, z: Number(event.target.value) || 0 } : item))} /></label><label>Width<input type="number" value={selectedSlot.w} onChange={(event) => setLocalSlots((current) => current.map((item) => item.id === selectedSlot.id ? { ...item, w: Number(event.target.value) || 0 } : item))} /></label><label>Depth<input type="number" value={selectedSlot.depth ?? 0} onChange={(event) => setLocalSlots((current) => current.map((item) => item.id === selectedSlot.id ? { ...item, depth: Number(event.target.value) || 0 } : item))} /></label></div>}
                {inspectorTab === "occupant" && <div><label>Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => { const snakeId = event.target.value || null; const snake = snakeId ? snakesById.get(snakeId) : undefined; setLocalSlots((current) => current.map((item) => item.id === selectedSlot.id ? { ...item, snakeId, label: snake?.name ?? "Empty Vivarium", lifecycleStatus: snake ? "occupied" : "empty", photoUrl: "" } : item)); }}><option value="">Empty</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>{selectedSnake?.imageUrl && <img src={selectedSnake.imageUrl} alt={`${selectedSnake.name} reference`} className="reptile-room-digital-twin__snake-photo" />}</div>}
              </> : selectedObject ? <div className="reptile-room-digital-twin__inspector-fields"><p><strong>{selectedObject.label}</strong></p><label>X<input type="number" value={selectedObject.x} onChange={(event) => setLocalObjects((current) => current.map((item) => item.id === selectedObject.id ? { ...item, x: Number(event.target.value) || 0 } : item))} /></label><label>Y<input type="number" value={selectedObject.y} onChange={(event) => setLocalObjects((current) => current.map((item) => item.id === selectedObject.id ? { ...item, y: Number(event.target.value) || 0 } : item))} /></label><label>Z<input type="number" value={selectedObject.z ?? 0} onChange={(event) => setLocalObjects((current) => current.map((item) => item.id === selectedObject.id ? { ...item, z: Number(event.target.value) || 0 } : item))} /></label></div> : <p>Select something in the room to edit it.</p>}
            </section>
          </div>
        </details>
      </section>
    </main>
  );
}
