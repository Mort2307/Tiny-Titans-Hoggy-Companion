import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "../../context/useAuth";
import { getUserSnakes } from "../../services/snakeService";
import { loadReptileRooms, saveReptileRooms, setRoomFloorPlan, type ReptileFurnitureKind, type ReptileRoomObject, type ReptileRoomPoint, type ReptileRoomSocket, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { uploadReptileRoomAsset, type ReptileRoomAssetKind } from "../../services/reptileRoomAssetService";
import type { Snake } from "../../types/Snake";
import ReptileRoomDigitalTwin3D from "../../pages/ReptileRoomDigitalTwin3D";

const panel: CSSProperties = { padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(18,21,25,.96)" };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 36, padding: "7px 9px", borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.055)", color: "inherit" };
const button: CSSProperties = { minHeight: 36, padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", cursor: "pointer" };

type AssetDef = { kind: ReptileFurnitureKind; label: string; icon: string; width: number; depth: number; height: number; category: string };

const ASSETS: AssetDef[] = [
  { kind: "rack", label: "Vivarium Rack", icon: "🗄️", width: 100, depth: 55, height: 180, category: "Housing & Storage" },
  { kind: "shelving", label: "Shelving Unit", icon: "📚", width: 90, depth: 40, height: 180, category: "Housing & Storage" },
  { kind: "storage-cabinet", label: "Storage Cabinet", icon: "🗃️", width: 80, depth: 40, height: 90, category: "Housing & Storage" },
  { kind: "workbench", label: "Keeper Workbench", icon: "🛠️", width: 120, depth: 60, height: 90, category: "Keeper" },
  { kind: "equipment-station", label: "Equipment Station", icon: "⚙️", width: 90, depth: 50, height: 80, category: "Keeper" },
  { kind: "table", label: "Table", icon: "▱", width: 100, depth: 60, height: 75, category: "Keeper" },
  { kind: "chair", label: "Chair", icon: "🪑", width: 45, depth: 45, height: 85, category: "Keeper" },
  { kind: "sofa", label: "Sofa", icon: "🛋️", width: 180, depth: 80, height: 85, category: "Keeper" },
  { kind: "plant", label: "Plant", icon: "🌿", width: 45, depth: 45, height: 120, category: "Decor" },
  { kind: "lamp", label: "Lamp", icon: "💡", width: 35, depth: 35, height: 150, category: "Heating & Lighting" },
  { kind: "vent", label: "Vent", icon: "💨", width: 40, depth: 10, height: 30, category: "Heating & Lighting" },
  { kind: "quarantine-area", label: "Quarantine Area", icon: "🩺", width: 100, depth: 60, height: 90, category: "Keeper" },
];

const CATEGORIES = [...new Set(ASSETS.map((asset) => asset.category))];

function roomPoints(room: ReptileRoomWorkspace): ReptileRoomPoint[] {
  return room.floorPlan?.map((point) => ({ ...point })) ?? [
    { x: 0, z: 0 },
    { x: room.width ?? 360, z: 0 },
    { x: room.width ?? 360, z: room.depth ?? 300 },
    { x: 0, z: room.depth ?? 300 },
  ];
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeObject(asset: AssetDef, room: ReptileRoomWorkspace): ReptileRoomObject {
  const width = room.width ?? 360;
  const depth = room.depth ?? 300;
  return {
    id: createId("room-object"),
    kind: asset.kind,
    label: asset.label,
    x: Math.max(0, Math.min(width - asset.width, width / 2 - asset.width / 2)),
    y: Math.max(0, Math.min(depth - asset.depth, depth / 2 - asset.depth / 2)),
    z: 0,
    width: asset.width,
    depth: asset.depth,
    height: asset.height,
    rotation: 0,
    wall: null,
    stackGroupId: null,
    stackIndex: 0,
    parentAssetId: null,
    clearance: {},
    notes: "",
    assetType: "furniture",
  };
}

export default function RoomEditorShell3D() {
  const { user } = useAuth();
  const [room, setRoom] = useState<ReptileRoomWorkspace | null>(null);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [points, setPoints] = useState<ReptileRoomPoint[]>([]);
  const [openCategory, setOpenCategory] = useState("Housing & Storage");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [rooms, userSnakes] = await Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)]);
      const next = rooms[0] ?? null;
      setRoom(next);
      setSnakes(userSnakes);
      if (next) setPoints(roomPoints(next));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (nextRoom: ReptileRoomWorkspace, message = "Room saved.") => {
    if (!user) return;
    setBusy(true);
    try {
      const normalized = { ...nextRoom, roomVersion: 4, updatedAt: new Date().toISOString() };
      await saveReptileRooms(user.uid, [normalized]);
      setRoom(normalized);
      setPoints(roomPoints(normalized));
      setRefreshKey((value) => value + 1);
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save room.");
    } finally {
      setBusy(false);
    }
  }, [user]);

  const addAsset = useCallback((asset: AssetDef) => {
    if (!room) return;
    void save({ ...room, objects: [...(room.objects ?? []), makeObject(asset, room)] }, `${asset.label} added.`);
  }, [room, save]);

  const addVivarium = useCallback((snakeId: string | null) => {
    if (!room) return;
    const snake = snakeId ? snakes.find((item) => item.id === snakeId) : undefined;
    const width = 90;
    const depth = 45;
    const slot = {
      id: createId("viv"),
      snakeId: snake?.id ?? null,
      label: snake ? `${snake.name} · Vivarium` : "Empty Vivarium",
      x: Math.max(0, (room.width ?? 360) / 2 - width / 2),
      y: Math.max(0, (room.depth ?? 300) / 2 - depth / 2),
      z: 0,
      w: width,
      h: depth,
      depth,
      height: 40,
      lifecycleStatus: snake ? "active" : "empty",
      condition: "good",
      availability: snake ? "occupied" : "available",
      storageLocation: "",
      storageNote: "",
      notes: "",
      maintenanceNote: "",
      stackGroupId: null,
      stackIndex: 0,
      parentSlotId: null,
      clearance: {},
      photoUrl: snake?.photo ?? "",
    };
    void save({ ...room, slots: [...room.slots, slot] }, snake ? `${snake.name}'s vivarium added.` : "Empty vivarium added.");
  }, [room, save, snakes]);

  const saveShape = useCallback(() => {
    if (!room) return;
    try {
      void save(setRoomFloorPlan(room, points), "Room shape saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invalid room shape.");
    }
  }, [room, points, save]);

  const rectangularize = useCallback(() => {
    if (!room) return;
    const width = room.width ?? 360;
    const depth = room.depth ?? 300;
    setPoints([{ x: 0, z: 0 }, { x: width, z: 0 }, { x: width, z: depth }, { x: 0, z: depth }]);
  }, [room]);

  const updateRoomNumber = useCallback((field: "width" | "depth" | "height", value: number) => {
    if (!room) return;
    setRoom({ ...room, [field]: Math.max(100, Number.isFinite(value) ? value : 100) });
  }, [room]);

  const addSocket = useCallback(() => {
    if (!room) return;
    const wall = room.walls?.[0];
    if (!wall) return;
    const socket: ReptileRoomSocket = { id: createId("socket"), wallId: wall.id, x: (wall.start.x + wall.end.x) / 2, z: (wall.start.z + wall.end.z) / 2, height: 45, outlets: 2, label: "Power socket", switchable: true, enabled: true, circuit: "", maxLoadWatts: 0 };
    void save({ ...room, sockets: [...(room.sockets ?? []), socket] }, "Power socket added.");
  }, [room, save]);

  const updateSocket = useCallback((id: string, patch: Partial<ReptileRoomSocket>) => {
    if (!room) return;
    const sockets = (room.sockets ?? []).map((socket) => socket.id === id ? { ...socket, ...patch } : socket);
    setRoom({ ...room, sockets });
  }, [room]);

  const persistSockets = useCallback(() => {
    if (room) void save(room, "Power layout saved.");
  }, [room, save]);

  const upload = useCallback(async (kind: ReptileRoomAssetKind, file: File, wallId?: string) => {
    if (!user || !room) return;
    setBusy(true);
    try {
      const url = await uploadReptileRoomAsset(user.uid, room.id, kind, file);
      if (kind === "room-photo") await save({ ...room, roomPhotoUrl: url }, "Room photo saved.");
      else if (kind === "logo") await save({ ...room, logoUrl: url }, "Logo saved.");
      else if (wallId) await save({ ...room, walls: (room.walls ?? []).map((wall) => wall.id === wallId ? { ...wall, imageUrl: url } : wall) }, "Wall photo saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to upload room visual.");
    } finally {
      setBusy(false);
    }
  }, [user, room, save]);

  const snakeOptions = useMemo(() => snakes.filter((snake) => snake.status !== "Deceased" && snake.status !== "Sold"), [snakes]);

  if (!room) return <div style={panel}>Loading your 3D reptile room…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={panel} aria-label="3D room editor">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div><div style={{ fontSize: 20, fontWeight: 900 }}>🏠 {room.name}</div><div style={{ opacity: .68, fontSize: 12 }}>3D Digital Twin · true-scale room editor</div></div>
          <div style={{ display: "flex", gap: 7 }}><button type="button" style={button} disabled={busy} onClick={() => void save(room, "Room saved.")}>💾 Save room</button><button type="button" style={button} onClick={() => void load()}>↻ Reload</button></div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 380px)", gap: 12, alignItems: "start" }}>
        <div style={{ minHeight: 650, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", background: "#17191c" }}>
          <ReptileRoomDigitalTwin3D key={refreshKey} />
        </div>

        <aside style={{ display: "grid", gap: 10 }}>
          <section style={panel}><strong>📦 Add to room</strong><div style={{ fontSize: 12, opacity: .65, margin: "5px 0 9px" }}>Choose a real-world prop and it is placed into the 3D room at true scale.</div><div style={{ display: "grid", gap: 6 }}><button type="button" style={{ ...button, textAlign: "left" }} onClick={() => addVivarium(null)}>🐍 Empty Vivarium · 90 × 45 × 40 cm</button>{snakeOptions.map((snake) => <button key={snake.id} type="button" style={{ ...button, textAlign: "left" }} onClick={() => addVivarium(snake.id)}>{snake.photo ? "🖼️" : "🐍"} {snake.name}'s Vivarium</button>)}</div></section>

          {CATEGORIES.map((category) => <section key={category} style={panel}><button type="button" style={{ ...button, width: "100%", textAlign: "left", fontWeight: 800 }} onClick={() => setOpenCategory(openCategory === category ? "" : category)}>{category} {openCategory === category ? "⌃" : "⌄"}</button>{openCategory === category && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 7 }}>{ASSETS.filter((asset) => asset.category === category).map((asset) => <button key={asset.kind} type="button" style={{ ...button, minHeight: 52, textAlign: "left", fontSize: 12 }} onClick={() => addAsset(asset)}>{asset.icon} {asset.label}<br /><span style={{ opacity: .6 }}>{asset.width} × {asset.depth} × {asset.height} cm</span></button>)}</div>}</section>)}

          <section style={panel}><strong>📐 Room shape & scale</strong><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 7 }}>{(["width", "depth", "height"] as const).map((field) => <label key={field} style={{ fontSize: 11, textTransform: "capitalize" }}>{field}<input style={input} type="number" min={100} value={room[field] ?? 0} onChange={(event) => updateRoomNumber(field, Number(event.target.value))} /></label>)}</div><div style={{ display: "flex", gap: 6, marginTop: 7 }}><button type="button" style={button} onClick={rectangularize}>Reset rectangle</button><button type="button" style={button} disabled={busy} onClick={saveShape}>Save polygon</button></div><div style={{ display: "grid", gap: 5, marginTop: 8 }}>{points.map((point, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}><label style={{ fontSize: 10 }}>Point {index + 1} X<input style={input} type="number" value={point.x} onChange={(event) => setPoints((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, x: Number(event.target.value) } : item))} /></label><label style={{ fontSize: 10 }}>Z<input style={input} type="number" value={point.z} onChange={(event) => setPoints((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, z: Number(event.target.value) } : item))} /></label></div>)}</div><button type="button" style={{ ...button, marginTop: 6 }} onClick={() => { const last = points[points.length - 1] ?? { x: 0, z: 0 }; setPoints((current) => [...current, { x: last.x + 50, z: last.z }]); }}>＋ Add wall point</button></section>

          <section style={panel}><strong>🔌 Power sockets</strong><div style={{ fontSize: 12, opacity: .65, margin: "5px 0 8px" }}>Place sockets on actual walls so future load/clearance intelligence has infrastructure to reason about.</div>{(room.sockets ?? []).map((socket) => <div key={socket.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, padding: "7px 0", borderTop: "1px solid rgba(255,255,255,.07)" }}><label style={{ fontSize: 10 }}>X<input style={input} type="number" value={socket.x} onChange={(event) => updateSocket(socket.id, { x: Number(event.target.value) })} /></label><label style={{ fontSize: 10 }}>Z<input style={input} type="number" value={socket.z} onChange={(event) => updateSocket(socket.id, { z: Number(event.target.value) })} /></label><label style={{ fontSize: 10 }}>Height<input style={input} type="number" value={socket.height} onChange={(event) => updateSocket(socket.id, { height: Number(event.target.value) })} /></label><label style={{ fontSize: 10 }}>Outlets<input style={input} type="number" min={1} value={socket.outlets} onChange={(event) => updateSocket(socket.id, { outlets: Number(event.target.value) })} /></label></div>)}<div style={{ display: "flex", gap: 6, marginTop: 7 }}><button type="button" style={button} onClick={addSocket}>＋ Socket</button><button type="button" style={button} onClick={persistSockets}>💾 Save power</button></div></section>

          <section style={panel}><strong>📸 Room realism</strong><div style={{ display: "grid", gap: 7, marginTop: 8 }}><label style={{ fontSize: 11 }}>Room reference photo<input style={input} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("room-photo", file); }} /></label><label style={{ fontSize: 11 }}>Logo for a wall<input style={input} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("logo", file); }} /></label>{(room.walls ?? []).map((wall) => <label key={wall.id} style={{ fontSize: 11 }}>{wall.id} wall photo<input style={input} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("wall", file, wall.id); }} /></label>)}</div>{room.roomPhotoUrl ? <img src={room.roomPhotoUrl} alt="Room reference" style={{ width: "100%", maxHeight: 130, objectFit: "cover", borderRadius: 8, marginTop: 8 }} /> : null}</section>

          {notice ? <div role="status" style={{ ...panel, fontSize: 12, opacity: .8 }}>{notice}</div> : null}
        </aside>
      </section>
    </div>
  );
}
