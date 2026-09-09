import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDetectedTimezone, getWorldTimeSnapshot, type WorldTimeSnapshot } from "../services/worldTimeService";

type WorldTimeContextValue = { timezone: string; snapshot: WorldTimeSnapshot; refresh: () => void };
const WorldTimeContext = createContext<WorldTimeContextValue | null>(null);
type Props = { children: ReactNode };

export function WorldTimeProvider({ children }: Props) {
  const [snapshot, setSnapshot] = useState<WorldTimeSnapshot>(() => getWorldTimeSnapshot());
  const refresh = () => setSnapshot(getWorldTimeSnapshot(new Date(), getDetectedTimezone()));

  useEffect(() => {
    const heartbeat = window.setInterval(refresh, 5 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    const onFocus = () => refresh();
    const onOnline = () => refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    refresh();
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const value = useMemo(() => ({ timezone: snapshot.timezone, snapshot, refresh }), [snapshot, refresh]);
  return <WorldTimeContext.Provider value={value}>{children}</WorldTimeContext.Provider>;
}

export function useWorldTime(): WorldTimeSnapshot {
  const context = useContext(WorldTimeContext);
  if (!context) throw new Error("useWorldTime must be used inside WorldTimeProvider");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return getWorldTimeSnapshot(now, context.timezone);
}
