import { useEffect, useState } from "react";
import MySnakesTiles from "./MySnakesTiles";
import ReptileRoom from "./ReptileRoom";
import "../styles/my-snakes-workspace.css";

type WorkspaceView = "snakes" | "room";
const STORAGE_KEY = "tinyTitans.mySnakes.view";

function readView(): WorkspaceView {
  try { return window.localStorage.getItem(STORAGE_KEY) === "room" ? "room" : "snakes"; } catch { return "snakes"; }
}

export default function MySnakes() {
  const [view, setView] = useState<WorkspaceView>(() => readView());
  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, view); } catch { /* optional preference */ } }, [view]);
  return <div className={`my-snakes-workspace my-snakes-workspace-${view}`}>
    <div className="my-snakes-view-switch" role="tablist" aria-label="My Snakes view">
      <button type="button" role="tab" aria-selected={view === "snakes"} className={view === "snakes" ? "is-active" : ""} onClick={() => setView("snakes")}>🐍 <span>Snake Tiles</span></button>
      <button type="button" role="tab" aria-selected={view === "room"} className={view === "room" ? "is-active" : ""} onClick={() => setView("room")}>🏠 <span>Reptile Room</span></button>
    </div>
    <div className="my-snakes-workspace-content">{view === "snakes" ? <MySnakesTiles /> : <ReptileRoom />}</div>
  </div>;
}
