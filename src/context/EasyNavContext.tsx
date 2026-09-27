import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { TINY_TITANS_OWNER_EMAIL } from "../services/capabilityService";
import { loadEasyNavPreferences, saveEasyNavPreferences } from "../services/easyNavService";
import { defaultEasyNavPreferences, sanitiseEasyNavPreferences } from "../lib/easyNav";
import {
  DEFAULT_SLICES, DEFAULT_WEEK_START, DEFAULT_WEEKLY_METRICS, MAX_SLICES, MAX_WEEKLY_METRICS,
  MIN_SLICES, MIN_WEEKLY_METRICS, TITAN_AT_A_GLANCE_OPTIONS, TITAN_WEEKLY_METRIC_OPTIONS, WEEK_START_OPTIONS,
} from "../config/easyNav";
export type { EasyNavMode, WeekStartDay, TitanWeeklyMetricId, TitanAtAGlanceSliceId } from "../types/easyNav";

export { DEFAULT_SLICES, DEFAULT_WEEK_START, DEFAULT_WEEKLY_METRICS, MAX_SLICES, MAX_WEEKLY_METRICS, MIN_SLICES, MIN_WEEKLY_METRICS, TITAN_AT_A_GLANCE_OPTIONS, TITAN_WEEKLY_METRIC_OPTIONS, WEEK_START_OPTIONS };

export type EasyNavContextValue = {
  mode: import("../types/easyNav").EasyNavMode;
  slices: import("../types/easyNav").TitanAtAGlanceSliceId[];
  weekStartDay: import("../types/easyNav").WeekStartDay;
  weeklyMetrics: import("../types/easyNav").TitanWeeklyMetricId[];
  loading: boolean;
  isEasyNav: true;
  setSlices: (slices: import("../types/easyNav").TitanAtAGlanceSliceId[]) => Promise<void>;
  setWeekStartDay: (day: import("../types/easyNav").WeekStartDay) => Promise<void>;
  setWeeklyMetrics: (metrics: import("../types/easyNav").TitanWeeklyMetricId[]) => Promise<void>;
  resetSlices: () => Promise<void>;
  resetWeeklyPreferences: () => Promise<void>;
};

const EasyNavContext = createContext<EasyNavContextValue | undefined>(undefined);
const isCreatorAccount = (email: string | null | undefined) =>
  String(email || "").trim().toLowerCase() === TINY_TITANS_OWNER_EMAIL;

export function EasyNavProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const creatorAccess = isCreatorAccount(user?.email);
  const [preferences, setPreferences] = useState(() => defaultEasyNavPreferences());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setPreferences(defaultEasyNavPreferences());
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    void loadEasyNavPreferences(user.uid)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          setPreferences(sanitiseEasyNavPreferences(raw, creatorAccess));
          return;
        }
        setPreferences(defaultEasyNavPreferences());
      })
      .catch(() => {
        if (!active) return;
        try {
          const cached = window.localStorage.getItem(`tinytitans:easy-nav:${user.uid}`);
          if (cached) setPreferences(sanitiseEasyNavPreferences(JSON.parse(cached), creatorAccess));
        } catch { /* local storage is a convenience cache only */ }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user, creatorAccess]);

  const persist = useCallback(async (
    next: import("../types/easyNav").EasyNavPreferences,
  ) => {
    if (!user) return;
    const clean = sanitiseEasyNavPreferences(next, creatorAccess);
    setPreferences(clean);
    const cachePayload = JSON.stringify(clean);
    try {
      await saveEasyNavPreferences(user.uid, clean);
    } finally {
      try { window.localStorage.setItem(`tinytitans:easy-nav:${user.uid}`, cachePayload); } catch { /* optional cache */ }
    }
  }, [creatorAccess, user]);

  const value = useMemo<EasyNavContextValue>(() => ({
    ...preferences,
    loading,
    isEasyNav: true,
    setSlices: (slices) => persist({ ...preferences, slices }),
    setWeekStartDay: (weekStartDay) => persist({ ...preferences, weekStartDay }),
    setWeeklyMetrics: (weeklyMetrics) => persist({ ...preferences, weeklyMetrics }),
    resetSlices: () => persist({ ...preferences, slices: [...DEFAULT_SLICES] }),
    resetWeeklyPreferences: () => persist({ ...preferences, weekStartDay: DEFAULT_WEEK_START, weeklyMetrics: [...DEFAULT_WEEKLY_METRICS] }),
  }), [loading, persist, preferences]);

  return <EasyNavContext.Provider value={value}>{children}</EasyNavContext.Provider>;
}

export function useEasyNav(): EasyNavContextValue {
  const context = useContext(EasyNavContext);
  if (!context) throw new Error("useEasyNav must be used within EasyNavProvider");
  return context;
}
