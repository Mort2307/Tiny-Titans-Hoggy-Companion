import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomWorkspace, type ReptileRoomSlot } from "../services/reptileRoomService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { getCameraForwardSpawn } from "../components/reptile-room-3d/RoomCamera3D";
import type { Room3DSelection, Room3DAssetPreset } from "../types/reptileRoom3D";
import { clamp, intersects2D, objectRect, slotRect, snapArchitecturalObject, snapNumber, validateSpatialLayout } from "../services/reptileRoomSpatialService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
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

function makePlacedObject(kind: Room3DAssetPreset["kind"], label: string, width: number, depth: number, height: number, x: number, y: number, assetType: ReptileRoomObject["assetType"] = "furniture"): ReptileRoomObject {
  if (kind === "vivarium") throw new Error("Vivarium presets must be created as room slots.");
  return { id: createId("room-object"), kind, label, x, y, z: 0, width, depth, height, rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null, clearance: {}, notes: "", assetType };
}

function makeVivarium(width: number, depth: number, height: number, x: number, y: number): ReptileRoomSlot {
  return { id: createId("viv"), snakeId: null, label: "Empty Vivarium", x, y, z: 0, w: width, h: depth, depth, height, rotation: 0, lifecycleStatus: "empty", condition: "good", availability: "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null, photoUrl: "" };
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
  const dz = Math.min(Math.abs((a.z + a.height) - b.z), Math.abs((b.z + b.height) - a.z));
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
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedSlot = selectedType === "slot" ? localSlots.find((slot) => slot.id === selectedId) ?? null : null;
  const selectedObject = selectedType === "object" ? localObjects.find((object) => object.id === selectedId) ?? null : null;
  const selectedSnake = selectedSlot?.snakeId ? snakesById.get(selectedSlot.snakeId) : undefined;
  const selectedStackLocked = Boolean(selectedSlot?.stackGroupId || selectedObject?.stackGroupId);
  const spatialIssues = useMemo(() => room ? validateSpatialLayout(localSlots, localObjects, room.width ?? 0, room.depth ?? 0, room.height ?? 0) : [], [localObjects, localSlots, room]);
  const selectedIssues = useMemo(() => selectedId ? spatialIssues.filter((issue) => issue.ids.includes(selectedId)) : [], [selectedId, spatialIssues]);

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
    setMobileInspectorOpen(true);
  }, []);

  const updateObject = useCallback((id: string, patch: Partial<ReptileRoomObject>, commit = false) => {
    const next = localObjects.map((item) => item.id === id ? { ...item, ...patch } : item);
    setLocalObjects(next);
    if (commit) void persistState(next, localSlots, "Object saved.");
  }, [localObjects, localSlots, persistState]);

  const updateSlot = useCallback((id: string, patch: Partial<ReptileRoomSlot>, commit = false) => {
    const next = localSlots.map((item) => item.id === id ? { ...item, ...patch } : item);
    setLocalSlots(next);
    if (commit) void persistState(localObjects, next, "Vivarium saved.");
  }, [localObjects, localSlots, persistState]);

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
      const slot: ReptileRoomSlot = { ...makeVivarium(preset.width, preset.depth, preset.height, x, y) };
      setLocalSlots((current) => [...current, slot]);
      setSelectedId(slot.id);
      setSelectedType("slot");
      return;
    }
    addObject(makePlacedObject(preset.kind, preset.label, preset.width, preset.depth, preset.height, x, y, preset.assetType));
  }, [room, addObject]);

  const createVivariumAtCamera = useCallback(() => {
    if (!room) return;
    const camera = (window as Window & { __tinyTitansRoom3DCamera?: import("three").Camera }).__tinyTitansRoom3DCamera;
    if (!camera) return setNotice("3D camera is still starting - try again in a moment.");
    const point = getCameraForwardSpawn(camera, 120, room);
    const width = 90;
    const depth = 45;
    const x = clamp(snapNumber(point.xCm - width / 2), 0, Math.max(0, (room.width ?? width) - width));
    const y = clamp(snapNumber(point.zCm - depth / 2), 0, Math.max(0, (room.depth ?? depth) - depth));
    const slot = makeVivarium(width, depth, 45, x, y);
    setLocalSlots((current) => [...current, slot]);
    setSelectedId(slot.id);
    setSelectedType("slot");
  }, [room]);

  const createSnakeVivarium = useCallback((snake: Snake) => {
    if (!room) return;
    const existing = localSlots.find((slot) => slot.snakeId === snake.id);
    if (existing) {
      setSelectedId(existing.id);
      setSelectedType("slot");
      return;
    }
    const camera = (window as Window & { __tinyTitansRoom3DCamera?: import("three").Camera }).__tinyTitansRoom3DCamera;
    if (!camera) return setNotice("3D camera is still starting - try again in a moment.");
    const point = getCameraForwardSpawn(camera, 120, room);
    const width = 90;
    const depth = 45;
    const x = clamp(snapNumber(point.xCm - width / 2), 0, Math.max(0, (room.width ?? width) - width));
    const y = clamp(snapNumber(point.zCm - depth / 2), 0, Math.max(0, (room.depth ?? depth) - depth));
    const slot: ReptileRoomSlot = { ...makeVivarium(width, depth, 45, x, y), snakeId: snake.id, label: snake.name, lifecycleStatus: "occupied", photoUrl: "" };
    setLocalSlots((current) => [...current, slot]);
    setSelectedId(slot.id);
    setSelectedType("slot");
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
    if (selectedType === "object") { const next = localObjects.map((item) => item.id === selectedId ? { ...item, [axis]: Math.max(0, (item[axis] ?? 0) + delta) } : item); void persistState(next, localSlots, "Object moved."); }
    if (selectedType === "slot") { const next = localSlots.map((item) => item.id === selectedId ? { ...item, [axis]: Math.max(0, (item[axis] ?? 0) + delta) } : item); void persistState(localObjects, next, "Vivarium moved."); }
  }, [localObjects, localSlots, persistState, selectedId, selectedType]);

  const placeSelectedOnSupport = useCallback(() => {
    if (!selectedSlot && !selectedObject) return;
    const selectedRect = selectedSlot ? slotRect(selectedSlot) : objectRect(selectedObject!);
    const supports = localObjects.filter((item) => ["table", "workbench", "cabinet", "storage-cabinet", "shelf", "shelving", "rack"].includes(item.kind) && item.id !== selectedObject?.id)
      .filter((item) => intersects2D(selectedRect, objectRect(item)))
      .sort((a, b) => (b.z + b.height) - (a.z + a.height));
    const support = supports[0];
    if (!support) { setNotice("Move the item over a table, shelf, rack or cabinet first, then use Place on support."); return; }
    const z = Math.max(0, support.z + support.height);
    if (selectedSlot) updateSlot(selectedSlot.id, { z }, true);
    else updateObject(selectedObject!.id, { z }, true);
    setNotice(`${selectedSlot?.label ?? selectedObject?.label} placed on ${support.label}.`);
  }, [localObjects, selectedObject, selectedSlot, updateObject, updateSlot]);

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

  const selectedItem = selectedObject ?? selectedSlot;
  const setNumber = (value: string, minimum = 0) => Math.max(minimum, Number.isFinite(Number(value)) ? Number(value) : minimum);
  const commitSelected = () => void persistState(localObjects, localSlots, "Room changes saved.");
  const rotateSelected = (delta: number) => {
    if (selectedObject) updateObject(selectedObject.id, { rotation: ((selectedObject.rotation + delta) % 360 + 360) % 360 }, true);
    if (selectedSlot) updateSlot(selectedSlot.id, { rotation: (((selectedSlot.rotation ?? 0) + delta) % 360 + 360) % 360 }, true);
  };
  const duplicateSelected = () => {
    if (selectedObject) { const copy = { ...selectedObject, id: createId("room-object"), label: `${selectedObject.label} copy`, x: selectedObject.x + 15, y: selectedObject.y + 15 }; void persistState([...localObjects, copy], localSlots, "Object duplicated."); setSelectedId(copy.id); return; }
    if (selectedSlot) { const copy = { ...selectedSlot, id: createId("viv"), label: `${selectedSlot.label} copy`, snakeId: null, lifecycleStatus: "empty" as const, availability: "available" as const, x: selectedSlot.x + 15, y: selectedSlot.y + 15 }; void persistState(localObjects, [...localSlots, copy], "Vivarium duplicated."); setSelectedId(copy.id); }
  };
  const deleteSelected = () => {
    if (!selectedItem || !window.confirm(`Delete ${selectedItem.label}? This cannot be undone yet.`)) return;
    if (selectedObject) void persistState(localObjects.filter((item) => item.id !== selectedObject.id), localSlots, "Object deleted.");
    if (selectedSlot) void persistState(localObjects, localSlots.filter((item) => item.id !== selectedSlot.id), "Vivarium deleted.");
    setSelectedId(null); setSelectedType(null); setMobileInspectorOpen(false);
  };
  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !room || !selectedSlot) return;
    setUploadingPhoto(true); setNotice("");
    try { const photoUrl = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file); updateSlot(selectedSlot.id, { photoUrl }, true); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to upload the vivarium face image."); }
    finally { setUploadingPhoto(false); event.target.value = ""; }
  };
  const inspector = selectedItem ? <>
    <h2>{selectedSlot ? "Vivarium" : "Object"} Inspector</h2><p><strong>{selectedItem.label}</strong></p>
    {selectedIssues.map((issue) => <p key={`${issue.message}-${issue.severity}`} className={`reptile-room-digital-twin__issue reptile-room-digital-twin__issue--${issue.severity}`}>{issue.message}</p>)}
    <div className="reptile-room-digital-twin__dimension-grid">
      <label>Width (cm)<input type="number" min="1" max="1000" value={selectedSlot ? selectedSlot.w : selectedObject!.width} onChange={(e) => selectedSlot ? updateSlot(selectedSlot.id, { w: setNumber(e.target.value, 1) }) : updateObject(selectedObject!.id, { width: setNumber(e.target.value, 1) })} onBlur={commitSelected} /></label>
      <label>Depth (cm)<input type="number" min="1" max="1000" value={selectedSlot ? selectedSlot.depth ?? selectedSlot.h : selectedObject!.depth} onChange={(e) => selectedSlot ? updateSlot(selectedSlot.id, { depth: setNumber(e.target.value, 1), h: setNumber(e.target.value, 1) }) : updateObject(selectedObject!.id, { depth: setNumber(e.target.value, 1) })} onBlur={commitSelected} /></label>
      <label>Height (cm)<input type="number" min="1" max="1000" value={selectedSlot ? selectedSlot.height ?? 45 : selectedObject!.height} onChange={(e) => selectedSlot ? updateSlot(selectedSlot.id, { height: setNumber(e.target.value, 1) }) : updateObject(selectedObject!.id, { height: setNumber(e.target.value, 1) })} onBlur={commitSelected} /></label>
    </div>
    <div className="reptile-room-digital-twin__dimension-grid"><label>X (cm)<input type="number" min="0" value={selectedItem.x} onChange={(e) => selectedSlot ? updateSlot(selectedSlot.id, { x: setNumber(e.target.value) }) : updateObject(selectedObject!.id, { x: setNumber(e.target.value) })} onBlur={commitSelected} /></label><label>Y (cm)<input type="number" min="0" value={selectedItem.y} onChange={(e) => selectedSlot ? updateSlot(selectedSlot.id, { y: setNumber(e.target.value) }) : updateObject(selectedObject!.id, { y: setNumber(e.target.value) })} onBlur={commitSelected} /></label><label>Z (cm)<input type="number" min="0" value={selectedItem.z ?? 0} onChange={(e) => selectedSlot ? updateSlot(selectedSlot.id, { z: setNumber(e.target.value) }) : updateObject(selectedObject!.id, { z: setNumber(e.target.value) })} onBlur={commitSelected} /></label></div>
    <div className="reptile-room-digital-twin__rotation"><button type="button" onClick={() => rotateSelected(-15)}>↶ 15°</button><strong>{Math.round(selectedSlot?.rotation ?? selectedObject?.rotation ?? 0)}°</strong><button type="button" onClick={() => rotateSelected(15)}>15° ↷</button><button type="button" onClick={() => selectedSlot ? updateSlot(selectedSlot.id, { rotation: 0 }, true) : updateObject(selectedObject!.id, { rotation: 0 }, true)}>Reset</button></div>
    {selectedSlot && <><div className="reptile-room-digital-twin__photo-actions"><label className="reptile-room-digital-twin__photo-button">{uploadingPhoto ? "Uploading…" : "Change Face Image"}<input type="file" accept="image/*" disabled={uploadingPhoto} onChange={uploadPhoto} /></label>{selectedSlot.photoUrl && <button type="button" onClick={() => updateSlot(selectedSlot.id, { photoUrl: "" }, true)}>Remove Face Image</button>}{selectedSnake?.imageUrl && <button type="button" onClick={() => updateSlot(selectedSlot.id, { photoUrl: selectedSnake.imageUrl }, true)}>Use Snake Photo</button>}</div>{selectedSlot.photoUrl && <img className="reptile-room-digital-twin__face-preview" src={selectedSlot.photoUrl} alt="Vivarium face image preview" />}<label>Snake<select value={selectedSlot.snakeId ?? ""} onChange={(e) => { const snakeId = e.target.value || null; const snake = snakeId ? snakesById.get(snakeId) : undefined; updateSlot(selectedSlot.id, { snakeId, label: snake?.name ?? "Empty Vivarium", lifecycleStatus: snake ? "occupied" : "empty", availability: snake ? "occupied" : "available" }, true); }}><option value="">Empty</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label></>}
    <div className="reptile-room-digital-twin__inspector-actions"><button type="button" onClick={duplicateSelected}>Duplicate</button><button type="button" className="reptile-room-digital-twin__delete" onClick={deleteSelected}>{selectedSlot ? "Delete Vivarium" : "Delete"}</button></div>
  </> : <><h2>Inspector</h2><p>Select an object in the room to edit it.</p></>;

  return <main className="reptile-room-digital-twin"><header className="reptile-room-digital-twin__header"><div><span className="eyebrow">TINY TITANS · DIGITAL TWIN</span><h1>{room.name}</h1><p>Build, position and preserve your real reptile room in 3D.</p></div><div className="reptile-room-digital-twin__actions"><button type="button" onClick={saveCurrent}>Save Room</button><button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide Grid" : "Show Grid"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide Ceiling" : "Show Ceiling"}</button></div></header>{notice && <div className="reptile-room-digital-twin__notice" role="status">{notice}</div>}<section className="reptile-room-digital-twin__layout"><aside className="reptile-room-digital-twin__sidebar"><section><h2>Add to Room</h2><button type="button" onClick={createVivariumAtCamera}>＋ Empty Vivarium</button>{snakes.length > 0 && <div><h3>Your Snakes</h3>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => createSnakeVivarium(snake)}>🐍 {snake.name}</button>)}</div>}</section><section><h2>Props & Equipment</h2><div className="reptile-room-digital-twin__asset-list">{assetPresets.map((preset) => <button key={`${preset.kind}-${preset.label}`} type="button" onClick={() => spawnAsset(preset)}>{preset.label}<small>{preset.width} × {preset.depth} × {preset.height} cm</small></button>)}</div></section></aside><section className="reptile-room-digital-twin__viewport"><Room3D room={room} objects={localObjects} slots={localSlots} selectedId={selectedId} selectedType={selectedType} showGrid={showGrid} showCeiling={showCeiling} onSelect={handleSelect} /><div className="reptile-room-digital-twin__selection"><strong>{selectedLabel}</strong>{selectedItem && <div><button type="button" onClick={() => updateSelectedPosition("x", -MOVE_STEP_CM)}>← X</button><button type="button" onClick={() => updateSelectedPosition("x", MOVE_STEP_CM)}>X →</button><button type="button" onClick={() => updateSelectedPosition("y", -MOVE_STEP_CM)}>↑ Y</button><button type="button" onClick={() => updateSelectedPosition("y", MOVE_STEP_CM)}>Y ↓</button><button type="button" onClick={snapSelected}>Snap</button><button type="button" onClick={autoPlaceSelected}>Auto place</button><button type="button" onClick={placeSelectedOnSupport}>Place on support</button><button type="button" onClick={toggleStackLock}>{selectedStackLocked ? "Unlock stack" : "Lock stack"}</button><button type="button" onClick={() => setMobileInspectorOpen(true)}>Edit</button></div>}</div></section><aside className="reptile-room-digital-twin__inspector">{inspector}</aside>{mobileInspectorOpen && selectedItem && <div className="reptile-room-digital-twin__mobile-sheet" role="dialog" aria-label="Selected object editor"><button type="button" className="reptile-room-digital-twin__sheet-close" onClick={() => setMobileInspectorOpen(false)}>Close</button>{inspector}</div>}</section></main>;
}
