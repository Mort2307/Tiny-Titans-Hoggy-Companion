import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { getUserSnakes } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import { useUnits } from "../context/UnitContextValue";
import SnakeTile from "../components/SnakeTile";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/snake-selector.css";

type SparklineProps = { values: number[]; emptyLabel: string };

function Sparkline({ values, emptyLabel }: SparklineProps) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < 2) return <div className="snake-mini-graph-empty">{emptyLabel}</div>;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const points = clean.map((value, index) => {
    const x = (index / (clean.length - 1)) * 100;
    const y = 38 - ((value - min) / range) * 30;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return <svg className="snake-mini-graph" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}

function weightValues(history: WeightRecord[]): number[] {
  return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-8).map((record) => record.unit === "kg" ? record.weight * 1000 : record.weight);
}

function intervalValues(records: Array<{ date: string }>): number[] {
  const dates = records.map((record) => new Date(record.date).getTime()).filter(Number.isFinite).sort((a, b) => a - b).slice(-9);
  return dates.slice(1).map((date, index) => Math.max(0, (date - dates[index]) / 86400000));
}

function MySnakes() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || profileLoading || !user) return;
    let cancelled = false;
    void getUserSnakes(user.uid).then((loadedSnakes) => {
      if (cancelled) return;
      const validSnakes = loadedSnakes.filter((snake) => Boolean(snake?.id)).map((snake) => ({ ...snake, id: String(snake.id).trim() }));
      setSnakes(validSnakes);
      setError(null);
    }).catch((err) => {
      if (!cancelled) {
        console.error("Tiny Titans: unable to load snakes", err);
        setError(err instanceof Error ? err.message : "Unable to load your snakes. Please try again.");
      }
    }).finally(() => {
      if (!cancelled) setLoadingSnakes(false);
    });
    return () => { cancelled = true; };
  }, [user, loading, profileLoading]);

  function openTracker(path: string, snakeId: string) { navigate(`${path}/${snakeId}`); }
  function openProfile(snakeId: string) { navigate(`/snakes/${snakeId}`); }
  function openEditor(snakeId: string) { navigate(`/snakes/${snakeId}/edit`); }

  const pageLoading = loading || profileLoading || (Boolean(user) && loadingSnakes);

  if (loading || profileLoading) return <div className="page-container"><BackHomeButton /><h1>🐍 My Hoggies</h1><div className="tracker-card"><h3>Loading your Tiny Titans...</h3><p>Connecting to your Tiny Titans account.</p></div></div>;

  return (
    <div className="page-container">
      <BackHomeButton />
      <h1>🐍 My Hoggies</h1>
      <p className="page-subtitle">Choose a Tiny Titan to open their trackers.</p>
      <button type="button" className="add-snake-button" onClick={() => navigate("/snakes/new")}>➕ Add Snake</button>
      {pageLoading && <div className="tracker-card"><h3>Loading your snakes...</h3><p>Please wait while Tiny Titans retrieves your records.</p></div>}
      {error && <div className="tracker-card"><h3>Something went wrong</h3><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try Again</button></div>}
      {!pageLoading && !error && snakes.length === 0 && <div className="tracker-card"><h3>No snakes added yet 🐍</h3><p>Add your first Tiny Titan to begin tracking weights, feeding, sheds and genetics.</p><button type="button" className="add-snake-button" onClick={() => navigate("/snakes/new")}>➕ Add Your First Snake</button></div>}
      {!pageLoading && !error && snakes.length > 0 && (
        <div className="snake-mini-dashboard-grid">
          {snakes.map((snake) => {
            const snakeId = String(snake.id ?? "").trim();
            if (!snakeId) return null;
            const weights = snake.weightHistory ?? [];
            const feedings = snake.feedingHistory ?? [];
            const sheds = snake.shedHistory ?? [];
            const weightGraph = weightValues(weights);
            const feedingGraph = intervalValues(feedings);
            const shedGraph = intervalValues(sheds);
            return (
              <section className="snake-mini-dashboard" key={snakeId} aria-label={`${snake.name} tracker dashboard`}>
                <SnakeTile key={snakeId} id={snakeId} name={snake.name} photo={snake.photo} sex={snake.sex} snake={{ ...snake, id: snakeId }} onSelect={() => openProfile(snakeId)} />
                <button type="button" className="snake-mini-tracker-card" onClick={() => openTracker("/weights", snakeId)}>
                  <span className="snake-mini-tracker-heading">⚖️ Weight</span>
                  <Sparkline values={weightGraph} emptyLabel="Add 2+ weights" />
                  <strong>{snake.weight != null ? formatWeight(snake.weight) : "—"}</strong>
                  <small>{weights.length} record{weights.length === 1 ? "" : "s"}</small>
                </button>
                <button type="button" className="snake-mini-tracker-card" onClick={() => openTracker("/feeding", snakeId)}>
                  <span className="snake-mini-tracker-heading">🍽️ Feeding</span>
                  <Sparkline values={feedingGraph} emptyLabel="Add 2+ feeds" />
                  <strong>{feedings.length}</strong>
                  <small>feed{feedings.length === 1 ? "" : "s"} logged</small>
                </button>
                <button type="button" className="snake-mini-tracker-card" onClick={() => openTracker("/shedding", snakeId)}>
                  <span className="snake-mini-tracker-heading">🐍 Sheds</span>
                  <Sparkline values={shedGraph} emptyLabel="Add 2+ sheds" />
                  <strong>{sheds.length}</strong>
                  <small>shed{ sheds.length === 1 ? "" : "s"} logged</small>
                </button>
                <div className="snake-mini-dashboard-actions">
                  <button type="button" onClick={() => openProfile(snakeId)}>🐍 Full Profile</button>
                  <button type="button" onClick={() => openEditor(snakeId)}>✏️ Edit</button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MySnakes;
