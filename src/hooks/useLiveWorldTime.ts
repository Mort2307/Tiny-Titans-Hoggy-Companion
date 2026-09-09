import { useEffect, useState } from "react";
import { getDetectedTimezone, getWorldTimeSnapshot, type WorldTimeSnapshot } from "../services/worldTimeService";

export function useLiveWorldTime(): WorldTimeSnapshot {
  const [snapshot, setSnapshot] = useState<WorldTimeSnapshot>(() => getWorldTimeSnapshot());

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active) return;
      const timezone = getDetectedTimezone();
      setSnapshot(getWorldTimeSnapshot(new Date(), timezone));
    };
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
      active = false;
      window.clearInterval(interval);
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return snapshot;
}
