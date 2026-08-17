import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import WeightMiniChart from "../components/WeightMiniChart";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { getUserSnakes } from "../services/snakeService";
import { getSnakeWeights, migrateEmbeddedWeights } from "../services/weightService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValueValue";

function WeightIndex() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [weightsBySnake, setWeightsBySnake] = useState<Record<string, WeightRecord[]>>({});
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSnakes() {
      if (loading || profileLoading) return;
      if (!user) { setError("You must be logged in to view weight records."); setLoadingSnakes(false); return; }
      try {
        const loadedSnakes = await getUserSnakes(user.uid);
        const nextWeights: Record<string, WeightRecord[]> = {};
        const nextSnakes: Snake[] = [];
        for (const snake of loadedSnakes) {
          const legacy = snake.weightHistory ?? [];
          let canonical = await getSnakeWeights(user.uid, snake.id);
          if (canonical.length === 0 && legacy.length > 0) canonical = await migrateEmbeddedWeights(user.uid, snake.id, legacy);
          if (canonical.length > 0 || (snake.weight ?? 0) > 0) {
            nextSnakes.push(snake);
            nextWeights[snake.id] = canonical;
          }
        }
        setSnakes(nextSnakes);
        setWeightsBySnake(nextWeights);
        setError(null);
      } catch (err) {
        console.error("Tiny Titans: unable to load weight records", err);
        setError("Unable to load weight records. Please try again.");
      } finally { setLoadingSnakes(false); }
    }
    void loadSnakes();
  }, [user, loading, profileLoading]);

  if (loading || profileLoading || loadingSnakes) return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><div className="tracker-card"><h3>Loading your Tiny Titans...</h3><p>Fetching canonical weight events from Firebase.</p></div></div>;
  if (error) return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><div className="tracker-card"><h3>{error}</h3><button type="button" onClick={() => navigate("/snakes")}>← Back to My Hoggies</button></div></div>;
  if (snakes.length === 0) return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><div className="tracker-card"><h2>📊 No Weight Records Yet</h2><p>Add a weight record to one of your Tiny Titans and it will appear here.</p><div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="button" onClick={() => navigate("/snakes")}>🐍 View My Hoggies</button><button type="button" onClick={() => navigate("/snakes")}>➕ Add a Snake</button></div></div></div>;

  return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><p>Track the growth of all your Tiny Titans in one place.</p><div className="weight-records-grid">
    {snakes.map((snake) => {
      const history = weightsBySnake[snake.id] ?? [];
      const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latestRecord = sortedHistory[sortedHistory.length - 1];
      const currentWeight = latestRecord?.weight ?? snake.weight ?? 0;
      return <article key={snake.id} className="weight-records-card">
        <div className="weight-records-header">{snake.photo ? <img src={snake.photo} alt={snake.name} className="weight-records-photo" /> : <div className="weight-records-placeholder">🐍</div>}<div><h2>{snake.name}</h2><p>⚖️ <strong>{formatWeight(currentWeight)}</strong></p></div></div>
        <div className="weight-records-chart">{history.length >= 2 ? <WeightMiniChart history={history} /> : <p>Record another weight to build the growth chart.</p>}</div>
        <div className="weight-records-summary"><p>📊 Records: <strong>{history.length}</strong></p><p>📅 Last weighed: <strong>{latestRecord?.date ?? snake.lastWeighedDate ?? "-"}</strong></p></div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}><button type="button" className="weight-records-button" onClick={() => navigate(`/weights/${snake.id}`)}>📈 Open Weight Records</button><button type="button" onClick={() => navigate(`/snakes/${snake.id}/master-record`)}>🐍 Master Record</button></div>
      </article>;
    })}
  </div></div>;
}
export default WeightIndex;
