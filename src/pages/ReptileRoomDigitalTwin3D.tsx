import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomObject, type ReptileRoomWorkspace, type ReptileRoomSlot } from "../services/reptileRoomService";
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

function makePlacedObject(kind: ReptileRoomObject["kind"], label: string, width: number, depth: number, height: number, x: number, y: number, assetType: ReptileRoomObject["assetType"] = "furniture"): ReptileRoomObject {
  return { id: createId("room-object"), kind, label, x, y, z: 0, width, depth, height, rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null, clearance: {}, notes: "", assetType };
}

function makeVivarium(width: number, depth: number, height: number, x: number, y: number): ReptileRoomSlot {
  return { id: createId("viv"), snakeId: null, label: "Empty Vivarium", x, y, z: 0, w: width, h: depth, depth, height, lifecycleStatus: "empty", condition: "good", availability: "available", storageLocation: "", storageNote: "", notes: "", maintenanceNote: "", stackGroupId: null, stackIndex: 0, parentSlotId: null, photoUrl: "" };
}

function itemFromObject(item: ReptileRoomObject): RoomItem {
  return { type: "object", id: item.id, x: item.x, y: item.y, z: item.z ?? 0, width: item.width, depth: item.depth, height: item.height, stackGroupId: item.stackGroupId ?? null };
}

function itemFromSlot(item: ReptileRoomSlot): RoomItem {
  return { type: "slot", id: item.id, x: item.x, y: item.y, z: item.z ?? 0, width: item.w, depth: item.depth ?? item.w, height: item.height ?? item.h, stackGroupId: item.stackGroupId ?? null };
}

