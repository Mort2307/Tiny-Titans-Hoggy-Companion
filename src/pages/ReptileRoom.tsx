import { useState } from "react";
import ReptileRoomV7 from "./ReptileRoomV7";
import ReptileRoom3D from "./ReptileRoom3D";
import "../styles/reptile-room-mode.css";

export default function ReptileRoom() {
  const [mode, setMode] = useState<"2d" | "3d">("3d");

  return <div className="reptile-room-mode-shell">
    <div className="reptile-room-mode-toggle" role="group" aria-label="Reptile room view">
      <button type="button" className={mode === "2d" ? "is-active" : ""} onClick={() => setMode("2d")} aria-pressed={mode === "2d"}>▦ 2D Builder</button>
      <button type="button" className={mode === "3d" ? "is-active" : ""} onClick={() => setMode("3d")} aria-pressed={mode === "3d"}>🧊 3D Room</button>
    </div>
    {mode === "2d" ? <ReptileRoomV7 /> : <ReptileRoom3D />}
  </div>;
}
