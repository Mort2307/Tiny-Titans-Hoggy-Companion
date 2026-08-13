import { useEffect, useMemo, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import FeedingAdvisorCard from "../components/FeedingAdvisorCard";
import { useAuth } from "../context/AuthContext";
import { getSnakeFeedings } from "../services/feedingService";
import { getUserSnakes } from "../services/snakeService";
import type { FeedingRecord } from "../types/Feeding";
import type { Snake } from "../types/Snake";

export default function FeedingAdvisor() {
  const { user, loading, profileLoading } = useAuth();
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedSnakeId, setSelectedSnakeId] = useState("");
  const [feedings, setFeedings] = useState<FeedingRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) { setSnakes([]); setSelectedSnakeId(""); setLoadingData(false); return; }
    let cancelled = false;
    void getUserSnakes(user.uid).then((loaded) => {
      if (cancelled) return;
      const valid = loaded.filter((snake) => Boolean(snake?.id));
      setSnakes(valid);
      setSelectedSnakeId((current) => valid.some((snake) => snake.id === current) ? current : valid[0]?.id ?? "");
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load your snakes.");
    }).finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [user, loading, profileLoading]);

  useEffect(() => {
    if (!user || !selectedSnakeId) { setFeedings([]); return; }
    let cancelled = false;
    void getSnakeFeedings(user.uid, selectedSnakeId).then((history) => {
      if (!cancelled) setFeedings(history);
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load feeding history.");
    });
    return () => { cancelled = true; };
  }, [user, selectedSnakeId]);

  const selectedSnake = useMemo(() => snakes.find((snake) => snake.id === selectedSnakeId), [snakes, selectedSnakeId]);

  return (
    <main className="page-container feeding-advisor-page">
      <BackHomeButton />
      <header className="page-header">
        <p className="creator-dashboard__eyebrow">Husbandry</p>
        <h1>Individual Feeding Advisor</h1>
        <p>Recommendations use the individual snake's recorded history, not morph or a one-size-fits-all formula.</p>
      </header>
      {loadingData && <p role="status">Loading your snakes…</p>}
      {error && <p role="alert">{error}</p>}
      {!loadingData && snakes.length === 0 && <section className="welcome-card"><h2>Add a snake first</h2><p>Tiny Titans needs an individual profile before it can assess feeding history.</p></section>}
      {snakes.length > 0 && <>
        <label className="feeding-advisor-page__selector"><span>Snake</span><select value={selectedSnakeId} onChange={(event) => setSelectedSnakeId(event.target.value)}>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>
        {selectedSnake && <FeedingAdvisorCard snake={selectedSnake} feedings={feedings} />}
      </>}
    </main>
  );
}
