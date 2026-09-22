import TinyTitansIcon from "../TinyTitansIcon";
import { useRoomBlueprintPanel } from "../../hooks/useRoomBlueprintPanel";
import type { Room3DAssetKind } from "../../services/reptileRoomAssetService";
import type { CSSProperties } from "react";

const panelStyle: CSSProperties = { margin: "0 auto .75rem", padding: ".75rem", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, background: "rgba(15,18,22,.9)", color: "inherit" };
const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", padding: ".42rem", borderRadius: 7, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "inherit" };

function RoomBlueprintPanelView({
  room, points, wallId, walls, notice, busy, updatePoint, addPoint, removePoint, saveShape, addSocket, removeSocket, setWallId, upload,
}: ReturnType<typeof useRoomBlueprintPanel>) {
  if (!room) return null;
  return (
    <section style={panelStyle} aria-label="Room blueprint and infrastructure">
      <details open>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}><TinyTitansIcon name="enclosure" size={18} /> Room blueprint · shape · power · realism</summary>
        <div style={{ display: "grid", gap: ".7rem", marginTop: ".75rem" }}>
          <div>
            <strong>Floor plan</strong>
            <div style={{ display: "grid", gap: ".35rem", marginTop: ".4rem" }}>
              {points.map((point, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: ".35rem" }}>
                  <label>Wall point {index + 1}<input aria-label={`Wall point ${index + 1} X`} type="number" value={point.x} onChange={(event) => updatePoint(index, "x", Number(event.target.value))} style={inputStyle} /></label>
                  <label>Z<input aria-label={`Wall point ${index + 1} Z`} type="number" value={point.z} onChange={(event) => updatePoint(index, "z", Number(event.target.value))} style={inputStyle} /></label>
                  <button type="button" onClick={() => removePoint(index)} disabled={points.length <= 3} style={{ alignSelf: "end" }} aria-label={`Remove wall point ${index + 1}`}><TinyTitansIcon name="close" size={16} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: ".4rem", marginTop: ".45rem" }}><button type="button" onClick={addPoint}><TinyTitansIcon name="add" size={16} /> Wall</button><button type="button" onClick={saveShape} disabled={busy}><TinyTitansIcon name="save" size={16} /> Save shape</button></div>
          </div>
          <div>
            <strong><TinyTitansIcon name="power" size={17} /> Power sockets</strong>
            <div style={{ display: "flex", gap: ".4rem", marginTop: ".4rem" }}><select value={wallId} onChange={(event) => setWallId(event.target.value)} style={{ ...inputStyle, maxWidth: 260 }}>{walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.id} · {Math.round(Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z))} cm</option>)}</select><button type="button" onClick={addSocket} disabled={busy}><TinyTitansIcon name="add" size={16} /> Socket</button></div>
            <div style={{ display: "grid", gap: ".3rem", marginTop: ".4rem" }}>{(room.sockets ?? []).map((socket) => <div key={socket.id} style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", padding: ".35rem .45rem", borderRadius: 7, background: "rgba(255,255,255,.04)" }}><span><TinyTitansIcon name="power" size={15} /> {socket.label} · {socket.height} cm · {socket.outlets} outlets</span><button type="button" onClick={() => removeSocket(socket.id)}><TinyTitansIcon name="delete" size={15} /> Remove</button></div>)}</div>
          </div>
          <div>
            <strong><TinyTitansIcon name="camera" size={17} /> Room visuals</strong>
            <div style={{ display: "grid", gap: ".4rem", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: ".4rem" }}>
              <label>Room photo<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("room-photo" as Room3DAssetKind, file); }} /></label>
              <label>Logo wall image<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("logo" as Room3DAssetKind, file); }} /></label>
              <label>Wall photo<select value={wallId} onChange={(event) => setWallId(event.target.value)} style={inputStyle}>{walls.map((wall) => <option key={wall.id} value={wall.id}>{wall.id}</option>)}</select><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload("wall" as Room3DAssetKind, file); }} /></label>
            </div>
            {room.roomPhotoUrl && <img src={room.roomPhotoUrl} alt="Uploaded reptile room reference" style={{ maxWidth: 240, maxHeight: 120, objectFit: "cover", borderRadius: 8, marginTop: ".45rem" }} />}
          </div>
          {notice && <div role="status" style={{ fontSize: ".82rem", opacity: .78 }}>{notice}</div>}
        </div>
      </details>
    </section>
  );
}

export default function RoomBlueprintPanel() {
  const controller = useRoomBlueprintPanel();
  return <RoomBlueprintPanelView {...controller} />;
}
