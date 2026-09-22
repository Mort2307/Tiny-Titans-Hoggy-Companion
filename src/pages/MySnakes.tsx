import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useSpeciesContext } from "../context/SpeciesContext";
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
  const { selectedSpecies } = useSpeciesContext();
  const selectedSpeciesName = selectedSpecies?.commonNames[0] ?? selectedSpecies?.acceptedScientificName ?? "your selected species";

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* optional preference */
    }
  }, [view]);

  const openRoomEditor = () => setView("snakes");

  return (
    <div className={`my-snakes-workspace my-snakes-workspace-${view}`}>
      <header className="tt-page-header my-snakes-page-header">
        <div>
          <p className="tt-eyebrow">Your collection</p>
          <h1>Snake Records</h1>
          <p>Legacy snake-record workspace. Use My Animals for your complete collection across supported animal groups.</p>
        </div>
        <div className="tt-page-actions">
          <Link className="tt-button my-snakes-add-action" to="/snakes/new">+ Add Snake</Link>
        </div>
      </header>

      <div className="my-snakes-view-switch" role="tablist" aria-label="Snake records view">
        <button type="button" role="tab" aria-selected={view === "snakes"} className={view === "snakes" ? "is-active" : ""} onClick={() => setView("snakes")}>
          <span aria-hidden="true">◈</span><span>Snake Tiles</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "room"} className={view === "room" ? "is-active" : ""} onClick={() => setView("room")}>
          <span aria-hidden="true">▦</span><span>Reptile Room</span>
        </button>
      </div>

      <section className="my-snakes-species-bridge" aria-labelledby="my-snakes-species-bridge-title">
        <div className="my-snakes-species-bridge__copy">
          <p className="tt-eyebrow">Species workspace</p>
          <h2 id="my-snakes-species-bridge-title"><TinyTitansIcon name="animals" size={20} /> Keep the whole animal picture connected</h2>
          <p>Start with the animals you keep, then move into the same species-aware reference layer used by Husbandry &amp; Care and the Morph Library.</p>
          <span className="my-snakes-species-bridge__context">Current species context: <strong>{selectedSpeciesName}</strong></span>
        </div>
        <nav className="my-snakes-species-bridge__links" aria-label="Connected species workspaces">
          <Link to="/species"><TinyTitansIcon name="animals" size={18} /><span><strong>Species Explorer</strong><small>Browse the full catalogue</small></span></Link>
          <Link to="/husbandry"><TinyTitansIcon name="husbandry" size={18} /><span><strong>Husbandry &amp; Care</strong><small>Apply care to the selected species/animal</small></span></Link>
          <Link to="/morph-library"><TinyTitansIcon name="morph" size={18} /><span><strong>Morph Library</strong><small>Open species-aware genetics</small></span></Link>
        </nav>
      </section>

      <div className="my-snakes-workspace-content">
        {view === "snakes" ? (
          <MySnakesTiles />
        ) : (
          <ReptileRoomPOVViewer onEdit={openRoomEditor} />
        )}
      </div>
    </div>
  );
}
