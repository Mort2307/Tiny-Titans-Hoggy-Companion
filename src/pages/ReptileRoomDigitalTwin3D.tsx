import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import { loadReptileRooms, type ReptileRoomObject, type ReptileRoomWorkspace, type ReptileRoomSlot } from "../services/reptileRoomService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { RoomBuildPanel } from "../components/reptile-room-3d/RoomBuildPanel";
import type { Room3DSelection, Room3DAssetPreset } from "../types/reptileRoom3D";
import { clamp, snapArchitecturalObject, snapNumber, worldSize } from "../services/reptileRoomSpatialService";
import type { Snake } from "../types/Snake";

function createId(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }

function makePlacedObject(kind: ReptileRoomObject["kind"], label: string, width: number, depth: number, height: number, x: number, y: number, assetType: ReptileRoomObject["assetType"] = "furniture"): ReptileRoomObject {
  return { id: createId("room-object"), kind, label, x, y, z: 0, width, depth, height, rotation: 0, wall: null, stackGroupId: null, stackIndex: 0, parentAssetId: null, clearance: {}, notes: "", assetType };
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

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [loadedRooms, loadedSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      setRooms(loadedRooms); setSnakes(loadedSnakes);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load your reptile room."); }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);
  useEffect(() => { setLocalObjects(room?.objects ?? []); setLocalSlots(room?.slots ?? []); setSelectedId(null); setSelectedType(null); }, [room?.id]);

  const handleSelect = useCallback((selection: Room3DSelection) => {
    if (!selection) { setSelectedId(null); setSelectedType(null); return; }
    setSelectedId(selection.id); setSelectedType(selection.type); setInspectorTab("edit");
  }, []);

  const addObject = useCallback((object: ReptileRoomObject) => { setLocalObjects((current) => [...current, object]); setSelectedId(object.id); setSelectedType("object"); }, []);
  const addAssetAtSpawn = useCallback((preset: Room3DAssetPreset, x: number, y: number) => {
    const kind = preset.kind === "vivarium" ? "shelving" : preset.kind;
    addObject(makePlacedObject(kind as ReptileRoomObject["kind"], `${preset.label} · ${preset.width} × ${preset.depth} × ${preset.height} cm`, preset.width, preset.depth, preset.height, x, y, preset.kind === "vivarium" ? "vivarium" : "furniture"));
  }, [addObject]);

  const moveSelected = useCallback((selection: { type: "slot" | "object"; id: string }, dx: number, dy: number, dz: number, commit: boolean) => {
    if (!room) return;
    if (selection.type === "object") {
      setLocalObjects((current) => current.map((object) => {
        if (object.id !== selection.id) return object;
        const size = worldSize(object);
        const moved = { ...object, x: object.x + dx, y: object.y + dy, z: object.z + dz, wall: null };
        const bounded = { ...moved, x: clamp(moved.x, 0, Math.max(0, (room.width ?? 0) - size.w)), y: clamp(moved.y, 0, Math.max(0, (room.depth ?? 0) - size.d)), z: clamp(moved.z, 0, Math.max(0, (room.height ?? 0) - size.h)) };
        return commit ? snapArchitecturalObject(bounded, room.width ?? 0, room.depth ?? 0) : bounded;
      }));
    } else {
      setLocalSlots((current) => current.map((slot) => {
        if (slot.id !== selection.id) return slot;
        const width = slot.w; const depth = slot.depth ?? slot.w; const height = slot.height ?? slot.h;
        const moved = { ...slot, x: clamp(slot.x + dx, 0, Math.max(0, (room.width ?? 0) - width)), y: clamp(slot.y + dy, 0, Math.max(0, (room.depth ?? 0) - depth)), z: clamp(slot.z + dz, 0, Math.max(0, (room.height ?? 0) - height)) };
        if (!commit) return moved;
        return { ...moved, x: snapNumber(moved.x), y: snapNumber(moved.y), z: snapNumber(moved.z) };
      }));
    }
  }, [room]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (selectedType === "slot") setLocalSlots((current) => current.filter((item) => item.id !== selectedId));
    else setLocalObjects((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null); setSelectedType(null);
  }, [selectedId, selectedType]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId || selectedType !== "object") return;
    const source = localObjects.find((item) => item.id === selectedId); if (!source) return;
    const copy: ReptileRoomObject = { ...source, id: createId("room-object"), label: `${source.label} · Copy`, x: source.x + 10, y: source.y + 10 };
    setLocalObjects((current) => [...current, copy]); setSelectedId(copy.id); setSelectedType("object");
  }, [localObjects, selectedId, selectedType]);

  const openSnakeProfile = useCallback((snakeId: string) => { window.location.assign(`/snakes/${encodeURIComponent(snakeId)}`); }, []);
  const quickAction = useCallback((action: string) => {
    if (!selectedSnake) return;
    const snakeId = encodeURIComponent(selectedSnake.id);
    const routes: Record<string, string> = { feed: `/feeding?snake=${snakeId}`, shed: `/shed-tracker?snake=${snakeId}`, weight: `/weight-records?snake=${snakeId}` };
    const target = routes[action]; if (target) window.location.assign(target);
  }, [selectedSnake]);

  if (loading || profileLoading) return <div className="rr3d-loading">Loading your 3D digital twin…</div>;
  if (!room) return <div className="rr3d-loading"><h2>No reptile room yet</h2><p>Build your room in the 2D builder first, then return to the 3D view.</p></div>;

  return (
    <main style={{ width: "100%", minHeight: "70vh" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "16px 0" }}>
        <div><span style={{ opacity: 0.7, fontSize: 12, letterSpacing: "0.08em" }}>🧊 TINY TITANS · 3D DIGITAL TWIN</span><h1 style={{ margin: "4px 0" }}>{room.name}</h1><p style={{ margin: 0, opacity: 0.75 }}>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {rooms.length > 1 && <select value={room.id} onChange={(event) => setRoomId(event.target.value)} aria-label="Select reptile room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
          <button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide measurements" : "Show measurements"}</button>
          <button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button>
        </div>
      </header>
      {notice && <div className="rr3d-notice">{notice}</div>}
      <section aria-label="Three-dimensional reptile room digital twin" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 270px", gap: 12, alignItems: "start" }}>
        <div style={{ width: "100%", height: "min(78vh, 760px)", minHeight: 520, overflow: "hidden", borderRadius: 16 }}>
          <Room3D room={room} showGrid={showGrid} showCeiling={showCeiling} objects={localObjects} slots={localSlots} selectedId={selectedId} selectedType={selectedType} onSelect={handleSelect} onMove={moveSelected} onAddAsset={addAssetAtSpawn} />
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <RoomBuildPanel objects={localObjects} selectedId={selectedId} onDelete={deleteSelected} onDuplicate={duplicateSelected} />
          {(selectedSlot || selectedObject) && <aside aria-label="Selected room asset" style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: 12, background: "rgba(18,21,24,.96)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button type="button" onClick={() => setInspectorTab("edit")} aria-pressed={inspectorTab === "edit"}>Edit Vivarium</button>
              {selectedSlot && selectedSnake && <button type="button" onClick={() => setInspectorTab("occupant")} aria-pressed={inspectorTab === "occupant"}>View Occupant</button>}
            </div>
            {inspectorTab === "edit" && <>
              <strong style={{ display: "block", marginBottom: 8 }}>{selectedSlot?.label ?? selectedObject?.label}</strong>
              <small style={{ display: "block", opacity: .65, marginBottom: 10 }}>Drag the selected asset using the three-axis gizmo. X/Z move it around the floor; Y lifts it vertically. Release to snap to the 5 cm grid.</small>
              {selectedSlot && <div style={{ display: "grid", gap: 7, fontSize: 12 }}><span>Occupant: {selectedSnake?.name ?? "Empty"}</span><span>Size: {selectedSlot.w} × {selectedSlot.depth ?? selectedSlot.h} × {selectedSlot.height ?? selectedSlot.h} cm</span><span>Position: {Math.round(selectedSlot.x)}, {Math.round(selectedSlot.y)}, {Math.round(selectedSlot.z)} cm</span></div>}
              {selectedObject && <div style={{ display: "grid", gap: 7, fontSize: 12 }}><span>Type: {selectedObject.assetType === "vivarium" ? "Vivarium" : selectedObject.kind}</span><span>Size: {selectedObject.width} × {selectedObject.depth} × {selectedObject.height} cm</span><span>Position: {Math.round(selectedObject.x)}, {Math.round(selectedObject.y)}, {Math.round(selectedObject.z)} cm</span></div>}
            </>}
            {inspectorTab === "occupant" && selectedSnake && <>
              <strong style={{ display: "block", marginBottom: 4 }}>{selectedSnake.name}</strong>
              <button type="button" onClick={() => openSnakeProfile(selectedSnake.id)} style={{ width: "100%", marginBottom: 10 }}>Open full profile</button>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                <button type="button" onClick={() => quickAction("feed")} title="Log a feed">🍽️ Feed</button>
                <button type="button" onClick={() => quickAction("shed")} title="Edit the latest shed or log a new cycle">🐍 Shed</button>
                <button type="button" onClick={() => quickAction("weight")} title="Log weight">⚖️ Weight</button>
              </div>
              <small style={{ display: "block", opacity: .6, marginTop: 8 }}>Quick actions jump straight into the relevant tracker for this occupant.</small>
            </>}
          </aside>}
        </div>
      </section>
    </main>
  );
}
