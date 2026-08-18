import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import type { FeedingRecord } from "../types/Feeding";
import type { ShedRecord } from "../types/Shed";
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
    const x = clean.length === 1 ? 50 : (index / (clean.length - 1)) * 100;
    const y = 38 - ((value - min) / range) * 30;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <svg className="snake-mini-graph" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function weightValues(history: WeightRecord[]): number[] {
  return [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-8)
    .map((record) => record.unit === "kg" ? record.weight * 1000 : record.weight);
}

function intervalValues(records: Array<{ date: string }>): number[] {
  const dates = records
    .map((record) => new Date(record.date).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .slice(-9);

  return dates.slice(1).map((date, index) => Math.max(0, (date - dates[index]) / 86400000));
}

function MySnakes() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const { formatWeight } = useUnits();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnake, setSelectedSnake] = useState<Snake | null>(null);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || profileLoading || !user) return;

    let cancelled = false;

    void getUserSnakes(user.uid)
      .then((loadedSnakes) => {
        if (cancelled) return;
        const validSnakes = loadedSnakes
          .filter((snake) => Boolean(snake?.id))
          .map((snake) => ({ ...snake, id: String(snake.id).trim() }));
        setSnakes(validSnakes);
        setSelectedSnake((current) => current ? validSnakes.find((snake) => snake.id === current.id) ?? null : null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Tiny Titans: unable to load snakes", err);
          setError(err instanceof Error ? err.message : "Unable to load your snakes. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSnakes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, profileLoading]);

  function closePanel() {
    setSelectedSnake(null);
  }

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

  const trackerData = useMemo(() => {
    if (!selectedSnake) return null;
    const weights = selectedSnake.weightHistory ?? [];
    const feedings = selectedSnake.feedingHistory ?? [];
    const sheds = selectedSnake.shedHistory ?? [];
    return {
      weights,
      feedings,
      sheds,
      weightGraph: weightValues(weights),
      feedingGraph: intervalValues(feedings),
      shedGraph: intervalValues(sheds),
    };
  }, [selectedSnake]);

  const pageLoading = loading || profileLoading || (Boolean(user) && loadingSnakes);

  if (loading || profileLoading) {
    return (
      <div className="page-container">
        <BackHomeButton />
        <h1>🐍 My Hoggies</h1>
        <div className="tracker-card">
          <h3>Loading your Tiny Titans...</h3>
          <p>Connecting to your Tiny Titans account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <BackHomeButton />
      <h1>🐍 My Hoggies</h1>
      <p className="page-subtitle">Choose a Tiny Titan to open their trackers.</p>
      <button type="button" className="add-snake-button" onClick={() => navigate("/snakes/new")}>
        ➕ Add Snake
      </button>
      {pageLoading && (
        <div className="tracker-card">
          <h3>Loading your snakes...</h3>
          <p>Please wait while Tiny Titans retrieves your records.</p>
        </div>
      )}
      {error && (
        <div className="tracker-card">
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Try Again</button>
        </div>
      )}
      {!pageLoading && !error && snakes.length === 0 && (
        <div className="tracker-card">
          <h3>No snakes added yet 🐍</h3>
          <p>Add your first Tiny Titan to begin tracking weights, feeding, sheds and genetics.</p>
          <button type="button" className="add-snake-button" onClick={() => navigate("/snakes/new")}>➕ Add Your First Snake</button>
        </div>
      )}
      {!pageLoading && !error && snakes.length > 0 && (
        <div className="snake-grid snake-circle-grid">
          {snakes.map((snake) => {
            const snakeId = String(snake.id ?? "").trim();
            if (!snakeId) return null;
            return (
              <SnakeTile
                key={snakeId}
                id={snakeId}
                name={snake.name}
                photo={snake.photo}
                sex={snake.sex}
                snake={{ ...snake, id: snakeId }}
                onSelect={setSelectedSnake}
              />
            );
          })}
        </div>
      )}
      {selectedSnake && trackerData && (
        <div
          className="snake-tracker-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePanel();
          }}
        >
          <aside className="snake-tracker-panel" role="dialog" aria-modal="true" aria-label={`${selectedSnake.name} tracker menu`}>
            <button type="button" className="snake-panel-close" onClick={closePanel} aria-label="Close tracker menu">×</button>
            <div className="snake-panel-identity">
              <span className="snake-panel-avatar">
                {selectedSnake.photo ? <img src={selectedSnake.photo} alt={selectedSnake.name} /> : <span>🐍</span>}
              </span>
              <div>
                <h2>{selectedSnake.name}</h2>
                <p>{selectedSnake.sex ?? "Unknown sex"}</p>
              </div>
            </div>

            <div className="snake-quick-tracker-bar" aria-label={`${selectedSnake.name} tracker summary`}>
              <button type="button" className="snake-quick-tracker" onClick={() => openTracker("/weights")}>
                <span className="snake-quick-tracker-title">⚖️ Weight</span>
                <Sparkline values={trackerData.weightGraph} emptyLabel="Add 2+ weights" />
                <strong>{selectedSnake.weight != null ? formatWeight(selectedSnake.weight) : "—"}</strong>
                <small>{trackerData.weights.length} record{trackerData.weights.length === 1 ? "" : "s"}</small>
              </button>

              <button type="button" className="snake-quick-tracker" onClick={() => openTracker("/feeding")}>
                <span className="snake-quick-tracker-title">🍽️ Feeding</span>
                <Sparkline values={trackerData.feedingGraph} emptyLabel="Add 2+ feeds" />
                <strong>{trackerData.feedings.length}</strong>
                <small>feed{trackerData.feedings.length === 1 ? "" : "s"} logged</small>
              </button>

              <button type="button" className="snake-quick-tracker" onClick={() => openTracker("/shedding")}>
                <span className="snake-quick-tracker-title">🐍 Sheds</span>
                <Sparkline values={trackerData.shedGraph} emptyLabel="Add 2+ sheds" />
                <strong>{trackerData.sheds.length}</strong>
                <small>shed{trackerData.sheds.length === 1 ? "" : "s"} logged</small>
              </button>
            </div>

            <div className="snake-panel-actions snake-panel-secondary-actions">
              <button type="button" onClick={openProfile}>🐍 View Full Profile</button>
              <button type="button" onClick={openEditor}>✏️ Edit Snake</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default MySnakes;
