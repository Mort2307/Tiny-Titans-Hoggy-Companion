import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomAssetConfig, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomAsset } from "../services/reptileRoomAssetService";
import { uploadReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { CameraDirectionPad } from "../components/reptile-room-3d/ReptileRoomPOVViewer";
import { RoomAssetInspector } from "../components/reptile-room-3d/RoomAssetInspector";
import { RoomAssetLibraryPanel } from "../components/reptile-room-3d/RoomAssetLibraryPanel";
import type { Room3DAssetPreset, Room3DSelection, Room3DTransformPatch } from "../types/reptileRoom3D";
import type { Snake } from "../types/Snake";
import "../styles/stable-reptile-room-builder.css";

const DEFAULT_VIVARIUM = { width: 90, depth: 45, height: 45 };
const toNumber = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const idFor = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

type RotatableSlot = ReptileRoomSlot & { rotation?: number; parentAssetId?: string | null };
const slotRotation = (slot: ReptileRoomSlot) => (slot as RotatableSlot).rotation ?? 0;

function makeSlot(room: ReptileRoomWorkspace, preset: Room3DAssetPreset, snake?: Snake): ReptileRoomSlot {
  return {
    id: idFor("viv"),
    snakeId: snake?.id ?? null,
    label: snake ? `${snake.name}'s Vivarium` : preset.label || "Empty Vivarium",
    x: Math.max(0, Math.min((room.width ?? preset.width) - preset.width, (room.width ?? preset.width) / 2 - preset.width / 2)),
    y: Math.max(0, Math.min((room.depth ?? preset.depth) - preset.depth, (room.depth ?? preset.depth) / 2 - preset.depth / 2)),
    z: 0,
    w: preset.width,
    h: preset.depth,
    depth: preset.depth,
    height: preset.height,
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
    assetId: preset.assetId,
    intelligenceRole: preset.intelligenceRole,
    config: { ...(preset.config ?? {}) },
  };
}

function makeObject(room: ReptileRoomWorkspace, preset: Room3DAssetPreset): ReptileRoomObject {
  return {
    id: idFor("asset"),
    kind: preset.kind as ReptileRoomObject["kind"],
    label: preset.label,
    x: Math.max(0, Math.min((room.width ?? preset.width) - preset.width, (room.width ?? preset.width) / 2 - preset.width / 2)),
    y: Math.max(0, Math.min((room.depth ?? preset.depth) - preset.depth, (room.depth ?? preset.depth) / 2 - preset.depth / 2)),
    z: 0,
    width: Math.max(1, preset.width),
    depth: Math.max(1, preset.depth),
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

export default function StableReptileRoomBuilder() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<Room3DSelection>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"library" | "inspector" | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"edit" | "occupant">("edit");
  const [photoBusy, setPhotoBusy] = useState(false);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);
  const objects = useMemo(() => room?.objects ?? [], [room?.objects]);
  const slots = useMemo(() => room?.slots ?? [], [room?.slots]);
  const selectedObject = selected?.type === "object" ? objects.find((item) => item.id === selected.id) ?? null : null;
  const selectedSlot = selected?.type === "slot" ? slots.find((item) => item.id === selected.id) ?? null : null;
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [nextRooms, nextSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(nextRooms);
      setSnakes(nextSnakes);
      if (nextRooms.length) setRoomId((current) => nextRooms.some((item) => item.id === current) ? current : nextRooms[0].id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !profileLoading && user) void load();
  }, [loading, profileLoading, user, load]);

  const replaceRoom = useCallback((next: ReptileRoomWorkspace, message?: string) => {
    setRooms((current) => current.map((item) => item.id === next.id ? next : item));
    if (message) setNotice(message);
  }, []);

  const saveRoom = useCallback(async () => {
    if (!user || !room) return;
    setSaving(true);
    try {
      await saveReptileRooms(user.uid, [{ ...room, roomVersion: 4, updatedAt: new Date().toISOString() }]);
      setNotice("Room saved to cloud.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Room save failed.");
    } finally {
      setSaving(false);
    }
  }, [room, user]);

  const updateSelected = useCallback((patch: Room3DTransformPatch) => {
    if (!room || !selected) return;
    replaceRoom(selected.type === "object"
      ? { ...room, objects: objects.map((item) => item.id === selected.id ? { ...item, ...patch } : item) }
      : { ...room, slots: slots.map((item) => item.id === selected.id ? ({ ...item, ...patch } as ReptileRoomSlot) : item) });
  }, [objects, replaceRoom, room, selected, slots]);

  const updateRoom = useCallback((patch: Partial<ReptileRoomWorkspace>) => {
    if (!room) return;
    replaceRoom({ ...room, ...patch });
  }, [replaceRoom, room]);

  const addAsset = useCallback((preset: Room3DAssetPreset) => {
    if (!room) return;
    if (preset.kind === "vivarium") {
      const slot = makeSlot(room, preset);
      replaceRoom({ ...room, slots: [...slots, slot] }, `${preset.label} added.`);
      setSelected({ type: "slot", id: slot.id });
    } else {
      const object = makeObject(room, preset);
      replaceRoom({ ...room, objects: [...objects, object] }, `${preset.label} added.`);
      setSelected({ type: "object", id: object.id });
    }
    setMobilePanel(null);
  }, [objects, replaceRoom, room, slots]);

  const addSnakeVivarium = useCallback((snake: Snake) => {
    if (!room) return;
    const existing = slots.find((slot) => slot.snakeId === snake.id);
    if (existing) {
      setSelected({ type: "slot", id: existing.id });
      setInspectorTab("occupant");
      setMobilePanel("inspector");
      return;
    }
    const slot = makeSlot(room, { kind: "vivarium", label: "Vivarium", width: DEFAULT_VIVARIUM.width, depth: DEFAULT_VIVARIUM.depth, height: DEFAULT_VIVARIUM.height }, snake);
    replaceRoom({ ...room, slots: [...slots, slot] }, `${snake.name}'s vivarium added.`);
    setSelected({ type: "slot", id: slot.id });
    setInspectorTab("occupant");
    setMobilePanel("inspector");
  }, [replaceRoom, room, slots]);

  const deleteSelected = useCallback(() => {
    if (!room || !selected) return;
    const next = selected.type === "object"
      ? { ...room, objects: objects.filter((item) => item.id !== selected.id), slots: slots.map((slot) => slot.parentAssetId === selected.id ? ({ ...slot, parentAssetId: null } as RotatableSlot) : slot) }
      : { ...room, slots: slots.filter((item) => item.id !== selected.id) };
    replaceRoom(next, "Selection removed.");
    setSelected(null);
  }, [objects, replaceRoom, room, selected, slots]);

  const duplicateSelected = useCallback(() => {
    if (!room || !selectedObject) return;
    const copy = { ...selectedObject, id: idFor("asset"), label: `${selectedObject.label} Copy`, x: selectedObject.x + 10, y: selectedObject.y + 10, stackGroupId: null, parentAssetId: null };
    replaceRoom({ ...room, objects: [...objects, copy] }, "Asset duplicated.");
    setSelected({ type: "object", id: copy.id });
  }, [objects, replaceRoom, room, selectedObject]);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!user || !room || !selected) return;
    setPhotoBusy(true);
    try {
      if (selected.type === "slot" && selectedSlot) {
        const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file);
        replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) }, "Vivarium photo saved.");
      } else if (selected.type === "object" && selectedObject) {
        const url = await uploadReptileRoomAsset(user.uid, room.id, selectedObject.id, file);
        replaceRoom({ ...room, objects: objects.map((item) => item.id === selectedObject.id ? { ...item, config: { ...(item.config ?? {}), photoUrl: url } as ReptileRoomAssetConfig } : item) }, "Asset photo saved.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setPhotoBusy(false);
    }
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots, user]);

  if (loading || profileLoading) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Loading your reptile room…</div></main>;
  if (!user) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Please sign in to use the Reptile Room.</div></main>;
  if (!room) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Creating your reptile room…</div></main>;

  return <main className="stable-rr3d">
    <header className="stable-rr3d-header">
      <div><span className="stable-rr3d-kicker">TINY TITANS · 3D DIGITAL TWIN</span><h1>{room.name}</h1><p>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm · {slots.length} vivariums · {objects.length} assets</p></div>
      <div className="stable-rr3d-header-actions"><span>{saving ? "Saving…" : "✓ Saved"}</span><button type="button" onClick={() => void saveRoom()} disabled={saving}>Save Room</button></div>
    </header>
    {notice && <div className="stable-rr3d-notice" role="status">{notice}</div>}

    <section className="stable-rr3d-layout">
      <aside className="stable-rr3d-sidebar stable-rr3d-desktop-library">
        <RoomAssetLibraryPanel onAddAsset={addAsset} />
        <section className="stable-rr3d-snake-list"><div className="stable-rr3d-section-head"><h2>Your Snakes</h2><span>{snakes.length}</span></div>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => addSnakeVivarium(snake)}>🐍 {snake.name}<small>Add/select vivarium</small></button>)}</section>
        <section className="stable-rr3d-view-controls"><h2>View</h2><div><button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide grid" : "Show grid"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div></section>
      </aside>

      <section className="stable-rr3d-viewport">
        <Room3D room={room} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} showGrid={showGrid} showCeiling={showCeiling} onSelect={(selection) => { setSelected(selection); if (selection) setMobilePanel("inspector"); }} onTransformChange={updateSelected} onRoomChange={updateRoom} onSave={saveRoom} />
        <CameraDirectionPad room={room} className="stable-rr3d-camera-pad" />
        <div className="stable-rr3d-viewport-actions"><button type="button" onClick={() => setMobilePanel("library")}>Keeper Toolkit</button>{selected && <button type="button" onClick={() => setMobilePanel("inspector")}>Edit selected</button>}</div>
      </section>

      <aside className="stable-rr3d-inspector stable-rr3d-desktop-inspector">
        <Inspector selectedObject={selectedObject} selectedSlot={selectedSlot} snakes={snakes} snakesById={snakesById} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} updateSelected={updateSelected} updateRoom={updateRoom} selected={selected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} uploadPhoto={uploadPhoto} photoBusy={photoBusy} setNotice={setNotice} />
      </aside>
    </section>

    {mobilePanel && <div className="stable-rr3d-mobile-sheet" role="dialog" aria-modal="true" aria-label={mobilePanel === "library" ? "Keeper Toolkit" : "Asset inspector"}>
      <div className="stable-rr3d-mobile-sheet-backdrop" onClick={() => setMobilePanel(null)} />
      <div className="stable-rr3d-mobile-sheet-panel"><div className="stable-rr3d-mobile-sheet-head"><strong>{mobilePanel === "library" ? "Keeper Toolkit" : "Inspector"}</strong><button type="button" onClick={() => setMobilePanel(null)} aria-label="Close">×</button></div>{mobilePanel === "library" ? <><RoomAssetLibraryPanel onAddAsset={addAsset} /><section className="stable-rr3d-snake-list"><div className="stable-rr3d-section-head"><h2>Your Snakes</h2><span>{snakes.length}</span></div>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => addSnakeVivarium(snake)}>🐍 {snake.name}<small>Add/select vivarium</small></button>)}</section></> : <Inspector selectedObject={selectedObject} selectedSlot={selectedSlot} snakes={snakes} snakesById={snakesById} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} updateSelected={updateSelected} updateRoom={updateRoom} selected={selected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} uploadPhoto={uploadPhoto} photoBusy={photoBusy} setNotice={setNotice} />}</div>
    </div>}
  </main>;
}

