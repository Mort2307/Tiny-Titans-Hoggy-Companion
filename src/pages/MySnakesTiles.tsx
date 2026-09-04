import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import { getUserSnakes } from "../services/snakeService";
import { getHoggieInsight, type HoggieStatus } from "../services/hoggieIntelligence";
import { useAuth } from "../context/useAuth";
import SnakeTile from "../components/SnakeTile";
import "../styles/snake-selector.css";

type SortMode =
  | "name-asc"
  | "name-desc"
  | "newest"
  | "oldest"
  | "hatch-newest"
  | "hatch-oldest"
  | "heaviest"
  | "lightest"
  | "recent-weight"
  | "recent-feed"
  | "recent-shed"
  | "custom";

const SORT_STORAGE_KEY = "tinyTitans.myHoggies.sortMode";
const ORDER_STORAGE_KEY = "tinyTitans.myHoggies.customOrder";
const SORT_MODES: SortMode[] = [
  "name-asc",
  "name-desc",
  "newest",
  "oldest",
  "hatch-newest",
  "hatch-oldest",
  "heaviest",
  "lightest",
  "recent-weight",
  "recent-feed",
  "recent-shed",
  "custom",
];

function dateValue(date?: string): number {
  const value = date ? new Date(date).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function latestRecordDate(records: Array<{ date: string }> | undefined): number {
  return Math.max(0, ...(records ?? []).map((record) => dateValue(record.date)));
}

function compareSnakes(a: Snake, b: Snake, mode: SortMode): number {
  const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
  switch (mode) {
    case "name-desc":
      return -nameCompare;
    case "newest":
      return dateValue(b.acquisitionDate || b.arrivalDate) - dateValue(a.acquisitionDate || a.arrivalDate) || nameCompare;
    case "oldest":
      return dateValue(a.acquisitionDate || a.arrivalDate) - dateValue(b.acquisitionDate || b.arrivalDate) || nameCompare;
    case "hatch-newest":
      return dateValue(b.hatchDate) - dateValue(a.hatchDate) || nameCompare;
    case "hatch-oldest":
      return dateValue(a.hatchDate) - dateValue(b.hatchDate) || nameCompare;
    case "heaviest":
      return (b.weight ?? -Infinity) - (a.weight ?? -Infinity) || nameCompare;
    case "lightest":
      return (a.weight ?? Infinity) - (b.weight ?? Infinity) || nameCompare;
    case "recent-weight":
      return dateValue(b.lastWeighedDate || b.weightHistory?.at(-1)?.date) - dateValue(a.lastWeighedDate || a.weightHistory?.at(-1)?.date) || nameCompare;
    case "recent-feed":
      return latestRecordDate(b.feedingHistory) - latestRecordDate(a.feedingHistory) || nameCompare;
    case "recent-shed":
      return latestRecordDate(b.shedHistory) - latestRecordDate(a.shedHistory) || nameCompare;
    default:
      return nameCompare;
  }
}

function readStoredSort(): SortMode {
  try {
    const value = localStorage.getItem(SORT_STORAGE_KEY) as SortMode | null;
    return value && SORT_MODES.includes(value) ? value : "name-asc";
  } catch {
    return "name-asc";
  }
}

function readStoredOrder(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function statusIcon(status: HoggieStatus): string {
  return status === "good" ? "✓" : status === "attention" ? "⚠️" : "ℹ️";
}

export default function MySnakesTiles() {
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [loadingSnakes, setLoadingSnakes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(() => readStoredSort());
  const [customOrder, setCustomOrder] = useState<string[]>(() => readStoredOrder());
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || profileLoading || !user) return;

    let cancelled = false;
    setLoadingSnakes(true);

    void getUserSnakes(user.uid)
      .then((loadedSnakes) => {
        if (cancelled) return;
        const cleaned = loadedSnakes
          .filter((snake) => Boolean(snake?.id))
          .map((snake) => ({ ...snake, id: String(snake.id).trim() }));
        setSnakes(cleaned);
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

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sortMode);
    } catch {
      /* optional preference */
    }
  }, [sortMode]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(customOrder));
    } catch {
      /* optional preference */
    }
  }, [customOrder]);

  const displayedSnakes = (() => {
    if (sortMode !== "custom") return [...snakes].sort((a, b) => compareSnakes(a, b, sortMode));

    const order = customOrder.filter((id) => snakes.some((snake) => snake.id === id));
    const missing = snakes
      .filter((snake) => !order.includes(snake.id))
      .sort((a, b) => compareSnakes(a, b, "name-asc"));

    return [
      ...order
        .map((id) => snakes.find((snake) => snake.id === id))
        .filter((snake): snake is Snake => Boolean(snake)),
      ...missing,
    ];
  })();

  const attentionCount = snakes.filter((snake) => getHoggieInsight(snake).status === "attention").length;
  const baselineCount = snakes.filter((snake) => getHoggieInsight(snake).status === "info").length;
  const pageLoading = loading || profileLoading || (Boolean(user) && loadingSnakes);

  function moveCustomSnake(sourceId: string, targetId: string) {
    if (!sourceId || sourceId === targetId) return;

    const currentIds = displayedSnakes.map((snake) => snake.id);
    const sourceIndex = currentIds.indexOf(sourceId);
    const targetIndex = currentIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...currentIds];
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, sourceId);
    setCustomOrder(next);
  }

  if (pageLoading) {
    return (
      <section className="my-snakes-collection" aria-live="polite">
        <div className="tracker-card">
          <h2>Loading your Tiny Titans…</h2>
          <p>Fetching your snake profiles and keeper records.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="my-snakes-collection">
        <div className="tracker-card" role="alert">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </section>
    );
  }

  if (snakes.length === 0) {
    return (
      <section className="my-snakes-collection">
        <div className="tracker-card my-snakes-empty-state">
          <div className="my-snakes-empty-icon" aria-hidden="true">🐍</div>
          <h2>No snakes added yet</h2>
          <p>Add your first Tiny Titan to start building their profile, tracking records and using the intelligent husbandry tools.</p>
          <button type="button" className="add-snake-button" onClick={() => navigate("/snakes/new")}>+ Add Your First Snake</button>
        </div>
      </section>
    );
  }

  return (
    <section className="my-snakes-collection" aria-labelledby="my-snakes-collection-title">
      <div className="my-snakes-collection-heading">
        <div>
          <p className="tt-eyebrow">Your collection</p>
          <h2 id="my-snakes-collection-title">Choose a Titan</h2>
          <p>Select any snake to open their complete profile.</p>
        </div>
        <div className="hoggie-intelligence-summary" aria-label="Collection overview">
          <strong>{snakes.length} Titan{snakes.length === 1 ? "" : "s"}</strong>
          <span>{attentionCount ? `⚠️ ${attentionCount} worth checking` : "✓ Nothing currently needs attention"}</span>
          {baselineCount > 0 && <span>ℹ️ {baselineCount} still building a baseline</span>}
        </div>
      </div>

      <div className="hoggie-sort-bar">
        <label htmlFor="hoggie-sort">↕ Sort My Titans</label>
        <select id="hoggie-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="newest">Newest Added</option>
          <option value="oldest">Oldest Added</option>
          <option value="hatch-newest">Hatch Date — Newest</option>
          <option value="hatch-oldest">Hatch Date — Oldest</option>
          <option value="heaviest">Heaviest → Lightest</option>
          <option value="lightest">Lightest → Heaviest</option>
          <option value="recent-weight">Recently Weighed</option>
          <option value="recent-feed">Recently Fed</option>
          <option value="recent-shed">Recently Shed</option>
          <option value="custom">Custom Order</option>
        </select>
      </div>

      {sortMode === "custom" && (
        <p className="hoggie-sort-help">Drag a Titan onto another Titan to change the order. Your custom order is remembered on this device.</p>
      )}

      <div className="snake-selector-row" aria-label="Your Tiny Titans">
        {displayedSnakes.map((snake) => {
          const snakeId = String(snake.id ?? "").trim();
          if (!snakeId) return null;
          const insight = getHoggieInsight(snake);

          return (
            <div
              key={snakeId}
              className={`hoggie-selector-item hoggie-status-${insight.status}`}
              draggable={sortMode === "custom"}
              onDragStart={() => setDraggedId(snakeId)}
              onDragOver={(event) => {
                if (sortMode === "custom") event.preventDefault();
              }}
              onDrop={() => {
                if (sortMode === "custom" && draggedId) moveCustomSnake(draggedId, snakeId);
                setDraggedId(null);
              }}
              onDragEnd={() => setDraggedId(null)}
            >
              <SnakeTile
                id={snakeId}
                name={snake.name}
                photo={snake.photo}
                sex={snake.sex}
                snake={{ ...snake, id: snakeId }}
              />
              <span
                className="hoggie-status-indicator"
                title={insight.detail}
                aria-label={`${insight.label}: ${insight.detail}`}
              >
                {statusIcon(insight.status)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
