import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import WeightMiniChart from "../components/WeightMiniChart";
import type { Snake } from "../types/Snake";
import { getUserSnakes } from "../services/snakeService";
import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";

function WeightIndex() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSnakes() {
      if (loading || profileLoading) return;
      if (!user) { setError("You must be logged in to view weight records."); setLoadingSnakes(false); return; }
      try {
        const loadedSnakes = await getUserSnakes(user.uid);
        setSnakes(loadedSnakes.filter((snake) => (snake.weightHistory?.length ?? 0) > 0 || (snake.weight ?? 0) > 0));
        setError(null);
      } catch (err) {
        console.error("Tiny Titans: unable to load weight records", err);
        setError("Unable to load weight records. Please try again.");
      } finally { setLoadingSnakes(false); }
    }
    void loadSnakes();
  }, [user, loading, profileLoading]);

  if (loading || profileLoading || loadingSnakes) return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><div className="tracker-card"><h3>Loading your Tiny Titans...</h3><p>Fetching weight records from Firebase.</p></div></div>;
  if (error) return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><div className="tracker-card"><h3>{error}</h3><button type="button" onClick={() => navigate("/snakes")}>← Back to My Hoggies</button></div></div>;
  if (snakes.length === 0) return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><div className="tracker-card"><h2>📊 No Weight Records Yet</h2><p>Add a weight record to one of your Tiny Titans and it will appear here.</p><button type="button" onClick={() => navigate("/snakes")}>🐍 View My Hoggies</button></div></div>;

  return <div className="page-container"><BackHomeButton /><h1>⚖️ Weight Records</h1><p>Track the growth of all your Tiny Titans in one place.</p><div className="weight-records-grid">
    {snakes.map((snake) => {
      const history = snake.weightHistory ?? [];
      const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latestRecord = sortedHistory[sortedHistory.length - 1];
      const currentWeight = snake.weight ?? latestRecord?.weight ?? 0;
      return <article key={snake.id} className="weight-records-card">
        <div className="weight-records-header">{snake.photo ? <img src={snake.photo} alt={snake.name} className="weight-records-photo" /> : <div className="weight-records-placeholder">🐍</div>}<div><h2>{snake.name}</h2><p>⚖️ <strong>{formatWeight(currentWeight)}</strong></p></div></div>
        <div className="weight-records-chart"><WeightMiniChart history={history} /></div>
        <div className="weight-records-summary"><p>📊 Records: <strong>{history.length}</strong></p><p>📅 Last weighed: <strong>{snake.lastWeighedDate ?? latestRecord?.date ?? "-"}</strong></p></div>
        <button type="button" className="weight-records-button" onClick={() => navigate(`/weights/${snake.id}`)}>📈 Open Weight Records</button>
      </article>;
    })}
  </div></div>;
}
export default WeightIndex;
