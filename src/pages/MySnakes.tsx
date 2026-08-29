import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MySnakesTiles from "./MySnakesTiles";
import ReptileRoomPOVViewer from "../components/reptile-room-3d/ReptileRoomPOVViewer";
import "../styles/my-snakes-workspace.css";

type WorkspaceView = "snakes" | "room";
const STORAGE_KEY = "tinyTitans.mySnakes.view";
function readView(): WorkspaceView {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "room" ? "room" : "snakes";
  } catch {
    return "snakes";
  }
}

export default function MySnakes() {
  const [view, setView] = useState<WorkspaceView>(() => readView());
  const navigate = useNavigate();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* optional preference */
    }
  }, [view]);

  const openRoomEditor = () => navigate("/reptile-room");
  const openVivariumBuilder = (slotId: string) => navigate(`/reptile-room/vivarium/${encodeURIComponent(slotId)}`);

  return (
    <div className={`my-snakes-workspace my-snakes-workspace-${view}`}>
      <header className="tt-page-header my-snakes-page-header">
        <div>
          <p className="tt-eyebrow">Your collection</p>
          <h1>My Snakes</h1>
          <p>Manage your animals, records and reptile room from one place.</p>
        </div>
        <div className="tt-page-actions">
          <Link className="tt-button my-snakes-add-action" to="/add-snake">+ Add Snake</Link>
        </div>
      </header>

      <div className="my-snakes-view-switch" role="tablist" aria-label="My Snakes view">
        <button type="button" role="tab" aria-selected={view === "snakes"} className={view === "snakes" ? "is-active" : ""} onClick={() => setView("snakes")}>
          <span aria-hidden="true">◈</span><span>Snake Tiles</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "room"} className={view === "room" ? "is-active" : ""} onClick={() => setView("room")}>
          <span aria-hidden="true">▦</span><span>Reptile Room</span>
        </button>
      </div>

      <div className="my-snakes-workspace-content">
        {view === "snakes" ? (
          <MySnakesTiles />
        ) : (
          <ReptileRoomPOVViewer onEdit={openRoomEditor} onOpenVivariumBuilder={openVivariumBuilder} />
        )}
      </div>
    </div>
  );
}
