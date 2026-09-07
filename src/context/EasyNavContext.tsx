import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "./useAuth";
import app from "../firebase/config";

export type EasyNavMode = "standard" | "easy";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TitanWeeklyMetricId = "feed" | "weight" | "shed" | "health" | "behaviour" | "breeding" | "reminders" | "intelligence";
export type TitanAtAGlanceSliceId =
  | "feed"
  | "weight"
  | "shed"
  | "reminders"
  | "health"
  | "behaviour"
  | "husbandry"
  | "intelligence"
  | "genetics"
  | "breeding"
  | "snakes"
  | "learning"
  | "community"
  | "room"
  | "knowledge"
  | "contribution"
  | "goals"
  | "account"
  | "thisWeek";

export const TITAN_AT_A_GLANCE_OPTIONS: Array<{ id: TitanAtAGlanceSliceId; label: string; icon: string; description: string }> = [
  { id: "feed", label: "Last Feed", icon: "🍽️", description: "See the latest feeding event and log the next one." },
  { id: "weight", label: "Last Weight", icon: "⚖️", description: "See current weight and open weight recording." },
  { id: "shed", label: "Last Shed", icon: "🐍", description: "See the latest shed status and open Shed Intelligence." },
  { id: "reminders", label: "Reminders", icon: "🔔", description: "See what's due next and manage reminders." },
  { id: "thisWeek", label: "This Week", icon: "📅", description: "See the current keeper week using your chosen week start." },
  { id: "health", label: "Health", icon: "❤️", description: "Open health and veterinary records." },
  { id: "behaviour", label: "Behaviour", icon: "◉", description: "Open behaviour notes and observations." },
  { id: "husbandry", label: "Husbandry", icon: "🌡️", description: "Open husbandry and environmental care." },
  { id: "intelligence", label: "Titan Intelligence", icon: "🧠", description: "Open the intelligence command centre." },
  { id: "genetics", label: "Genetics", icon: "🧬", description: "Open the Morph Library and genetics tools." },
  { id: "breeding", label: "Breeding", icon: "🥚", description: "Open the breeding planner." },
  { id: "snakes", label: "My Snakes", icon: "🐍", description: "Open your full snake collection." },
  { id: "learning", label: "Learn", icon: "🎓", description: "Continue learning and challenges." },
  { id: "community", label: "Community", icon: "🌍", description: "Open the keeper community." },
  { id: "room", label: "Reptile Room", icon: "▦", description: "Open your reptile room." },
  { id: "knowledge", label: "Knowledge Base", icon: "📚", description: "Find an answer in the knowledge base." },
  { id: "contribution", label: "Contribute", icon: "＋", description: "Make a contribution to Tiny Titans." },
  { id: "goals", label: "Titan Goals", icon: "🎯", description: "See your current Titan goals." },
  { id: "account", label: "Account", icon: "⚙️", description: "Open account and personalisation." },
];

export const TITAN_WEEKLY_METRIC_OPTIONS: Array<{ id: TitanWeeklyMetricId; label: string; icon: string; description: string }> = [
  { id: "feed", label: "Feeding", icon: "🍽️", description: "Feeding events recorded this week." },
  { id: "weight", label: "Weight", icon: "⚖️", description: "Weight records added this week." },
  { id: "shed", label: "Sheds", icon: "🐍", description: "Shed records logged this week." },
  { id: "health", label: "Health", icon: "❤️", description: "Health records logged this week." },
  { id: "behaviour", label: "Behaviour", icon: "◉", description: "Behaviour observations logged this week." },
  { id: "breeding", label: "Breeding", icon: "🥚", description: "Breeding records recorded this week." },
  { id: "reminders", label: "Reminders", icon: "🔔", description: "Review what is due for the current week." },
  { id: "intelligence", label: "Titan Intelligence", icon: "🧠", description: "Show active intelligence context for the current week." },
];

export const WEEK_START_OPTIONS: Array<{ value: WeekStartDay; label: string }> = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_SLICES: TitanAtAGlanceSliceId[] = ["feed", "weight", "shed", "reminders"];
const DEFAULT_WEEK_START: WeekStartDay = 0;
const DEFAULT_WEEKLY_METRICS: TitanWeeklyMetricId[] = ["feed", "weight", "shed", "reminders"];
const MIN_SLICES = 4;
const MAX_SLICES = 6;
const MIN_WEEKLY_METRICS = 2;
const MAX_WEEKLY_METRICS = 6;
const db = getFirestore(app);

type EasyNavContextValue = {
  mode: EasyNavMode;
  slices: TitanAtAGlanceSliceId[];
  weekStartDay: WeekStartDay;
  weeklyMetrics: TitanWeeklyMetricId[];
  loading: boolean;
  isEasyNav: boolean;
  setMode: (mode: EasyNavMode) => Promise<void>;
  setSlices: (slices: TitanAtAGlanceSliceId[]) => Promise<void>;
  setWeekStartDay: (day: WeekStartDay) => Promise<void>;
  setWeeklyMetrics: (metrics: TitanWeeklyMetricId[]) => Promise<void>;
  resetSlices: () => Promise<void>;
  resetWeeklyPreferences: () => Promise<void>;
};

const EasyNavContext = createContext<EasyNavContextValue | undefined>(undefined);

function sanitiseSlices(value: unknown): TitanAtAGlanceSliceId[] {
  if (!Array.isArray(value)) return DEFAULT_SLICES;
  const allowed = new Set<TitanAtAGlanceSliceId>(TITAN_AT_A_GLANCE_OPTIONS.map((option) => option.id));
  const result = [...new Set(value.filter((item): item is TitanAtAGlanceSliceId => typeof item === "string" && allowed.has(item as TitanAtAGlanceSliceId)))].slice(0, MAX_SLICES);
  return result.length < MIN_SLICES ? DEFAULT_SLICES : result;
}

