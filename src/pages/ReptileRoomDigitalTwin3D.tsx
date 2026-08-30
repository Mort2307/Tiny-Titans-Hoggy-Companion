import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { CameraDirectionPad } from "../components/reptile-room-3d/ReptileRoomPOVViewer";
import { getCameraForwardSpawn } from "../components/reptile-room-3d/RoomCamera3D";
import { RoomAssetInspector } from "../components/reptile-room-3d/RoomAssetInspector";
import type { Room3DAssetPreset, Room3DSelection, Room3DTransformPatch } from "../types/reptileRoom3D";
import { clamp, snapArchitecturalObject, snapNumber } from "../services/reptileRoomSpatialService";
import { uploadReptileRoomAsset } from "../services/reptileRoomAssetService";
import type { Snake } from "../types/Snake";

const MOVE_STEP_CM = 5;
const DEFAULT_VIVARIUM = { width: 90, depth: 45, height: 45 };
type RotatableSlot = ReptileRoomSlot & { rotation?: number };

const idFor = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const cameraFromWindow = () => (window as Window & { __tinyTitansRoom3DCamera?: import("three").Camera }).__tinyTitansRoom3DCamera;

function makeObject(preset: Room3DAssetPreset, room: ReptileRoomWorkspace): ReptileRoomObject {
  const width = Math.max(1, preset.width);
  const depth = Math.max(1, preset.depth);
  return {
    id: idFor("room-object"),
    kind: preset.kind as ReptileRoomObject["kind"],
    label: preset.label,
    x: clamp(snapNumber((room.width ?? 360) / 2 - width / 2), 0, Math.max(0, (room.width ?? width) - width)),
    y: clamp(snapNumber((room.depth ?? 300) / 2 - depth / 2), 0, Math.max(0, (room.depth ?? depth) - depth)),
    z: 0,
    width,
    depth,
    height: Math.max(1, preset.height),
    rotation: 0,
    wall: null,
    stackGroupId: null,
    stackIndex: 0,
    parentAssetId: null,
    clearance: {},
    notes: "",
    assetType: preset.assetType ?? "equipment",
    assetId: preset.assetId,
    intelligenceRole: preset.intelligenceRole,
    config: { ...(preset.config ?? {}) },
  };
}

function makeVivarium(room: ReptileRoomWorkspace, snake?: Snake): ReptileRoomSlot {
  const width = DEFAULT_VIVARIUM.width;
  const depth = DEFAULT_VIVARIUM.depth;
  return {
    id: idFor("viv"),
    snakeId: snake?.id ?? null,
    label: snake?.name ?? "Empty Vivarium",
    x: clamp(snapNumber((room.width ?? 360) / 2 - width / 2), 0, Math.max(0, (room.width ?? width) - width)),
    y: clamp(snapNumber((room.depth ?? 300) / 2 - depth / 2), 0, Math.max(0, (room.depth ?? depth) - depth)),
    z: 0,
    w: width,
    h: depth,
    depth,
    height: DEFAULT_VIVARIUM.height,
    lifecycleStatus: snake ? "occupied" : "empty",
    condition: "good",
    availability: snake ? "occupied" : "available",
    storageLocation: "",
    storageNote: "",
    notes: "",
    maintenanceNote: "",
    photoUrl: "",
    stackGroupId: null,
    stackIndex: 0,
    parentSlotId: null,
  };
}

