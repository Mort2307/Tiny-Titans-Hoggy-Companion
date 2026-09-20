import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomAssetConfig, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomAssetPhoto, deleteReptileRoomAssetPhoto } from "../services/reptileRoomAssetPhotoService";
import { uploadReptileRoomVivariumPhoto, deleteReptileRoomVivariumPhoto } from "../services/reptileRoomPhotoService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { CameraDirectionPad } from "../components/reptile-room-3d/ReptileRoomPOVViewer";
import { RoomAssetInspector } from "../components/reptile-room-3d/RoomAssetInspector";
import { RoomAssetLibraryPanel } from "../components/reptile-room-3d/RoomAssetLibraryPanel";
import RoomBlueprintPanel from "../components/reptile-room-3d/RoomBlueprintPanel";
import type { Room3DAssetPreset, Room3DSelection, Room3DTransformPatch } from "../types/reptileRoom3D";
import type { Snake } from "../types/Snake";
import "../styles/stable-reptile-room-builder.css";

const DEFAULT_VIVARIUM = { width: 90, depth: 45, height: 45 };
const toNumber = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const idFor = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

type RotatableSlot = ReptileRoomSlot & { rotation?: number };
const slotRotation = (slot: ReptileRoomSlot) => (slot as RotatableSlot).rotation ?? 0;

function makeSlot(room: ReptileRoomWorkspace, preset: Room3DAssetPreset, snake?: Snake): ReptileRoomSlot {
  return {
    id: idFor("viv"), snakeId: snake?.id ?? null,
    label: snake ? `${snake.name}'s Vivarium` : preset.label || "Empty Vivarium",
    x: Math.max(0, Math.min((room.width ?? preset.width) - preset.width, (room.width ?? preset.width) / 2 - preset.width / 2)),
    y: Math.max(0, Math.min((room.depth ?? preset.depth) - preset.depth, (room.depth ?? preset.depth) / 2 - preset.depth / 2)),
    z: 0, w: preset.width, h: preset.depth, depth: preset.depth, height: preset.height,
    lifecycleStatus: snake ? "occupied" : "empty", condition: "good",
    availability: snake ? "occupied" : "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", photoUrl: "",
    stackGroupId: null, stackIndex: 0, parentSlotId: null, assetId: preset.assetId, intelligenceRole: preset.intelligenceRole,
    config: { ...(preset.config ?? {}) },
  };
}

function makeObject(room: ReptileRoomWorkspace, preset: Room3DAssetPreset, linkedSlot?: ReptileRoomSlot | null): ReptileRoomObject {
  const config = {
    ...(preset.config ?? {}),
    ...(linkedSlot && preset.intelligenceRole && preset.intelligenceRole !== "enclosure"
      ? { linkedSlotId: linkedSlot.id, linkedSnakeId: linkedSlot.snakeId }
      : {}),
  };
  return {
    id: idFor("asset"), kind: preset.kind as ReptileRoomObject["kind"], label: preset.label,
    x: Math.max(0, Math.min((room.width ?? preset.width) - preset.width, (room.width ?? preset.width) / 2 - preset.width / 2)),
    y: Math.max(0, Math.min((room.depth ?? preset.depth) - preset.depth, (room.depth ?? preset.depth) / 2 - preset.depth / 2)),
    z: 0, width: Math.max(1, preset.width), depth: Math.max(1, preset.depth), height: Math.max(1, preset.height), rotation: 0,
    wall: null, stackGroupId: linkedSlot ? "viv-group-" + linkedSlot.id : null, stackIndex: 0, parentAssetId: linkedSlot?.id ?? null, clearance: {}, notes: "",
    assetType: preset.assetType ?? "equipment", assetId: preset.assetId, intelligenceRole: preset.intelligenceRole, config,
  };
}