function sanitiseWeekStart(value: unknown): WeekStartDay {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6 ? value as WeekStartDay : DEFAULT_WEEK_START;
}

function sanitiseWeeklyMetrics(value: unknown): TitanWeeklyMetricId[] {
  if (!Array.isArray(value)) return DEFAULT_WEEKLY_METRICS;
  const allowed = new Set<TitanWeeklyMetricId>(TITAN_WEEKLY_METRIC_OPTIONS.map((option) => option.id));
  const result = [...new Set(value.filter((item): item is TitanWeeklyMetricId => typeof item === "string" && allowed.has(item as TitanWeeklyMetricId)))].slice(0, MAX_WEEKLY_METRICS);
  return result.length < MIN_WEEKLY_METRICS ? DEFAULT_WEEKLY_METRICS : result;
}

function sanitiseMode(value: unknown): EasyNavMode {
  return value === "easy" ? "easy" : "standard";
}

export function EasyNavProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<EasyNavMode>("standard");
  const [slices, setSlicesState] = useState<TitanAtAGlanceSliceId[]>(DEFAULT_SLICES);
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>(DEFAULT_WEEK_START);
  const [weeklyMetrics, setWeeklyMetricsState] = useState<TitanWeeklyMetricId[]>(DEFAULT_WEEKLY_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setModeState("standard");
      setSlicesState(DEFAULT_SLICES);
      setWeekStartDayState(DEFAULT_WEEK_START);
      setWeeklyMetricsState(DEFAULT_WEEKLY_METRICS);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void getDoc(doc(db, "users", user.uid)).then((snapshot) => {
      if (!active) return;
      const data = snapshot.exists() ? snapshot.data() : undefined;
      const preferences = data?.easyNavPreferences;
      if (preferences && typeof preferences === "object") {
        const record = preferences as Record<string, unknown>;
        setModeState(sanitiseMode(record.mode));
        setSlicesState(sanitiseSlices(record.slices));
        setWeekStartDayState(sanitiseWeekStart(record.weekStartDay));
        setWeeklyMetricsState(sanitiseWeeklyMetrics(record.weeklyMetrics));
      } else {
        setModeState("standard");
        setSlicesState(DEFAULT_SLICES);
        setWeekStartDayState(DEFAULT_WEEK_START);
        setWeeklyMetricsState(DEFAULT_WEEKLY_METRICS);
      }
    }).catch(() => {
      if (!active) return;
      try {
        const cached = window.localStorage.getItem(`tinytitans:easy-nav:${user.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached) as Record<string, unknown>;
          setModeState(sanitiseMode(parsed.mode));
          setSlicesState(sanitiseSlices(parsed.slices));
          setWeekStartDayState(sanitiseWeekStart(parsed.weekStartDay));
          setWeeklyMetricsState(sanitiseWeeklyMetrics(parsed.weeklyMetrics));
        }
      } catch { /* local storage is a convenience cache only */ }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function persist(nextMode: EasyNavMode, nextSlices: TitanAtAGlanceSliceId[], nextWeekStartDay: WeekStartDay, nextWeeklyMetrics: TitanWeeklyMetricId[]) {
    if (!user) return;
    const cleanSlices = sanitiseSlices(nextSlices);
    const cleanMetrics = sanitiseWeeklyMetrics(nextWeeklyMetrics);
    setModeState(nextMode);
    setSlicesState(cleanSlices);
    setWeekStartDayState(nextWeekStartDay);
    setWeeklyMetricsState(cleanMetrics);
    const cachePayload = JSON.stringify({ mode: nextMode, slices: cleanSlices, weekStartDay: nextWeekStartDay, weeklyMetrics: cleanMetrics });
    try {
      await setDoc(doc(db, "users", user.uid), {
        easyNavPreferences: {
          mode: nextMode,
          slices: cleanSlices,
          weekStartDay: nextWeekStartDay,
          weeklyMetrics: cleanMetrics,
          updatedAt: serverTimestamp(),
        },
      }, { merge: true });
    } finally {
      try { window.localStorage.setItem(`tinytitans:easy-nav:${user.uid}`, cachePayload); } catch { /* local storage is a convenience cache only */ }
    }
  }

  const value: EasyNavContextValue = {
    mode,
    slices,
    weekStartDay,
    weeklyMetrics,
    loading,
    isEasyNav: mode === "easy",
    setMode: (nextMode) => persist(nextMode, slices, weekStartDay, weeklyMetrics),
    setSlices: (nextSlices) => persist(mode, nextSlices, weekStartDay, weeklyMetrics),
    setWeekStartDay: (nextDay) => persist(mode, slices, nextDay, weeklyMetrics),
    setWeeklyMetrics: (nextMetrics) => persist(mode, slices, weekStartDay, nextMetrics),
    resetSlices: () => persist(mode, DEFAULT_SLICES, weekStartDay, weeklyMetrics),
    resetWeeklyPreferences: () => persist(mode, slices, DEFAULT_WEEK_START, DEFAULT_WEEKLY_METRICS),
  };

  return <EasyNavContext.Provider value={value}>{children}</EasyNavContext.Provider>;
}

export function useEasyNav(): EasyNavContextValue {
  const context = useContext(EasyNavContext);
  if (!context) throw new Error("useEasyNav must be used within EasyNavProvider");
  return context;
}

export { MIN_SLICES, MAX_SLICES, MIN_WEEKLY_METRICS, MAX_WEEKLY_METRICS, DEFAULT_SLICES, DEFAULT_WEEK_START, DEFAULT_WEEKLY_METRICS };