import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getSnakeFeedings } from "../services/feedingService";
import type { Snake } from "../types/Snake";
import type { FeedingRecord } from "../types/Feeding";
import { buildSmartSummary } from "../lib/snakeProfileSmartSummary";

export function useSnakeProfileSmartSummary(snake: Snake) {
  const { user } = useAuth();
  const [canonicalFeedings, setCanonicalFeedings] = useState<FeedingRecord[] | null>(null);
  const now = useMemo(() => new Date(), []);
  useEffect(() => {
    let cancelled = false;
    if (!user?.uid || !snake.id) { setCanonicalFeedings(null); return () => undefined; }
    void getSnakeFeedings(user.uid, snake.id)
      .then((records) => { if (!cancelled) setCanonicalFeedings(records); })
      .catch(() => { if (!cancelled) setCanonicalFeedings(null); });
    return () => { cancelled = true; };
  }, [user?.uid, snake.id]);
  const feedings = useMemo(() => {
    const source = canonicalFeedings ?? snake.feedingHistory ?? [];
    return [...source].filter((record) => Number.isFinite(new Date(`${record.date}T00:00:00`).getTime())).sort((a,b)=>b.date.localeCompare(a.date));
  }, [canonicalFeedings, snake.feedingHistory]);
  const data = useMemo(() => buildSmartSummary(snake, now, feedings), [snake, now, feedings]);
  return { now, data };
}