export default function StableReptileRoomBuilder() {
  const { user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<Room3DSelection>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"library" | "inspector" | "blueprint" | null>(null);
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
      setRooms(nextRooms); setSnakes(nextSnakes);
      if (nextRooms.length) setRoomId((current) => nextRooms.some((item) => item.id === current) ? current : nextRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);

  const replaceRoom = useCallback((next: ReptileRoomWorkspace, message?: string) => {
    setRooms((current) => current.map((item) => item.id === next.id ? next : item));
    if (message) setNotice(message);
  }, []);

  const saveRoom = useCallback(async () => {
    if (!user || !room) return;
    setSaving(true);
    try { await saveReptileRooms(user.uid, [{ ...room, roomVersion: 4, updatedAt: new Date().toISOString() }]); setNotice("Room saved to cloud."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Room save failed."); }
    finally { setSaving(false); }
  }, [room, user]);

  const updateSelected = useCallback((patch: Room3DTransformPatch) => {
    if (!room || !selected) return;
    if (selected.type === "object") {
      replaceRoom({ ...room, objects: objects.map((item) => item.id === selected.id ? { ...item, ...patch } : item) });
      return;
    }
    const current = selectedSlot;
    if (!current) return;
    const nextSlot = { ...current, ...patch } as ReptileRoomSlot;
    const dx = nextSlot.x - current.x;
    const dy = nextSlot.y - current.y;
    const dz = (nextSlot.z ?? 0) - (current.z ?? 0);
    const groupId = current.stackGroupId;
    const attachedIds = new Set(objects.filter((object) => object.parentAssetId === current.id || object.config?.linkedSlotId === current.id).map((object) => object.id));
    const groupedSlotIds = groupId ? new Set(slots.filter((slot) => slot.stackGroupId === groupId).map((slot) => slot.id)) : new Set<string>();
    const movedSlots = slots.map((slot) => {
      if (slot.id === current.id) return nextSlot;
      if (dx === 0 && dy === 0 && dz === 0) return slot;
      if (!groupedSlotIds.has(slot.id)) return slot;
      return {
        ...slot,
        x: Math.max(0, Math.min((room.width ?? 0) - slot.w, slot.x + dx)),
        y: Math.max(0, Math.min((room.depth ?? 0) - (slot.depth ?? slot.h), slot.y + dy)),
        z: Math.max(0, Math.min((room.height ?? 0) - (slot.height ?? 1), (slot.z ?? 0) + dz)),
      };
    });
    const movedObjects = objects.map((object) => {
      if (!attachedIds.has(object.id) || (dx === 0 && dy === 0 && dz === 0)) return object;
      return {
        ...object,
        x: Math.max(0, Math.min((room.width ?? 0) - object.width, object.x + dx)),
        y: Math.max(0, Math.min((room.depth ?? 0) - object.depth, object.y + dy)),
        z: Math.max(0, Math.min((room.height ?? 0) - object.height, object.z + dz)),
      };
    });
    replaceRoom({ ...room, slots: movedSlots, objects: movedObjects });
  }, [objects, replaceRoom, room, selected, selectedSlot, slots]);

  const updateRoom = useCallback((patch: Partial<ReptileRoomWorkspace>) => { if (room) replaceRoom({ ...room, ...patch }); }, [replaceRoom, room]);

  const addAsset = useCallback((preset: Room3DAssetPreset) => {
    if (!room) return;
    if (preset.kind === "vivarium") { const slot = makeSlot(room, preset); replaceRoom({ ...room, slots: [...slots, slot] }, `${preset.label} added.`); setSelected({ type: "slot", id: slot.id }); }
    else { const object = makeObject(room, preset, selectedSlot); replaceRoom({ ...room, objects: [...objects, object] }, selectedSlot && preset.intelligenceRole && preset.intelligenceRole !== "enclosure" ? `${preset.label} linked to ${selectedSlot.label}.` : `${preset.label} added.`); setSelected({ type: "object", id: object.id }); }
    setMobilePanel(null);
  }, [objects, replaceRoom, room, slots]);

  const openVivariumBuilder = useCallback((slotId: string) => {
    navigate(`/reptile-room/vivarium/${encodeURIComponent(slotId)}/3d`);
  }, [navigate]);

  const addSnakeVivarium = useCallback((snake: Snake) => {
    if (!room) return;
    const existing = slots.find((slot) => slot.snakeId === snake.id);
    if (existing) { setSelected({ type: "slot", id: existing.id }); setInspectorTab("occupant"); setMobilePanel("inspector"); return; }
    const slot = makeSlot(room, { kind: "vivarium", label: "Vivarium", width: DEFAULT_VIVARIUM.width, depth: DEFAULT_VIVARIUM.depth, height: DEFAULT_VIVARIUM.height }, snake);
    replaceRoom({ ...room, slots: [...slots, slot] }, `${snake.name}'s vivarium added.`); setSelected({ type: "slot", id: slot.id }); setInspectorTab("occupant"); setMobilePanel("inspector");
  }, [replaceRoom, room, slots]);

  const moveSelectedBy = useCallback((dx: number, dy: number, dz: number, label: string) => {
    if (!room || !selected) return;
    replaceRoom(selected.type === "slot"
      ? {
          ...room,
          slots: slots.map((slot) => slot.id === selected.id
            ? {
                ...slot,
                x: Math.max(0, Math.min((room.width ?? 0) - Math.max(1, slot.w), slot.x + dx)),
                y: Math.max(0, Math.min((room.depth ?? 0) - Math.max(1, slot.depth ?? slot.h), slot.y + dy)),
                z: Math.max(0, Math.min((room.height ?? 0) - Math.max(1, slot.height ?? 1), (slot.z ?? 0) + dz)),
              }
            : slot),
        }
      : {
          ...room,
          objects: objects.map((object) => object.id === selected.id
            ? {
                ...object,
                x: Math.max(0, Math.min((room.width ?? 0) - object.width, object.x + dx)),
                y: Math.max(0, Math.min((room.depth ?? 0) - object.depth, object.y + dy)),
                z: Math.max(0, Math.min((room.height ?? 0) - object.height, object.z + dz)),
              }
            : object),
        });
    setNotice(`${label} 5 cm.`);
  }, [objects, replaceRoom, room, selected, slots]);

  const snapSelected = useCallback(() => {
    if (!room || !selected) return;
    replaceRoom(selected.type === "slot"
      ? { ...room, slots: slots.map((slot) => slot.id === selected.id ? { ...slot, x: Math.round(slot.x / 5) * 5, y: Math.round(slot.y / 5) * 5, z: Math.round((slot.z ?? 0) / 5) * 5 } : slot) }
      : { ...room, objects: objects.map((object) => object.id === selected.id ? { ...object, x: Math.round(object.x / 5) * 5, y: Math.round(object.y / 5) * 5, z: Math.round(object.z / 5) * 5 } : object) },
    );
    setNotice("Snapped to 5 cm grid.");
  }, [objects, replaceRoom, room, selected, slots]);

  const snapToWall = useCallback(() => {
    if (!room || !selected) return;
    const nearestWall = (x: number, y: number, width: number, depth: number, rotation: number) => {
      const quarterTurn = Math.round((((rotation % 360) + 360) % 360) / 90) % 2;
      const w = quarterTurn ? depth : width;
      const d = quarterTurn ? width : depth;
      return [
        { distance: x, x: 0, y },
        { distance: Math.max(0, (room.width ?? 0) - x - w), x: Math.max(0, (room.width ?? 0) - w), y },
        { distance: y, x, y: 0 },
        { distance: Math.max(0, (room.depth ?? 0) - y - d), x, y: Math.max(0, (room.depth ?? 0) - d) },
      ].sort((a, b) => a.distance - b.distance)[0];
    };
    if (selected.type === "slot" && selectedSlot) {
      const target = nearestWall(selectedSlot.x, selectedSlot.y, selectedSlot.w, selectedSlot.depth ?? selectedSlot.h, slotRotation(selectedSlot));
      replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selected.id ? { ...slot, x: Math.round(target.x / 5) * 5, y: Math.round(target.y / 5) * 5 } : slot) });
    } else if (selectedObject) {
      const target = nearestWall(selectedObject.x, selectedObject.y, selectedObject.width, selectedObject.depth, selectedObject.rotation);
      replaceRoom({ ...room, objects: objects.map((object) => object.id === selected.id ? { ...object, x: Math.round(target.x / 5) * 5, y: Math.round(target.y / 5) * 5 } : object) });
    }
    setNotice("Snapped to nearest wall.");
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots]);

  const stackSnapSelected = useCallback(() => {
    if (!room || !selectedSlot) {
      setNotice("Select a vivarium to use shelf snap.");
      return;
    }
    const shelves = objects.filter((object) => object.kind === "shelving" || object.kind === "rack");
    if (!shelves.length) {
      setNotice("Add a Shelving or Reptile Rack asset first.");
      return;
    }
    const options = shelves.flatMap((shelf) =>
      [0.08, 0.31, 0.54, 0.77, 0.96].map((ratio) => {
        const level = shelf.z + shelf.height * ratio;
        if (level + (selectedSlot.height ?? 30) > (room.height ?? 0) + 0.01) return null;
        const x = Math.max(0, Math.min((room.width ?? 0) - selectedSlot.w, Math.round((shelf.x + (shelf.width - selectedSlot.w) / 2) / 5) * 5));
        const y = Math.max(0, Math.min((room.depth ?? 0) - (selectedSlot.depth ?? selectedSlot.h), Math.round((shelf.y + (shelf.depth - (selectedSlot.depth ?? selectedSlot.h)) / 2) / 5) * 5));
        return { shelf, level, x, y, distance: Math.hypot(x - selectedSlot.x, y - selectedSlot.y) + Math.abs(level - (selectedSlot.z ?? 0)) };
      }),
    ).filter((item): item is { shelf: ReptileRoomObject; level: number; x: number; y: number; distance: number } => item !== null)
      .sort((a, b) => a.distance - b.distance)[0];
    if (!options) {
      setNotice("No shelf level has enough vertical clearance for this vivarium.");
      return;
    }
    replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selectedSlot.id ? ({ ...slot, x: options.x, y: options.y, z: options.level, parentAssetId: options.shelf.id } as ReptileRoomSlot) : slot) });
    setNotice(`Vivarium snapped to ${options.shelf.label}.`);
  }, [objects, replaceRoom, room, selectedSlot, slots]);

  const magnetLockSelected = useCallback(() => {
    if (!room || !selectedSlot) {
      setNotice("Select a vivarium to use magnet lock.");
      return;
    }
    const candidates = slots.filter((slot) => slot.id !== selectedSlot.id);
    if (!candidates.length) {
      setNotice("Add another vivarium before using magnet lock.");
      return;
    }
    const nearest = candidates.reduce((best, slot) =>
      Math.hypot(slot.x - selectedSlot.x, slot.y - selectedSlot.y) + Math.abs((slot.z ?? 0) - (selectedSlot.z ?? 0)) * 0.5 <
      Math.hypot(best.x - selectedSlot.x, best.y - selectedSlot.y) + Math.abs((best.z ?? 0) - (selectedSlot.z ?? 0)) * 0.5 ? slot : best,
      candidates[0],
    );
    const groupIds = new Set([selectedSlot.stackGroupId, nearest.stackGroupId].filter((id): id is string => Boolean(id)));
    const groupId = groupIds.values().next().value ?? idFor("mag");
    replaceRoom({
      ...room,
      slots: slots.map((slot) =>
        groupIds.has(slot.stackGroupId ?? "") || slot.id === selectedSlot.id || slot.id === nearest.id
          ? { ...slot, stackGroupId: groupId }
          : slot),
    });
    setNotice(`${selectedSlot.label} magnet-locked to ${nearest.label}.`);
  }, [replaceRoom, room, selectedSlot, slots]);

  const unlockMagnet = useCallback(() => {
    if (!selectedSlot?.stackGroupId) {
      setNotice("This vivarium is not magnet-locked.");
      return;
    }
    const group = selectedSlot.stackGroupId;
    replaceRoom({ ...room!, slots: slots.map((slot) => slot.stackGroupId === group ? { ...slot, stackGroupId: null, stackIndex: 0 } : slot) });
    setNotice("Vivarium magnet lock released.");
  }, [replaceRoom, room, selectedSlot, slots]);

  const unstackSelected = useCallback(() => {
    if (!selectedSlot || !slotParentAssetId(selectedSlot)) {
      setNotice("This vivarium is not attached to shelving or a rack.");
      return;
    }
    replaceRoom({ ...room!, slots: slots.map((slot) => slot.id === selectedSlot.id ? ({ ...slot, parentAssetId: null, stackIndex: 0 } as RotatableSlot) : slot) });
    setNotice("Vivarium removed from shelving lock.");
  }, [replaceRoom, room, selectedSlot, slots]);

  const deleteSelected = useCallback(() => {
    if (!room || !selected) return;
    if (selected.type === "slot" && selectedSlot?.stackGroupId) {
      const group = selectedSlot.stackGroupId;
      replaceRoom({
        ...room,
        slots: slots.filter((slot) => slot.stackGroupId !== group),
        objects: objects.filter((object) => object.parentAssetId !== selected.id && object.config?.linkedSlotId !== selected.id),
      }, "Magnet-locked vivarium group removed.");
    } else if (selected.type === "slot") {
      replaceRoom({
        ...room,
        slots: slots.filter((slot) => slot.id !== selected.id),
        objects: objects.filter((object) => object.parentAssetId !== selected.id && object.config?.linkedSlotId !== selected.id),
      }, "Vivarium removed.");
    } else {
      replaceRoom({
        ...room,
        objects: objects.filter((item) => item.id !== selected.id),
        slots: slots.map((slot) => slot.parentSlotId === selected.id ? ({ ...slot, parentSlotId: null }) : slot),
      }, "Room asset removed.");
    }
    setSelected(null); setMobilePanel(null);
  }, [objects, replaceRoom, room, selected, selectedSlot, slots]);

  const duplicateSelected = useCallback(() => {
    if (!room || !selected) return;
    if (selected.type === "slot" && selectedSlot) {
      const copy: ReptileRoomSlot = {
        ...selectedSlot,
        id: idFor("viv"),
        label: `${selectedSlot.label} Copy`,
        x: Math.max(0, Math.min((room.width ?? 0) - selectedSlot.w, selectedSlot.x + 10)),
        stackGroupId: null,
        stackIndex: 0,
        parentSlotId: null,
      };
      replaceRoom({ ...room, slots: [...slots, copy] }, "Vivarium duplicated.");
      setSelected({ type: "slot", id: copy.id });
      return;
    }
    if (selectedObject) {
      const copy: ReptileRoomObject = {
        ...selectedObject,
        id: idFor("asset"),
        label: `${selectedObject.label} Copy`,
        x: Math.max(0, Math.min((room.width ?? 0) - selectedObject.width, selectedObject.x + 10)),
        y: Math.max(0, Math.min((room.depth ?? 0) - selectedObject.depth, selectedObject.y + 10)),
        stackGroupId: null,
        parentAssetId: null,
        config: { ...(selectedObject.config ?? {}) },
      };
      replaceRoom({ ...room, objects: [...objects, copy] }, "Asset duplicated.");
      setSelected({ type: "object", id: copy.id });
    }
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots]);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!user || !room || !selected) return;
    setPhotoBusy(true);
    try {
      if (selected.type === "slot" && selectedSlot) {
        const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file);
        replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) }, "Vivarium photo saved.");
      } else if (selected.type === "object" && selectedObject) {
        const url = await uploadReptileRoomAssetPhoto(user.uid, room.id, selectedObject.id, file);
        replaceRoom({ ...room, objects: objects.map((item) => item.id === selectedObject.id ? { ...item, config: { ...(item.config ?? {}), photoUrl: url } as ReptileRoomAssetConfig } : item) }, "Asset photo saved.");
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Photo upload failed."); }
    finally { setPhotoBusy(false); }
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots, user]);

  const removePhoto = useCallback(async () => {
    if (!user || !room || !selected) return;
    setPhotoBusy(true);
    try {
      if (selected.type === "slot" && selectedSlot) {
        await deleteReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id);
        replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: "" } : slot) }, "Vivarium photo removed.");
      } else if (selected.type === "object" && selectedObject) {
        await deleteReptileRoomAssetPhoto(user.uid, room.id, selectedObject.id);
        replaceRoom({ ...room, objects: objects.map((item) => item.id === selectedObject.id ? { ...item, config: { ...(item.config ?? {}), photoUrl: undefined } as ReptileRoomAssetConfig } : item) }, "Asset photo removed.");
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Photo removal failed."); }
    finally { setPhotoBusy(false); }
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots, user]);

  if (loading || profileLoading) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Loading your reptile room…</div></main>;
  if (!user) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Please sign in to use the Reptile Room.</div></main>;
  if (!room) return <main className="stable-rr3d"><div className="stable-rr3d-loading">Creating your reptile room…</div></main>;

  return <main className="stable-rr3d">
    <header className="stable-rr3d-header"><div><span className="stable-rr3d-kicker">TINY TITANS · 3D DIGITAL TWIN</span><h1>{room.name}</h1><p>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm · {slots.length} vivariums · {objects.length} assets</p></div><div className="stable-rr3d-header-actions"><span>{saving ? "Saving…" : "✓ Saved"}</span><button type="button" onClick={() => navigate("/reptile-room/first-person")}>Explore first-person</button><button type="button" onClick={() => setMobilePanel("blueprint")}>Room Blueprint</button><button type="button" onClick={() => void saveRoom()} disabled={saving}>Save Room</button></div></header>
    {notice && <div className="stable-rr3d-notice" role="status">{notice}</div>}
    <section className="stable-rr3d-layout">
      <aside className="stable-rr3d-sidebar stable-rr3d-desktop-library"><RoomBlueprintPanel room={room} onRoomChange={replaceRoom} /><section className="stable-rr3d-snake-list"><div className="stable-rr3d-section-head"><h2>Your Snakes</h2><span>{snakes.length}</span></div>{snakes.map((snake) => <button key={snake.id} type="button" onClick={() => addSnakeVivarium(snake)}>🐍 {snake.name}<small>Add/select vivarium</small></button>)}</section><RoomAssetLibraryPanel onAddAsset={addAsset} /><section className="stable-rr3d-view-controls"><h2>View</h2><div><button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide grid" : "Show grid"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div></section></aside>
      <section className="stable-rr3d-viewport"><Room3D room={room} objects={objects} slots={slots} selectedId={selected?.id ?? null} selectedType={selected?.type ?? null} showGrid={showGrid} showCeiling={showCeiling} onSelect={(selection) => { setSelected(selection); if (selection) setMobilePanel("inspector"); }} onTransformChange={updateSelected} onRoomChange={updateRoom} onSave={saveRoom} /><CameraDirectionPad room={room} className="stable-rr3d-camera-pad" /><div className="stable-rr3d-viewport-actions"><button type="button" onClick={() => setMobilePanel("library")}>Keeper Toolkit</button><button type="button" onClick={() => setMobilePanel("blueprint")}>Room Blueprint</button><button type="button" onClick={() => navigate("/reptile-room/first-person")}>Explore</button>{selected && <button type="button" onClick={() => setMobilePanel("inspector")}>Edit selected</button>}</div></section>
      <aside className="stable-rr3d-inspector stable-rr3d-desktop-inspector"><Inspector selectedObject={selectedObject} selectedSlot={selectedSlot} onOpenVivariumBuilder={openVivariumBuilder} slots={slots} snakes={snakes} snakesById={snakesById} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} updateSelected={updateSelected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} moveSelectedBy={moveSelectedBy} snapSelected={snapSelected} snapToWall={snapToWall} stackSnapSelected={stackSnapSelected} magnetLockSelected={magnetLockSelected} unlockMagnet={unlockMagnet} unstackSelected={unstackSelected} uploadPhoto={uploadPhoto} removePhoto={removePhoto} photoBusy={photoBusy} /></aside>
    </section>
    {mobilePanel && <div className="stable-rr3d-mobile-sheet" role="dialog" aria-modal="true" aria-label={mobilePanel === "library" ? "Keeper Toolkit" : mobilePanel === "blueprint" ? "Room Blueprint" : "Asset inspector"}><div className="stable-rr3d-mobile-sheet-backdrop" onClick={() => setMobilePanel(null)} /><div className="stable-rr3d-mobile-sheet-panel"><div className="stable-rr3d-mobile-sheet-head"><strong>{mobilePanel === "library" ? "Keeper Toolkit" : mobilePanel === "blueprint" ? "Room Blueprint" : "Inspector"}</strong><button type="button" onClick={() => setMobilePanel(null)} aria-label="Close">×</button></div>{mobilePanel === "library" ? <RoomAssetLibraryPanel onAddAsset={addAsset} /> : mobilePanel === "blueprint" ? <RoomBlueprintPanel room={room} onRoomChange={replaceRoom} /> : <Inspector selectedObject={selectedObject} selectedSlot={selectedSlot} onOpenVivariumBuilder={openVivariumBuilder} slots={slots} snakes={snakes} snakesById={snakesById} inspectorTab={inspectorTab} setInspectorTab={setInspectorTab} updateSelected={updateSelected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} moveSelectedBy={moveSelectedBy} snapSelected={snapSelected} snapToWall={snapToWall} stackSnapSelected={stackSnapSelected} magnetLockSelected={magnetLockSelected} unlockMagnet={unlockMagnet} unstackSelected={unstackSelected} uploadPhoto={uploadPhoto} removePhoto={removePhoto} photoBusy={photoBusy} />}</div></div>}
  </main>;
}