export default function ReptileRoomDigitalTwin3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<Room3DSelection>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"edit" | "occupant">("edit");

  const room = useMemo(() => rooms.find((entry) => entry.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const objects = useMemo(() => room?.objects ?? [], [room?.objects]);
  const slots = useMemo(() => room?.slots ?? [], [room?.slots]);
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);
  const selectedObject = selected?.type === "object" ? objects.find((item) => item.id === selected.id) ?? null : null;
  const selectedSlot = selected?.type === "slot" ? slots.find((item) => item.id === selected.id) ?? null : null;
  const selectedSnake = selectedSlot?.snakeId ? snakesById.get(selectedSlot.snakeId) : undefined;

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms);
      setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((entry) => entry.id === current) ? current : loadedRooms[0].id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !profileLoading && user) void load();
  }, [loading, profileLoading, user, load]);

  const persistRoom = useCallback(async (next: ReptileRoomWorkspace, message?: string) => {
    if (!user) return;
    const stamped = { ...next, roomVersion: 4, updatedAt: new Date().toISOString() };
    setRooms((current) => current.map((entry) => entry.id === stamped.id ? stamped : entry));
    setSaving(true);
    try {
      await saveReptileRooms(user.uid, [stamped]);
      if (message) setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Saved locally, but cloud sync failed.");
    } finally {
      setSaving(false);
    }
  }, [user]);

  const updateRoom = useCallback((patch: Partial<ReptileRoomWorkspace>) => {
    if (!room) return;
    setRooms((current) => current.map((entry) => entry.id === room.id ? { ...entry, ...patch } : entry));
  }, [room]);

  const updateSelected = useCallback((patch: Room3DTransformPatch) => {
    if (!selected) return;
    setRooms((current) => current.map((entry) => {
      if (entry.id !== room?.id) return entry;
      if (selected.type === "object") return { ...entry, objects: (entry.objects ?? []).map((item) => item.id === selected.id ? { ...item, ...patch } : item) };
      return { ...entry, slots: entry.slots.map((item) => item.id === selected.id ? { ...item, ...patch } : item) };
    }));
  }, [room?.id, selected]);

  const handleTransformChange = useCallback((selection: { type: "slot" | "object"; id: string }, patch: Room3DTransformPatch) => {
    if (!room) return;
    setRooms((current) => current.map((entry) => {
      if (entry.id !== room.id) return entry;
      if (selection.type === "object") return { ...entry, objects: (entry.objects ?? []).map((item) => item.id === selection.id ? { ...item, ...patch } : item) };
      return { ...entry, slots: entry.slots.map((item) => item.id === selection.id ? { ...item, ...patch } : item) };
    }));
  }, [room]);

  const handleMove = useCallback((selection: { type: "slot" | "object"; id: string }, dx: number, dy: number, dz: number, commit: boolean) => {
    if (!room) return;
    const source = selection.type === "object" ? objects.find((item) => item.id === selection.id) : slots.find((item) => item.id === selection.id);
    if (!source) return;
    const patch = { x: source.x + dx, y: source.y + dy, z: (source.z ?? 0) + dz };
    handleTransformChange(selection, patch);
    if (commit) {
      const next: ReptileRoomWorkspace = selection.type === "object"
        ? { ...room, objects: objects.map((item) => item.id === selection.id ? { ...item, ...patch } : item) }
        : { ...room, slots: slots.map((item) => item.id === selection.id ? { ...item, ...patch } : item) };
      void persistRoom(next);
    }
  }, [handleTransformChange, objects, persistRoom, room, slots]);

  const addPreset = useCallback((preset: Room3DAssetPreset) => {
    if (!room) return;
    const camera = cameraFromWindow();
    if (preset.kind === "vivarium") {
      const slot = makeVivarium(room);
      if (camera) {
        const point = getCameraForwardSpawn(camera, 120, room);
        slot.x = clamp(snapNumber(point.xCm - slot.w / 2), 0, Math.max(0, (room.width ?? slot.w) - slot.w));
        slot.y = clamp(snapNumber(point.zCm - (slot.depth ?? slot.h) / 2), 0, Math.max(0, (room.depth ?? slot.h) - (slot.depth ?? slot.h)));
      }
      const next = { ...room, slots: [...room.slots, slot] };
      setRooms((current) => current.map((entry) => entry.id === room.id ? next : entry));
      setSelected({ type: "slot", id: slot.id });
      return;
    }
    const object = makeObject(preset, room);
    const next = { ...room, objects: [...(room.objects ?? []), object] };
    setRooms((current) => current.map((entry) => entry.id === room.id ? next : entry));
    setSelected({ type: "object", id: object.id });
  }, [room]);

  const addSnakeVivarium = useCallback((snake: Snake) => {
    if (!room) return;
    const existing = slots.find((slot) => slot.snakeId === snake.id);
    if (existing) {
      setSelected({ type: "slot", id: existing.id });
      setInspectorTab("occupant");
      return;
    }
    const slot = makeVivarium(room, snake);
    const next = { ...room, slots: [...room.slots, slot] };
    setRooms((current) => current.map((entry) => entry.id === room.id ? next : entry));
    setSelected({ type: "slot", id: slot.id });
    setInspectorTab("occupant");
  }, [room, slots]);

  const deleteSelected = useCallback(() => {
    if (!room || !selected) return;
    const next = selected.type === "object"
      ? { ...room, objects: objects.filter((item) => item.id !== selected.id) }
      : { ...room, slots: slots.filter((item) => item.id !== selected.id) };
    setRooms((current) => current.map((entry) => entry.id === room.id ? next : entry));
    setSelected(null);
  }, [objects, room, selected, slots]);

  const duplicateSelected = useCallback(() => {
    if (!room || !selectedObject) return;
    const copy = { ...selectedObject, id: idFor("room-object"), label: `${selectedObject.label} · Copy`, x: selectedObject.x + 10, y: selectedObject.y + 10 };
    const next = { ...room, objects: [...objects, copy] };
    setRooms((current) => current.map((entry) => entry.id === room.id ? next : entry));
    setSelected({ type: "object", id: copy.id });
  }, [objects, room, selectedObject]);

  const saveCurrent = useCallback(async () => {
    if (room) await persistRoom({ ...room, objects, slots }, "Room changes saved.");
  }, [objects, persistRoom, room, slots]);

  const uploadSelectedObjectPhoto = useCallback(async (file: File) => {
    if (!user || !room || !selectedObject) return;
    setNotice("Uploading reference photo…");
    try {
      const url = await uploadReptileRoomAsset(user.uid, room.id, "room-photo", file);
      const nextObject = { ...selectedObject, config: { ...(selectedObject.config ?? {}), photoUrl: url } as ReptileRoomObject["config"] };
      const nextRoom = { ...room, objects: objects.map((item) => item.id === selectedObject.id ? nextObject : item) };
      setRooms((current) => current.map((entry) => entry.id === room.id ? nextRoom : entry));
      await persistRoom(nextRoom, "Reference photo added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to upload the reference photo.");
    }
  }, [objects, persistRoom, room, selectedObject, user]);

  const nudge = useCallback((axis: "x" | "y" | "z", delta: number) => {
    if (!selected || !room) return;
    const source = selected.type === "object" ? objects.find((item) => item.id === selected.id) : slots.find((item) => item.id === selected.id);
    if (!source) return;
    updateSelected({ [axis]: (source[axis] ?? 0) + delta } as Room3DTransformPatch);
  }, [objects, room, selected, slots, updateSelected]);

  const snapSelected = useCallback(() => {
    if (!selected || !room) return;
    if (selected.type === "object") {
      const item = objects.find((entry) => entry.id === selected.id);
      if (item) updateSelected(snapArchitecturalObject(item, room.width ?? 0, room.depth ?? 0));
    } else {
      const item = slots.find((entry) => entry.id === selected.id);
      if (item) updateSelected({ x: snapNumber(item.x), y: snapNumber(item.y), z: snapNumber(item.z) });
    }
  }, [objects, room, selected, slots, updateSelected]);

  const presetAssets: Room3DAssetPreset[] = [
    { kind: "rack", label: "Vivarium Rack", width: 120, depth: 50, height: 180, assetType: "furniture" },
    { kind: "shelf", label: "Shelf", width: 100, depth: 35, height: 120, assetType: "furniture" },
    { kind: "cabinet", label: "Storage Cabinet", width: 80, depth: 45, height: 100, assetType: "furniture" },
    { kind: "workbench", label: "Workbench", width: 140, depth: 65, height: 90, assetType: "furniture" },
    { kind: "table", label: "Keeper Table", width: 100, depth: 60, height: 75, assetType: "furniture" },
    { kind: "chair", label: "Chair", width: 50, depth: 50, height: 90, assetType: "furniture" },
    { kind: "plant", label: "Plant", width: 45, depth: 45, height: 100, assetType: "decor" },
    { kind: "lamp", label: "Lamp", width: 30, depth: 30, height: 140, assetType: "equipment" },
    { kind: "vent", label: "Ventilation Unit", width: 50, depth: 20, height: 20, assetType: "equipment" },
  ];

  if (!user || loading || profileLoading) return <main className="reptile-room-digital-twin"><p>Loading your reptile room...</p></main>;
  if (!room) return <main className="reptile-room-digital-twin"><section><h1>Reptile Room Digital Twin</h1><p>Create your first room to start building.</p></section></main>;

  return <main className="reptile-room-digital-twin">
    <header className="reptile-room-digital-twin__header">
      <div><span className="eyebrow">TINY TITANS · DIGITAL TWIN</span><h1>{room.name}</h1><p>Build, position and understand your real reptile room in 3D.</p></div>
      <div className="reptile-room-digital-twin__actions"><button type="button" onClick={() => void saveCurrent()} disabled={saving}>{saving ? "Saving…" : "Save Room"}</button><button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide Grid" : "Show Grid"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide Ceiling" : "Show Ceiling"}</button></div>
    </header>
    {notice && <div className="reptile-room-digital-twin__notice" role="status">{notice}</div>}
    <section className="reptile-room-digital-twin__layout">
      <aside className="reptile-room-digital-twin__sidebar">
        <section><h2>Add to Room</h2><button type="button" onClick={() => addPreset({ kind: "vivarium", label: "Vivarium", width: DEFAULT_VIVARIUM.width, depth: DEFAULT_VIVARIUM.depth, height: DEFAULT_VIVARIUM.height })}>+ Empty Vivarium</button>{snakes.length > 0 && <div><h3>Your Snakes</h3>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => addSnakeVivarium(snake)}>Snake · {snake.name}</button>)}</div>}</section>
        <section><h2>Props & Equipment</h2><div className="reptile-room-digital-twin__asset-list">{presetAssets.map((preset) => <button key={preset.label} type="button" onClick={() => addPreset(preset)}>{preset.label}<small>{preset.width} × {preset.depth} × {preset.height} cm</small></button>)}</div></section>
        <section><h2>Room</h2><label>Width<input type="number" value={room.width ?? 0} onChange={(event) => updateRoom({ width: Math.max(100, Number(event.target.value) || 100) })} /></label><label>Depth<input type="number" value={room.depth ?? 0} onChange={(event) => updateRoom({ depth: Math.max(100, Number(event.target.value) || 100) })} /></label><label>Height<input type="number" value={room.height ?? 0} onChange={(event) => updateRoom({ height: Math.max(100, Number(event.target.value) || 100) })} /></label></section>
      </aside>
      <section className="reptile-room-digital-twin__viewport">
        <Room3D room={room} objects={objects} slots={slots} showGrid={showGrid} showCeiling={showCeiling} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} onSelect={setSelected} onMove={handleMove} onTransformChange={handleTransformChange} onSave={saveCurrent} onRoomChange={updateRoom} />
        <CameraDirectionPad room={room} className="reptile-room-digital-twin__camera-pad" />
        {selected && <div className="reptile-room-digital-twin__selection"><strong>{selectedObject?.label ?? selectedSnake?.name ?? selectedSlot?.label ?? "Selected"}</strong><div><button type="button" onClick={() => nudge("x", -MOVE_STEP_CM)}>X −</button><button type="button" onClick={() => nudge("x", MOVE_STEP_CM)}>X +</button><button type="button" onClick={() => nudge("y", -MOVE_STEP_CM)}>Y −</button><button type="button" onClick={() => nudge("y", MOVE_STEP_CM)}>Y +</button><button type="button" onClick={() => nudge("z", -MOVE_STEP_CM)}>Z −</button><button type="button" onClick={() => nudge("z", MOVE_STEP_CM)}>Z +</button><button type="button" onClick={snapSelected}>Snap</button><button type="button" onClick={deleteSelected}>Delete</button>{selectedObject && <button type="button" onClick={duplicateSelected}>Duplicate</button>}</div></div>}
      </section>
      <aside className="reptile-room-digital-twin__inspector">
        <h2>Inspector</h2>
        {!selected && <p>Select a vivarium or room asset to edit it.</p>}
        {selectedSlot && <>
          <div className="rr3d-editor-heading"><p><strong>{selectedSlot.label}</strong></p><button type="button" className="rr3d-delete-button" onClick={deleteSelected}>Delete</button></div>
          <div className="rr3d-editor-grid"><label>X cm<input type="number" value={selectedSlot.x} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} /></label><label>Y cm<input type="number" value={selectedSlot.y} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} /></label><label>Z cm<input type="number" value={selectedSlot.z} onChange={(event) => updateSelected({ z: Number(event.target.value) || 0 })} /></label></div>
          <div className="rr3d-editor-grid"><label>Width cm<input type="number" value={selectedSlot.w} onChange={(event) => updateSelected({ w: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Depth cm<input type="number" value={selectedSlot.depth ?? selectedSlot.h} onChange={(event) => updateSelected({ depth: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Height cm<input type="number" value={selectedSlot.height ?? DEFAULT_VIVARIUM.height} onChange={(event) => updateSelected({ height: Math.max(1, Number(event.target.value) || 1) })} /></label></div>
          <div className="rr3d-rotation-editor"><span>Rotation</span><button type="button" onClick={() => updateSelected({ rotation: ((selectedSlot as RotatableSlot).rotation ?? 0) - 15 } as Partial<RotatableSlot>)}>−</button><strong>{Math.round((selectedSlot as RotatableSlot).rotation ?? 0)}°</strong><button type="button" onClick={() => updateSelected({ rotation: ((selectedSlot as RotatableSlot).rotation ?? 0) + 15 } as Partial<RotatableSlot>)}>+</button><span /></div>
          <div role="tablist"><button type="button" onClick={() => setInspectorTab("edit")} aria-pressed={inspectorTab === "edit"}>Position</button><button type="button" onClick={() => setInspectorTab("occupant")} aria-pressed={inspectorTab === "occupant"}>Occupant</button></div>
          {inspectorTab === "occupant" && <label>Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => { const snakeId = event.target.value || null; const snake = snakeId ? snakesById.get(snakeId) : undefined; updateSelected({ snakeId, label: snake?.name ?? "Empty Vivarium", lifecycleStatus: snake ? "occupied" : "empty", availability: snake ? "occupied" : "available" }); }}>{<option value="">Empty</option>}{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>}
        </>}
        {selectedObject && <>
          <div className="rr3d-editor-heading"><p><strong>{selectedObject.label}</strong></p><button type="button" className="rr3d-delete-button" onClick={deleteSelected}>Delete</button></div>
          <label>Asset name<input type="text" value={selectedObject.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
          <div className="rr3d-editor-grid"><label>Width cm<input type="number" min="1" value={selectedObject.width} onChange={(event) => updateSelected({ width: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Depth cm<input type="number" min="1" value={selectedObject.depth} onChange={(event) => updateSelected({ depth: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Height cm<input type="number" min="1" value={selectedObject.height} onChange={(event) => updateSelected({ height: Math.max(1, Number(event.target.value) || 1) })} /></label></div>
          <div className="rr3d-editor-grid"><label>X cm<input type="number" value={selectedObject.x} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} /></label><label>Y cm<input type="number" value={selectedObject.y} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} /></label><label>Z cm<input type="number" value={selectedObject.z} onChange={(event) => updateSelected({ z: Number(event.target.value) || 0 })} /></label></div>
          <div className="rr3d-rotation-editor"><span>Rotation</span><button type="button" onClick={() => updateSelected({ rotation: selectedObject.rotation - 15 })}>−</button><strong>{Math.round(selectedObject.rotation)}°</strong><button type="button" onClick={() => updateSelected({ rotation: selectedObject.rotation + 15 })}>+</button><span /></div>
          <div className="rr3d-photo-picker">
            <span>Reference photo</span>
            <label className="rr3d-photo-picker__button">{selectedObject.config?.photoUrl ? "Replace photo" : "Choose photo"}<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void uploadSelectedObjectPhoto(file); }} hidden /></label>
          </div>
          {selectedObject.config?.photoUrl && <img src={selectedObject.config.photoUrl} alt={`${selectedObject.label} reference`} className="rr3d-photo-preview" />}
          <RoomAssetInspector object={selectedObject} slots={slots} onPatch={({ config, label }) => updateSelected({ ...(label !== undefined ? { label } : {}), ...(config ? { config } : {}) })} />
        </>}
      </aside>
    </section>
  </main>;
}