function Inspector(props: {
  selectedObject: ReptileRoomObject | null;
  selectedSlot: ReptileRoomSlot | null;
  snakes: Snake[];
  snakesById: Map<string, Snake>;
  inspectorTab: "edit" | "occupant";
  setInspectorTab: (tab: "edit" | "occupant") => void;
  updateSelected: (patch: Room3DTransformPatch) => void;
  updateRoom: (patch: Partial<ReptileRoomWorkspace>) => void;
  selected: Room3DSelection;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  uploadPhoto: (file: File) => Promise<void>;
  photoBusy: boolean;
  setNotice: (message: string) => void;
}) {
  const { selectedObject, selectedSlot } = props;
  if (!selectedObject && !selectedSlot) return <div className="stable-rr3d-empty-inspector"><strong>Select an asset or vivarium</strong><span>Dimensions, placement, photo and intelligent configuration will appear here.</span></div>;
  const entity = selectedObject ?? selectedSlot;
  const width = selectedObject ? selectedObject.width : selectedSlot?.w ?? 1;
  const depth = selectedObject ? selectedObject.depth : selectedSlot?.depth ?? selectedSlot?.h ?? 1;
  const height = selectedObject ? selectedObject.height : selectedSlot?.height ?? 1;
  const rotation = selectedObject ? selectedObject.rotation : slotRotation(selectedSlot!);
  const photoUrl = selectedObject?.config?.photoUrl ?? selectedSlot?.photoUrl ?? "";
  return <div className="stable-rr3d-inspector-content">
    <div className="stable-rr3d-inspector-title"><div><span>SELECTED</span><h2>{entity?.label}</h2></div><button type="button" onClick={props.deleteSelected}>Delete</button></div>
    <div className="stable-rr3d-editor-grid">
      {(["width", "depth", "height"] as const).map((field) => <label key={field}>{field[0].toUpperCase() + field.slice(1)} cm<input type="number" min="1" value={field === "width" ? width : field === "depth" ? depth : height} onChange={(event) => props.updateSelected(field === "width" ? { width: Math.max(1, toNumber(event.target.value, 1)) } : field === "depth" ? { depth: Math.max(1, toNumber(event.target.value, 1)) } : { height: Math.max(1, toNumber(event.target.value, 1)) })} /></label>)}
    </div>
    <div className="stable-rr3d-editor-grid"><label>X cm<input type="number" value={Math.round(entity?.x ?? 0)} onChange={(event) => props.updateSelected({ x: Math.max(0, toNumber(event.target.value)) })} /></label><label>Y cm<input type="number" value={Math.round(entity?.y ?? 0)} onChange={(event) => props.updateSelected({ y: Math.max(0, toNumber(event.target.value)) })} /></label><label>Z cm<input type="number" value={Math.round(entity?.z ?? 0)} onChange={(event) => props.updateSelected({ z: Math.max(0, toNumber(event.target.value)) })} /></label></div>
    <div className="stable-rr3d-rotation"><span>Rotation</span><button type="button" onClick={() => props.updateSelected({ rotation: rotation - 15 })}>↶</button><strong>{Math.round(rotation)}°</strong><button type="button" onClick={() => props.updateSelected({ rotation: rotation + 15 })}>↷</button><button type="button" onClick={() => props.updateSelected({ rotation: 0 })}>Reset</button></div>
    <div className="stable-rr3d-inspector-actions"><button type="button" onClick={props.duplicateSelected}>Duplicate</button></div>
    {selectedSlot && <><div className="stable-rr3d-tabs"><button type="button" aria-pressed={props.inspectorTab === "edit"} onClick={() => props.setInspectorTab("edit")}>Position</button><button type="button" aria-pressed={props.inspectorTab === "occupant"} onClick={() => props.setInspectorTab("occupant")}>Occupant</button></div>{props.inspectorTab === "occupant" && <label className="stable-rr3d-smart-field">Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => { const snakeId = event.target.value || null; const snake = snakeId ? props.snakesById.get(snakeId) : undefined; props.updateSelected({ snakeId, label: snake ? `${snake.name}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snake ? "occupied" : "empty", availability: snake ? "occupied" : "available" }); }}>{<option value="">Empty vivarium</option>}{props.snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>}</>}
    <div className="stable-rr3d-photo"><div><strong>Reference photo</strong><small>Choose from your device gallery. The image is stored with this asset.</small></div>{photoUrl && <img src={photoUrl} alt={`${entity?.label} reference`} />}{<label className="stable-rr3d-photo-button">{photoBusy ? "Uploading…" : photoUrl ? "Replace photo" : "Choose photo"}<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void props.uploadPhoto(file); }} /></label>}</div>
    {selectedObject && <RoomAssetInspector object={selectedObject} slots={selectedSlot ? [selectedSlot] : []} onPatch={(patch) => { props.updateSelected({ ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.config ? { config: patch.config } : {}) }); }} />}
  </div>;
}
