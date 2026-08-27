import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import Room3D from "../components/reptile-room-3d/Room3D";
import { RoomBuildPanel } from "../components/reptile-room-3d/RoomBuildPanel";

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makePlacedObject(kind: ReptileFurnitureKind, label: string, width: number, depth: number, height: number, index: number, assetType: ReptileRoomObject["assetType"] = "furniture"): ReptileRoomObject {
  return {
    id: createId("room-object"), kind, label,
    x: 20 + (index % 4) * (width + 10), y: 0,
    z: 20 + Math.floor(index / 4) * (depth + 10),
    width, depth, height, rotation: 0, wall: null,
    stackGroupId: null, stackIndex: 0, parentAssetId: null,
    clearance: {}, notes: "", assetType,
  };
}

export default function ReptileRoomDigitalTwin3D() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [roomId, setRoomId] = useState("");
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [notice, setNotice] = useState("");
  const [localObjects, setLocalObjects] = useState<ReptileRoomObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const room = useMemo(() => rooms.find((item) => item.id === roomId) ?? rooms[0] ?? null, [rooms, roomId]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const loadedRooms = await loadReptileRooms(user.uid);
      setRooms(loadedRooms);
      if (loadedRooms.length) setRoomId((current) => loadedRooms.some((item) => item.id === current) ? current : loadedRooms[0].id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading && user) void load(); }, [loading, profileLoading, user, load]);
  useEffect(() => { setLocalObjects(room?.objects ?? []); setSelectedId(null); }, [room?.id]);

  const addObject = useCallback((object: ReptileRoomObject) => {
    setLocalObjects((current) => [...current, object]);
    setSelectedId(object.id);
  }, []);

  const addVivarium = useCallback(() => {
    addObject(makePlacedObject("shelving", "Traditional Vivarium · 90 × 40 × 40 cm", 90, 40, 40, localObjects.length, "vivarium"));
  }, [addObject, localObjects.length]);

  const addFurniture = useCallback((kind: ReptileFurnitureKind, label: string, width: number, depth: number, height: number) => {
    addObject(makePlacedObject(kind, label, width, depth, height, localObjects.length));
  }, [addObject, localObjects.length]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setLocalObjects((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const source = localObjects.find((item) => item.id === selectedId);
    if (!source) return;
    const copy: ReptileRoomObject = { ...source, id: createId("room-object"), label: `${source.label} · Copy`, x: source.x + 10, z: source.z + 10 };
    setLocalObjects((current) => [...current, copy]);
    setSelectedId(copy.id);
  }, [localObjects, selectedId]);

  if (loading || profileLoading) return <div className="rr3d-loading">Loading your 3D digital twin…</div>;

  if (!room) return <div className="rr3d-loading"><h2>No reptile room yet</h2><p>Build your room in the 2D builder first, then return to the 3D view.</p></div>;

  return (
    <main style={{ width: "100%", minHeight: "70vh" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "16px 0" }}>
        <div>
          <span style={{ opacity: 0.7, fontSize: 12, letterSpacing: "0.08em" }}>🧊 TINY TITANS · 3D DIGITAL TWIN</span>
          <h1 style={{ margin: "4px 0" }}>{room.name}</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>{Math.round(room.width ?? 0)} × {Math.round(room.depth ?? 0)} × {Math.round(room.height ?? 0)} cm</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {rooms.length > 1 && <select value={room.id} onChange={(event) => setRoomId(event.target.value)} aria-label="Select reptile room">{rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
          <button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide measurements" : "Show measurements"}</button>
          <button type="button" onClick={() => setShowCeiling((value) => !value)}>{showCeiling ? "Hide ceiling" : "Show ceiling"}</button>
        </div>
      </header>
      {notice && <div className="rr3d-notice">{notice}</div>}
      <section aria-label="Three-dimensional reptile room digital twin" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 270px", gap: 12, alignItems: "start" }}>
        <div style={{ width: "100%", height: "min(78vh, 760px)", minHeight: 520, overflow: "hidden", borderRadius: 16 }}>
          <Room3D room={room} showGrid={showGrid} showCeiling={showCeiling} objects={localObjects} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <RoomBuildPanel objects={localObjects} selectedId={selectedId} onAddVivarium={addVivarium} onAddFurniture={addFurniture} onDelete={deleteSelected} onDuplicate={duplicateSelected} />
      </section>
    </main>
  );
}
