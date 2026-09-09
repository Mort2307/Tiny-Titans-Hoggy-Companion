import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDetectedTimezone, getWorldTimeSnapshot, type WorldTimeSnapshot } from "../services/worldTimeService";

const WorldTimeContext = createContext<WorldTimeSnapshot | null>(null);

type Props = { children: ReactNode };

export function WorldTimeProvider({ children }: Props) {
  const [snapshot, setSnapshot] = useState<WorldTimeSnapshot>(() => getWorldTimeSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(getWorldTimeSnapshot(new Date(), getDetectedTimezone()));
    const interval = window.setInterval(refresh, 1000);
    const heartbeat = window.setInterval(refresh, 5 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    const onFocus = () => refresh();
    const onOnline = () => refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    refresh();
    return () => {
      window.clearInterval(interval);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const value = useMemo(() => snapshot, [snapshot]);
  return <WorldTimeContext.Provider value={value}>{children}</WorldTimeContext.Provider>;
}

export function useWorldTime(): WorldTimeSnapshot {
  const value = useContext(WorldTimeContext);
  if (!value) throw new Error("useWorldTime must be used inside WorldTimeProvider");
  return value;
}
