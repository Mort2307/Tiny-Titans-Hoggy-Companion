import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "../../context/useAuth";
import { loadReptileRooms, saveReptileRooms, setRoomFloorPlan, type ReptileRoomPoint, type ReptileRoomSocket, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { uploadReptileRoomAsset, type ReptileRoomAssetKind } from "../../services/reptileRoomAssetService";
import { validateSpatialLayout } from "../../services/reptileRoomSpatialService";

const panelStyle: CSSProperties = { margin: "0 auto .75rem", padding: ".75rem", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, background: "rgba(15,18,22,.9)", color: "inherit" };
const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: ".42rem", borderRadius: 7, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "inherit" };
function roomPoints(room: ReptileRoomWorkspace): ReptileRoomPoint[] {
  return room.floorPlan?.map((point) => ({ ...point })) ?? [
    { x: 0, z: 0 },
    { x: room.width ?? 360, z: 0 },
    { x: room.width ?? 360, z: room.depth ?? 300 },
    { x: 0, z: room.depth ?? 300 },
  ];
}

type RoomBlueprintPanelProps = {
  room?: ReptileRoomWorkspace | null;
  onRoomChange?: (room: ReptileRoomWorkspace) => void;
};

export default function RoomBlueprintPanel({ room: controlledRoom = null, onRoomChange }: RoomBlueprintPanelProps) {
  const { user } = useAuth();
  const [localRoom, setLocalRoom] = useState<ReptileRoomWorkspace | null>(null);
  const room = controlledRoom ?? localRoom;
  const controlled = controlledRoom !== null;
  const [points, setPoints] = useState<ReptileRoomPoint[]>([]);
  const [wallId, setWallId] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!controlled || !controlledRoom) return;
    setPoints(roomPoints(controlledRoom));
    setWallId(controlledRoom.walls?.[0]?.id ?? "");
  }, [controlled, controlledRoom?.id, controlledRoom?.updatedAt]);

  useEffect(() => {
    if (controlled) return;
    if (!user) return;
    void loadReptileRooms(user.uid)
      .then((rooms) => {
        const next = rooms[0] ?? null;
        setLocalRoom(next);
        setPoints(next ? roomPoints(next) : []);
        setWallId(next?.walls?.[0]?.id ?? "");
      })
      .catch((error) =>
        setNotice(error instanceof Error ? error.message : "Unable to load room settings."),
      );
  }, [controlled, user]);

  const walls = useMemo(() => room?.walls ?? [], [room]);
  const spatialIssues = useMemo(
    () => room
      ? validateSpatialLayout(room.slots, room.objects ?? [], room.width ?? 0, room.depth ?? 0, room.height ?? 0)
      : [],
    [room],
  );

  const save = async (nextRoom: ReptileRoomWorkspace) => {
    if (controlled) {
      onRoomChange?.(nextRoom);
      setNotice("Room blueprint updated. Save the room to commit it to the cloud.");
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      await saveReptileRooms(user.uid, [nextRoom]);
      setLocalRoom(nextRoom);
      setPoints(roomPoints(nextRoom));
      setWallId(nextRoom.walls?.[0]?.id ?? wallId);
      setNotice("Room blueprint saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save room blueprint.");
    } finally {
      setBusy(false);
    }
  };

  const saveShape = () => {
    if (!room) return;
    try {
      void save(setRoomFloorPlan(room, points));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invalid room shape.");
    }
  };

  const updatePoint = (index: number, key: "x" | "z", value: number) =>
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index
          ? { ...point, [key]: Number.isFinite(value) ? value : 0 }
          : point,
      ),
    );

  const addPoint = () => {
    const last = points[points.length - 1] ?? { x: 0, z: 0 };
    setPoints((current) => [...current, { x: last.x + 50, z: last.z }]);
  };

  const removePoint = (index: number) =>
    setPoints((current) =>
      current.length > 3
        ? current.filter((_, pointIndex) => pointIndex !== index)
        : current,
    );

  const addSocket = () => {
    if (!room) return;
    const wall = walls.find((item) => item.id === wallId) ?? walls[0];
    if (!wall) return;

    const socket: ReptileRoomSocket = {
      id: `socket-${crypto.randomUUID()}`,
      wallId: wall.id,
      x: (wall.start.x + wall.end.x) / 2,
      z: (wall.start.z + wall.end.z) / 2,
      height: 45,
      outlets: 2,
      label: "Power socket",
      switchable: true,
      enabled: true,
      circuit: "",
      maxLoadWatts: 0,
    };

    void save({
      ...room,
      sockets: [...(room.sockets ?? []), socket],
      updatedAt: new Date().toISOString(),
    });
  };

  const updateSocket = (id: string, patch: Partial<ReptileRoomSocket>) => {
    if (!room) return;
    void save({
      ...room,
      sockets: (room.sockets ?? []).map((socket) => socket.id === id ? { ...socket, ...patch } : socket),
      updatedAt: new Date().toISOString(),
    });
  };
  const removeSocket = (id: string) => {
    if (!room) return;
    void save({
      ...room,
      sockets: (room.sockets ?? []).filter((socket) => socket.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const upload = async (kind: ReptileRoomAssetKind, file: File) => {
    if (!user || !room) return;
    setBusy(true);
    try {
      const url = await uploadReptileRoomAsset(user.uid, room.id, kind, file);
      if (kind === "room-photo") {
        await save({ ...room, roomPhotoUrl: url });
      } else if (kind === "logo") {
        await save({ ...room, logoUrl: url });
      } else {
        const selectedWall = walls.find((wall) => wall.id === wallId) ?? walls[0];
        if (selectedWall) {
          await save({
            ...room,
            walls: walls.map((wall) =>
              wall.id === selectedWall.id ? { ...wall, imageUrl: url } : wall,
            ),
          });
        }
      }
      setNotice("Room visual uploaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to upload room visual.");
    } finally {
      setBusy(false);
    }
  };

  if (!room) return null;

  return (
    <section style={panelStyle} aria-label="Room blueprint and infrastructure">
      <details open>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>
          🏠 Room blueprint · shape · power · realism
        </summary>
        <div style={{ display: "grid", gap: ".7rem", marginTop: ".75rem" }}>
          <div>
            <strong>Floor plan</strong>
            <div style={{ display: "grid", gap: ".35rem", marginTop: ".4rem" }}>
              {points.map((point, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr auto",
                    gap: ".35rem",
                  }}
                >
                  <label>
                    Wall point {index + 1}
                    <input
                      aria-label={`Wall point ${index + 1} X`}
                      type="number"
                      value={point.x}
                      onChange={(event) =>
                        updatePoint(index, "x", Number(event.target.value))
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label>
                    Z
                    <input
                      aria-label={`Wall point ${index + 1} Z`}
                      type="number"
                      value={point.z}
                      onChange={(event) =>
                        updatePoint(index, "z", Number(event.target.value))
                      }
                      style={inputStyle}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removePoint(index)}
                    disabled={points.length <= 3}
                    style={{ alignSelf: "end" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: ".4rem", marginTop: ".45rem" }}>
              <button type="button" onClick={addPoint}>+ Wall</button>
              <button type="button" onClick={saveShape} disabled={busy}>Save shape</button>
            </div>
          </div>

          <div>
            <strong>🔌 Power sockets</strong>
            <div style={{ display: "flex", gap: ".4rem", marginTop: ".4rem" }}>
              <select
                value={wallId}
                onChange={(event) => setWallId(event.target.value)}
                style={{ ...inputStyle, maxWidth: 260 }}
              >
                {walls.map((wall) => (
                  <option key={wall.id} value={wall.id}>
                    {wall.id} · {Math.round(Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z))} cm
                  </option>
                ))}
              </select>
              <button type="button" onClick={addSocket} disabled={busy}>+ Socket</button>
            </div>
            <div style={{ display: "grid", gap: ".3rem", marginTop: ".4rem" }}>
              {(room.sockets ?? []).map((socket) => (
                <div
                  key={socket.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: ".5rem",
                    padding: ".35rem .45rem",
                    borderRadius: 7,
                    background: "rgba(255,255,255,.04)",
                  }}
                >
                  <div style={{ display: "grid", gap: ".25rem", minWidth: 0 }}>
                    <strong>🔌 {socket.label}</strong>
                    <small>{socket.height} cm · {socket.outlets} outlets</small>
                    <label>
                      Max load (W)
                      <input
                        aria-label={`${socket.label} maximum load watts`}
                        type="number"
                        min="0"
                        step="10"
                        value={socket.maxLoadWatts ?? 0}
                        onChange={(event) => updateSocket(socket.id, { maxLoadWatts: Math.max(0, Number(event.target.value) || 0) })}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                  <button type="button" onClick={() => removeSocket(socket.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <strong>📐 Layout audit</strong>
            {spatialIssues.length === 0 ? (
              <div style={{ marginTop: ".4rem", padding: ".55rem", borderRadius: 8, background: "rgba(70,180,120,.1)", border: "1px solid rgba(70,180,120,.18)" }}>
                ✓ No room-boundary or 3D overlap issues detected.
              </div>
            ) : (
              <div style={{ display: "grid", gap: ".3rem", marginTop: ".4rem" }}>
                {spatialIssues.slice(0, 12).map((issue, index) => (
                  <div key={`${issue.message}-${index}`} style={{ padding: ".45rem .55rem", borderRadius: 8, background: issue.severity === "error" ? "rgba(210,75,75,.1)" : "rgba(220,170,70,.1)", border: `1px solid ${issue.severity === "error" ? "rgba(210,75,75,.18)" : "rgba(220,170,70,.18)"}` }}>
                    <strong>{issue.severity === "error" ? "⚠️" : "ℹ️"} </strong>{issue.message}
                  </div>
                ))}
                {spatialIssues.length > 12 && <small>{spatialIssues.length - 12} more layout issue{spatialIssues.length - 12 === 1 ? "" : "s"}.</small>}
              </div>
            )}
          </div>

          <div>
            <strong>📸 Room visuals</strong>
            <div
              style={{
                display: "grid",
                gap: ".4rem",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                marginTop: ".4rem",
              }}
            >
              <label>
                Room photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("room-photo", file);
                  }}
                />
              </label>
              <label>
                Logo wall image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("logo", file);
                  }}
                />
              </label>
              <label>
                Wall photo
                <select
                  value={wallId}
                  onChange={(event) => setWallId(event.target.value)}
                  style={inputStyle}
                >
                  {walls.map((wall) => (
                    <option key={wall.id} value={wall.id}>{wall.id}</option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("wall", file);