type InspectorProps = {
  selectedObject: ReptileRoomObject | null;
  selectedSlot: ReptileRoomSlot | null;
  onOpenVivariumBuilder: (slotId: string) => void;
  slots: ReptileRoomSlot[];
  snakes: Snake[];
  snakesById: Map<string, Snake>;
  inspectorTab: "edit" | "occupant";
  setInspectorTab: (value: "edit" | "occupant") => void;
  updateSelected: (patch: Room3DTransformPatch) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  moveSelectedBy: (dx: number, dy: number, dz: number, label: string) => void;
  snapSelected: () => void;
  snapToWall: () => void;
  stackSnapSelected: () => void;
  magnetLockSelected: () => void;
  unlockMagnet: () => void;
  unstackSelected: () => void;
  uploadPhoto: (file: File) => Promise<void>;
  removePhoto: () => Promise<void>;
  photoBusy: boolean;
};

function Inspector(props: InspectorProps) {
  const { selectedObject, selectedSlot } = props;
  const entity = selectedObject ?? selectedSlot;
  if (!entity) return <div className="stable-rr3d-inspector-empty"><span>INSPECTOR</span><h2>Select an asset</h2><p>Choose a vivarium or Keeper Toolkit asset to edit its dimensions, placement, rotation and intelligent configuration.</p></div>;
  const width = selectedObject ? selectedObject.width : selectedSlot?.w ?? 1;
  const depth = selectedObject ? selectedObject.depth : selectedSlot?.depth ?? selectedSlot?.h ?? 1;
  const height = selectedObject ? selectedObject.height : selectedSlot?.height ?? 1;
  const rotation = selectedObject ? selectedObject.rotation : slotRotation(selectedSlot!);
  const photoUrl = selectedObject?.config?.photoUrl ?? selectedSlot?.photoUrl ?? "";
  return <div className="stable-rr3d-inspector-content">
    <div className="stable-rr3d-inspector-title"><div><span>SELECTED</span><h2>{entity.label}</h2></div><button type="button" onClick={props.deleteSelected}>Delete</button></div>
    {selectedSlot && <label className="stable-rr3d-smart-field"><span>Vivarium name</span><input type="text" value={selectedSlot.label} onChange={(event) => props.updateSelected({ label: event.target.value })} placeholder="Vivarium name" /></label>}
    <div className="stable-rr3d-editor-grid">{(["width", "depth", "height"] as const).map((field) => <label key={field}>{field[0].toUpperCase() + field.slice(1)} cm<input type="number" min="1" value={field === "width" ? width : field === "depth" ? depth : height} onChange={(event) => props.updateSelected(field === "width" ? { width: Math.max(1, toNumber(event.target.value, 1)) } : field === "depth" ? { depth: Math.max(1, toNumber(event.target.value, 1)) } : { height: Math.max(1, toNumber(event.target.value, 1)) })} /></label>)}</div>
    <div className="stable-rr3d-editor-grid"><label>X cm<input type="number" value={Math.round(entity.x)} onChange={(event) => props.updateSelected({ x: Math.max(0, toNumber(event.target.value)) })} /></label><label>Y cm<input type="number" value={Math.round(entity.y)} onChange={(event) => props.updateSelected({ y: Math.max(0, toNumber(event.target.value)) })} /></label><label>Z cm<input type="number" value={Math.round(entity.z ?? 0)} onChange={(event) => props.updateSelected({ z: Math.max(0, toNumber(event.target.value)) })} /></label></div>
    <div className="stable-rr3d-placement-controls">
      <div className="stable-rr3d-placement-title">Placement</div>
      <div className="stable-rr3d-placement-grid">
        <button type="button" onClick={() => props.moveSelectedBy(0, 0, 5, "Moved up")} aria-label="Move selected up 5 cm">↑</button>
        <button type="button" onClick={() => props.moveSelectedBy(0, -5, 0, "Moved forward")} aria-label="Move selected forward 5 cm">↟</button>
        <button type="button" onClick={() => props.moveSelectedBy(-5, 0, 0, "Moved left")} aria-label="Move selected left 5 cm">←</button>
        <button type="button" onClick={() => props.moveSelectedBy(5, 0, 0, "Moved right")} aria-label="Move selected right 5 cm">→</button>
        <button type="button" onClick={() => props.moveSelectedBy(0, 5, 0, "Moved backward")} aria-label="Move selected backward 5 cm">↡</button>
        <button type="button" onClick={() => props.moveSelectedBy(0, 0, -5, "Moved down")} aria-label="Move selected down 5 cm">↓</button>
      </div>
      <div className="stable-rr3d-placement-actions">
        <button type="button" onClick={props.snapSelected}>⌖ Snap 5 cm</button>
        <button type="button" onClick={props.snapToWall}>🧲 Snap to wall</button>
        {(props.selectedObject || props.selectedSlot) && <button type="button" onClick={props.duplicateSelected}>Duplicate</button>}
      </div>
      {props.selectedSlot && (
        <div className="stable-rr3d-placement-actions">
          <button type="button" onClick={props.stackSnapSelected}>Stack to rack/shelf</button>
          <button type="button" onClick={props.magnetLockSelected}>Magnet-lock nearest</button>
          {props.selectedSlot.stackGroupId && <button type="button" onClick={props.unlockMagnet}>Unlock magnet</button>}
          {slotParentAssetId(props.selectedSlot) && <button type="button" onClick={props.unstackSelected}>Unstack vivarium</button>}
        </div>
      )}
    </div>
    <div className="stable-rr3d-rotation"><span>Rotation</span><button type="button" onClick={() => props.updateSelected({ rotation: rotation - 15 })}>↶</button><strong>{Math.round(rotation)}°</strong><button type="button" onClick={() => props.updateSelected({ rotation: rotation + 15 })}>↷</button><button type="button" onClick={() => props.updateSelected({ rotation: 0 })}>Reset</button></div>
    
    {selectedSlot && <button type="button" className="stable-rr3d-vivarium-builder-button" onClick={() => props.onOpenVivariumBuilder(selectedSlot.id)}>Open dedicated 3D vivarium builder</button>}
    {selectedSlot && <div className="stable-rr3d-tabs"><button type="button" aria-pressed={props.inspectorTab === "edit"} onClick={() => props.setInspectorTab("edit")}>Position</button><button type="button" aria-pressed={props.inspectorTab === "occupant"} onClick={() => props.setInspectorTab("occupant")}>Occupant</button>{props.inspectorTab === "occupant" && <label className="stable-rr3d-smart-field">Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => { const snakeId = event.target.value || null; const snake = snakeId ? props.snakesById.get(snakeId) : undefined; props.updateSelected({ snakeId, label: snake ? `${snake.name}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snake ? "occupied" : "empty", availability: snake ? "occupied" : "available" }); }}>{<option value="">Empty vivarium</option>}{props.snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>}</div>}
    <div className="stable-rr3d-photo"><div><strong>Reference photo</strong><small>Choose from your device gallery. The image is stored with this asset.</small></div>{photoUrl && <img src={photoUrl} alt={`${entity.label} reference`} />}{photoUrl && <button type="button" className="stable-rr3d-photo-remove" onClick={() => void props.removePhoto()} disabled={props.photoBusy}>Remove photo</button>}<label className="stable-rr3d-photo-button">{props.photoBusy ? "Working…" : photoUrl ? "Replace photo" : "Choose photo"}<input type="file" accept="image/*" disabled={props.photoBusy} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void props.uploadPhoto(file); }} /></label></div>
    {selectedObject && <RoomAssetInspector object={selectedObject} slots={props.slots} onPatch={(patch) => props.updateSelected({ ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.config ? { config: patch.config } : {}) })} />}
  </div>;
}
