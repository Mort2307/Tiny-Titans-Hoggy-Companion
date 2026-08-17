import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import { getUserSnakes } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import SnakeTile from "../components/SnakeTile";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/snake-selector.css";

function MySnakes() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnake, setSelectedSnake] = useState<Snake | null>(null);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      setSnakes([]);
      setLoadingSnakes(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const uid = user.uid;

    async function loadSnakes() {
      setLoadingSnakes(true);
      setError(null);
      try {
        const loadedSnakes = await getUserSnakes(uid);
        if (cancelled) return;
        const validSnakes = loadedSnakes
          .filter((snake) => Boolean(snake?.id))
          .map((snake) => ({ ...snake, id: String(snake.id).trim() }));
        setSnakes(validSnakes);
      } catch (err) {
        if (!cancelled) {
          console.error("Tiny Titans: unable to load snakes", err);
          setError(err instanceof Error ? err.message : "Unable to load your snakes. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingSnakes(false);
      }
    }

    void loadSnakes();
    return () => { cancelled = true; };
  }, [user, loading, profileLoading]);

  function closePanel() { setSelectedSnake(null); }

  function openTracker(path: string) {
    if (!selectedSnake?.id) return;
    const snakeId = String(selectedSnake.id).trim();
    closePanel();
    navigate(`${path}/${snakeId}`);
  }

  function openProfile() {
    if (!selectedSnake?.id) return;
    const snakeId = String(selectedSnake.id).trim();
    closePanel();
    navigate(`/snakes/${snakeId}`);
  }

  function openEditor() {
    if (!selectedSnake?.id) return;
    const snakeId = String(selectedSnake.id).trim();
    closePanel();
    navigate(`/snakes/${snakeId}/edit`);
  }

  if (loading || profileLoading) {
    return (
      <div className="page-container">
        <BackHomeButton />
        <h1>🐍 My Hoggies</h1>
        <div className="tracker-card"><h3>Loading your Tiny Titans...</h3><p>Connecting to your Tiny Titans account.</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <BackHomeButton />
      <h1>🐍 My Hoggies</h1>
      <p className="page-subtitle">Choose a Tiny Titan to open their trackers.</p>

      <button type="button" className="add-snake-button" onClick={() => navigate("/snakes/new/edit")}>➕ Add Snake</button>

      {loadingSnakes && <div className="tracker-card"><h3>Loading your snakes...</h3><p>Please wait while Tiny Titans retrieves your records.</p></div>}
      {error && <div className="tracker-card"><h3>Something went wrong</h3><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try Again</button></div>}

      {!loadingSnakes && !error && snakes.length === 0 && (
        <div className="tracker-card"><h3>No snakes added yet 🐍</h3><p>Add your first Tiny Titan to begin tracking weights, feeding, sheds and genetics.</p></div>
      )}

      {!loadingSnakes && !error && snakes.length > 0 && (
        <div className="snake-grid snake-circle-grid">
          {snakes.map((snake) => {
            const snakeId = String(snake.id ?? "").trim();
            if (!snakeId) return null;
            return <SnakeTile key={snakeId} id={snakeId} name={snake.name} photo={snake.photo} sex={snake.sex} snake={{ ...snake, id: snakeId }} onSelect={setSelectedSnake} />;
          })}
        </div>
      )}

      {selectedSnake && (
        <div className="snake-tracker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <aside className="snake-tracker-panel" role="dialog" aria-modal="true" aria-label={`${selectedSnake.name} tracker menu`}>
            <button type="button" className="snake-panel-close" onClick={closePanel} aria-label="Close tracker menu">×</button>
            <div className="snake-panel-identity">
              <span className="snake-panel-avatar">{selectedSnake.photo ? <img src={selectedSnake.photo} alt={selectedSnake.name} /> : <span>🐍</span>}</span>
              <div><h2>{selectedSnake.name}</h2><p>{selectedSnake.sex ?? "Unknown sex"}</p></div>
            </div>
            <div className="snake-panel-actions">
              <button type="button" onClick={openProfile}>🐍 View Full Profile</button>
              <button type="button" onClick={() => openTracker("/weights")}>⚖️ Weight Tracker <span>{selectedSnake.weightHistory?.length ?? 0}</span></button>
              <button type="button" onClick={() => openTracker("/feeding")}>🍽️ Feeding Tracker <span>{selectedSnake.feedingHistory?.length ?? 0}</span></button>
              <button type="button" onClick={() => openTracker("/shedding")}>💧 Shed Tracker <span>{selectedSnake.shedHistory?.length ?? 0}</span></button>
              <button type="button" onClick={openEditor}>✏️ Edit Snake</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default MySnakes;