function isFloorOnlyObject(item: ReptileRoomObject | undefined): boolean {
  return item?.kind === "table" || item?.kind === "workbench";
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
  }, [room?.id]);

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
    const y = clamp(snapNumber(point.yCm - preset.depth / 2), 0, Math.max(0, roomDepth - preset.depth));
    if (preset.kind === "vivarium") {
      const slot = makeVivarium(preset.width, preset.depth, preset.height, x, y);
      void persistState([...localObjects], [...localSlots, slot], "Vivarium added.");
      setSelectedId(slot.id);
      setSelectedType("slot");
      return;
    }
    addObject(makePlacedObject(preset.kind as ReptileRoomObject["kind"], preset.label, preset.width, preset.depth, preset.height, x, y, "furniture"));
  }, [room, localObjects, localSlots, persistState, addObject]);

  const allItems = useCallback((): RoomItem[] => [
    ...localObjects.map(itemFromObject),
    ...localSlots.map(itemFromSlot),
  ], [localObjects, localSlots]);

  const getSelectedItem = useCallback((): RoomItem | null => {
    if (!selectedId || !selectedType) return null;
    if (selectedType === "object") {
      const item = localObjects.find((entry) => entry.id === selectedId);
      return item ? itemFromObject(item) : null;
    }
    const item = localSlots.find((entry) => entry.id === selectedId);
    return item ? itemFromSlot(item) : null;
  }, [localObjects, localSlots, selectedId, selectedType]);

  const moveSelected = useCallback((selection: { type: "slot" | "object"; id: string }, dx: number, dy: number, dz: number, commit: boolean) => {
    if (!room) return;
    const all = allItems();
    const selected = all.find((item) => item.type === selection.type && item.id === selection.id);
    if (!selected) return;
    const groupId = selected.stackGroupId;
    const movingIds = new Set((groupId ? all.filter((item) => item.stackGroupId === groupId) : [selected]).map((item) => `${item.type}:${item.id}`));
    const groupHasFloorOnly = all.some((item) => movingIds.has(`${item.type}:${item.id}`) && item.type === "object" && isFloorOnlyObject(localObjects.find((object) => object.id === item.id)));
    const verticalDelta = groupHasFloorOnly ? 0 : dz;
    const roomWidth = room.width ?? 0;
    const roomDepth = room.depth ?? 0;
    const roomHeight = room.height ?? 0;
    const nextObjects = localObjects.map((object) => {
      if (!movingIds.has(`object:${object.id}`)) return object;
      const item = itemFromObject(object);
      const moved = { ...object, x: clamp(item.x + dx, 0, Math.max(0, roomWidth - item.width)), y: clamp(item.y + dy, 0, Math.max(0, roomDepth - item.depth)), z: isFloorOnlyObject(object) ? 0 : clamp(item.z + verticalDelta, 0, Math.max(0, roomHeight - item.height)), wall: null };
      return commit ? snapArchitecturalObject(moved, roomWidth, roomDepth) : moved;
    });
    const nextSlots = localSlots.map((slot) => {
      if (!movingIds.has(`slot:${slot.id}`)) return slot;
      const item = itemFromSlot(slot);
      const moved = { ...slot, x: clamp(item.x + dx, 0, Math.max(0, roomWidth - item.width)), y: clamp(item.y + dy, 0, Math.max(0, roomDepth - item.depth)), z: clamp(item.z + verticalDelta, 0, Math.max(0, roomHeight - item.height)) };
      return commit ? { ...moved, x: snapNumber(moved.x), y: snapNumber(moved.y), z: snapNumber(moved.z) } : moved;
    });
    if (commit) void persistState(nextObjects, nextSlots);
    else {
      setLocalObjects(nextObjects);
      setLocalSlots(nextSlots);
    }
  }, [room, allItems, localObjects, localSlots, persistState]);

  const moveButton = useCallback((dx: number, dy: number, dz: number) => {
    if (selectedId && selectedType) moveSelected({ type: selectedType, id: selectedId }, dx, dy, dz, true);
  }, [moveSelected, selectedId, selectedType]);

  const toggleStackLock = useCallback(() => {
    const selected = getSelectedItem();
    if (!selected) return;
    const all = allItems();
    if (selected.stackGroupId) {
      const nextObjects = localObjects.map((object) => object.id === selected.id && selected.type === "object" ? { ...object, stackGroupId: null, stackIndex: 0, parentAssetId: null } : object);
      const nextSlots = localSlots.map((slot) => slot.id === selected.id && selected.type === "slot" ? { ...slot, stackGroupId: null, stackIndex: 0, parentSlotId: null, parentAssetId: null } : slot);
      void persistState(nextObjects, nextSlots, "Mag-lock released.");
      return;
    }

    const target = all
      .filter((item) => !(item.type === selected.type && item.id === selected.id))
      .map((item) => ({ item, distance: gapBetween(selected, item) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!target || target.distance > MAGNET_GAP_CM) {
      setNotice("Move the item within 10 cm of another vivarium or furniture piece, then use Mag-lock.");
      return;
    }

    const groupId = target.item.stackGroupId ?? createId("stack");
    const mergedGroups = new Set([selected.stackGroupId, target.item.stackGroupId].filter(Boolean));
    const shouldStack = selected.type === "slot" && target.item.type === "object" && isFloorOnlyObject(localObjects.find((object) => object.id === target.item.id));
    const selectedSlot = selected.type === "slot" ? localSlots.find((slot) => slot.id === selected.id) : null;
    const selectedObject = selected.type === "object" ? localObjects.find((object) => object.id === selected.id) : null;
    const targetObject = target.item.type === "object" ? localObjects.find((object) => object.id === target.item.id) : null;
    const targetSlot = target.item.type === "slot" ? localSlots.find((slot) => slot.id === target.item.id) : null;
    const nextZ = shouldStack && targetObject ? target.item.z + targetObject.height : selected.z;

    const inMergedGroup = (item: RoomItem) => item.id === selected.id || item.id === target.item.id || Boolean(item.stackGroupId && mergedGroups.has(item.stackGroupId));
    const nextObjects = localObjects.map((object) => {
      const item = itemFromObject(object);
      if (!inMergedGroup(item)) return object;
      return { ...object, stackGroupId: groupId, stackIndex: item.id === selected.id ? 1 : item.id === target.item.id ? 0 : object.stackIndex };
    });
    const nextSlots = localSlots.map((slot) => {
      const item = itemFromSlot(slot);
      if (!inMergedGroup(item)) return slot;
      if (selectedSlot && item.id === selectedSlot.id) {
        return { ...slot, z: shouldStack ? nextZ : slot.z, stackGroupId: groupId, stackIndex: 1, parentAssetId: shouldStack && targetObject ? targetObject.id : null };
      }
      if (targetSlot && item.id === targetSlot.id) return { ...slot, stackGroupId: groupId, stackIndex: 0 };
      return { ...slot, stackGroupId: groupId };
    });

    void persistState(nextObjects, nextSlots, `Mag-locked ${selectedSlot?.label ?? selectedObject?.label ?? "items"} to ${targetObject?.label ?? targetSlot?.label ?? "nearby item"}.`);
  }, [getSelectedItem, allItems, localObjects, localSlots, persistState]);

  const snapToWall = useCallback(() => {
    if (!room || !selectedId || !selectedType) return;
    const roomWidth = room.width ?? 0;
    const roomDepth = room.depth ?? 0;
    if (selectedType === "object") {
      const nextObjects = localObjects.map((item) => {
        if (item.id !== selectedId) return item;
        const distances = { west: item.x, east: roomWidth - item.x - item.width, north: roomDepth - item.y - item.depth, south: item.y };
        const wall = Object.entries(distances).sort((a, b) => a[1] - b[1])[0]?.[0] as "north" | "east" | "south" | "west";
        const next = wall === "west" ? { ...item, x: 0 } : wall === "east" ? { ...item, x: Math.max(0, roomWidth - item.width) } : wall === "north" ? { ...item, y: Math.max(0, roomDepth - item.depth) } : { ...item, y: 0 };
        return { ...next, wall, x: snapNumber(next.x), y: snapNumber(next.y) };
      });
      void persistState(nextObjects, localSlots, "Object snapped to nearest wall.");
    } else {
      const nextSlots = localSlots.map((item) => {
        if (item.id !== selectedId) return item;
        const width = item.w;
        const depth = item.depth ?? item.w;
        const distances = { west: item.x, east: roomWidth - item.x - width, north: roomDepth - item.y - depth, south: item.y };
        const wall = Object.entries(distances).sort((a, b) => a[1] - b[1])[0]?.[0];
        const next = wall === "west" ? { ...item, x: 0 } : wall === "east" ? { ...item, x: Math.max(0, roomWidth - width) } : wall === "north" ? { ...item, y: Math.max(0, roomDepth - depth) } : { ...item, y: 0 };
        return { ...next, x: snapNumber(next.x), y: snapNumber(next.y) };
      });
      void persistState(localObjects, nextSlots, "Vivarium snapped to nearest wall.");
    }
  }, [room, selectedId, selectedType, localObjects, localSlots, persistState]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const nextObjects = selectedType === "object" ? localObjects.filter((item) => item.id !== selectedId) : localObjects;
    const nextSlots = selectedType === "slot" ? localSlots.filter((item) => item.id !== selectedId) : localSlots;
    void persistState(nextObjects, nextSlots, selectedType === "slot" ? "Vivarium deleted. Snake record was kept." : "Room object deleted.");
    setSelectedId(null);
    setSelectedType(null);
  }, [selectedId, selectedType, localObjects, localSlots, persistState]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId || selectedType !== "object") return;
    const source = localObjects.find((item) => item.id === selectedId);
    if (!source) return;
    const copy = { ...source, id: createId("room-object"), label: `${source.label} - Copy`, x: source.x + 10, y: source.y + 10, stackGroupId: null, stackIndex: 0, parentAssetId: null };
    void persistState([...localObjects, copy], localSlots, "Object duplicated.");
    setSelectedId(copy.id);
    setSelectedType("object");
  }, [localObjects, localSlots, selectedId, selectedType, persistState]);

  const editVivarium = useCallback(() => {
    if (!selectedSnake?.id) {
      setNotice("Assign a snake to this vivarium before editing its enclosure record.");
      return;
    }
    window.location.assign(`/reptile-room/vivarium/${encodeURIComponent(selectedSnake.id)}`);
  }, [selectedSnake]);

  const openSnakeProfile = useCallback((snakeId: string) => window.location.assign(`/snakes/${encodeURIComponent(snakeId)}`), []);
  const quickAction = useCallback((action: string) => {
    if (!selectedSnake) return;
    const snakeId = encodeURIComponent(selectedSnake.id);
    const routes: Record<string, string> = { feed: `/feeding/${snakeId}`, shed: `/shedding/${snakeId}`, weight: `/weights/${snakeId}` };
    if (routes[action]) window.location.assign(routes[action]);
  }, [selectedSnake]);

  if (loading || profileLoading) return <div className="rr3d-loading">Loading your 3D digital twin...</div>;
  if (!room) return <div className="rr3d-loading"><h2>No reptile room yet</h2><p>Build your room in the 2D builder first, then return to the 3D view.</p></div>;

  const controlButton = (label: string, action: () => void, disabled = false) => <button type="button" onClick={action} disabled={disabled} style={{ minWidth: 52, minHeight: 34, padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,.13)", background: disabled ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.07)", color: "inherit", cursor: disabled ? "not-allowed" : "pointer", fontSize: 11 }}>{label}</button>;
  const selectedHasFloorOnly = selectedObject ? isFloorOnlyObject(selectedObject) : false;
  const photoForSlot = (slot: ReptileRoomSlot) => slot.snakeId ? snakesById.get(slot.snakeId)?.enclosure?.roomPhoto?.url : undefined;

  return <main style={{ width: "100%", minHeight: "70vh" }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "16px 0" }}>
      <div><span style={{ opacity: .7, fontSize: 12, letterSpacing: ".08em" }}>TINY TITANS · 3D DIGITAL TWIN</span><h1 style={{ margin: "4px 0" }}>{room.name}</h1><p style={{ margin: 0, opacity: .75 }}>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm</p></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{rooms.length > 1 && <select value={room.id} onChange={(event) => setRoomId(event.target.value)} aria-label="Select reptile room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide measurements" : "Show measurements"}</button><button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button></div>
    </header>
    {notice && <div className="rr3d-notice" role="status">{notice}</div>}
    <section aria-label="Three-dimensional reptile room digital twin" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 12, alignItems: "start" }}>
      <div style={{ width: "100%", height: "min(78vh, 760px)", minHeight: 520, overflow: "hidden", borderRadius: 16 }}><Room3D room={room} showGrid={showGrid} showCeiling={showCeiling} objects={localObjects} slots={localSlots} selectedId={selectedId} selectedType={selectedType} photoForSlot={photoForSlot} onSelect={handleSelect} onMove={moveSelected} onAddAsset={spawnAsset} /></div>
      <aside aria-label="3D object controls" style={{ display: "grid", gap: 10, padding: 14, borderRadius: 14, background: "rgba(18,21,24,.96)", border: "1px solid rgba(255,255,255,.12)", color: "#fff" }}>
        <div><strong>Object controls</strong><div style={{ fontSize: 11, opacity: .6, marginTop: 3 }}>5 cm precision · magnetic placement</div></div>
        {(selectedSlot || selectedObject) ? <>
          <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,.04)" }}><strong>{selectedSlot?.label ?? selectedObject?.label}</strong><div style={{ fontSize: 11, opacity: .65, marginTop: 4 }}>{selectedSlot ? `${selectedSlot.w} × ${selectedSlot.depth ?? selectedSlot.w} × ${selectedSlot.height ?? selectedSlot.h} cm` : `${selectedObject?.width} × ${selectedObject?.depth} × ${selectedObject?.height} cm`}</div></div>
          <div><div style={{ fontSize: 10, opacity: .55, marginBottom: 5 }}>MOVE</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
            {controlButton("Forward", () => moveButton(0, MOVE_STEP_CM, 0))}{controlButton("Back", () => moveButton(0, -MOVE_STEP_CM, 0))}{controlButton("Left", () => moveButton(-MOVE_STEP_CM, 0, 0))}{controlButton("Right", () => moveButton(MOVE_STEP_CM, 0, 0))}{controlButton("Up", () => moveButton(0, 0, MOVE_STEP_CM), selectedHasFloorOnly || Boolean(selectedStackLocked && localObjects.some((item) => item.stackGroupId === (selectedObject?.stackGroupId ?? selectedSlot?.stackGroupId) && isFloorOnlyObject(item))))}{controlButton("Down", () => moveButton(0, 0, -MOVE_STEP_CM), selectedHasFloorOnly || Boolean(selectedStackLocked && localObjects.some((item) => item.stackGroupId === (selectedObject?.stackGroupId ?? selectedSlot?.stackGroupId) && isFloorOnlyObject(item))))}
          </div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {controlButton(selectedStackLocked ? "Unlock mag-lock" : "Mag-lock / Stack", toggleStackLock)}
            {controlButton("Snap to wall", snapToWall)}
          </div>
          {selectedSlot && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {controlButton("Edit Vivarium", editVivarium)}
            {controlButton("Delete Vivarium", deleteSelected)}
          </div>}
          {selectedObject && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>{controlButton("Duplicate", duplicateSelected)}{controlButton("Delete object", deleteSelected)}</div>}
          {selectedSlot && <div style={{ display: "flex", gap: 6 }}><button type="button" onClick={() => setInspectorTab("edit")} aria-pressed={inspectorTab === "edit"}>Edit</button>{selectedSnake && <button type="button" onClick={() => setInspectorTab("occupant")} aria-pressed={inspectorTab === "occupant"}>Occupant</button>}</div>}
          {selectedSlot && inspectorTab === "occupant" && selectedSnake && <div style={{ padding: 9, borderRadius: 9, background: "rgba(255,255,255,.04)" }}><strong>{selectedSnake.name}</strong><button type="button" onClick={() => openSnakeProfile(selectedSnake.id)} style={{ width: "100%", marginTop: 7 }}>Open profile</button><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginTop: 6 }}>{controlButton("Feed", () => quickAction("feed"))}{controlButton("Shed", () => quickAction("shed"))}{controlButton("Weight", () => quickAction("weight"))}</div></div>}
        </> : <div style={{ padding: 10, fontSize: 12, opacity: .65 }}>Select a vivarium or room object. The 3D hit volume is slightly forgiving without covering neighbouring objects.</div>}
      </aside>
    </section>
  </main>;
}
