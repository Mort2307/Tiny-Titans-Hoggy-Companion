import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { Snake } from "../types/Snake";
import { getUserSnake } from "../services/snakeService";
import { migrateSnake } from "../utils/snakeMigration";
import EnclosurePhotoEditor from "../components/EnclosurePhotoEditor";
import BackHomeButton from "../components/BackHomeButton";

export default function ReptileVivariumEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snake, setSnake] = useState<Snake | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (loading || profileLoading || !user || !id) return;
      try {
        const loaded = await getUserSnake(user.uid, id);
        if (!loaded) {
          if (!cancelled) setError("This vivarium could not be found.");
          return;
        }
        if (!cancelled) setSnake(migrateSnake(loaded));
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load this vivarium.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id, loading, profileLoading, user]);

  if (loading || profileLoading || !snake && !error) {
    return <div className="page-container"><BackHomeButton /><div className="tracker-card">Loading vivarium…</div></div>;
  }

  if (error || !snake) {
    return <div className="page-container"><BackHomeButton /><div className="tracker-card"><h1>Vivarium unavailable</h1><p>{error || "This vivarium could not be loaded."}</p><button type="button" onClick={() => navigate("/reptile-room")}>Back to Reptile Room</button></div></div>;
  }

  return (
    <div className="page-container">
      <BackHomeButton />
      <div className="tracker-card">
        <button type="button" onClick={() => navigate("/reptile-room")}>← Back to Reptile Room</button>
        <h1>🏠 {snake.name}'s Vivarium</h1>
        <p>Edit the actual enclosure record here. The same photo is used by the 2D builder and 3D Digital Twin.</p>
        <EnclosurePhotoEditor snake={snake} onUpdated={setSnake} />
      </div>
    </div>
  );
}
