import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "./useAuth";
import app from "../firebase/config";

export type EasyNavMode = "standard" | "easy";
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
  | "account";

export const TITAN_AT_A_GLANCE_OPTIONS: Array<{ id: TitanAtAGlanceSliceId; label: string; icon: string; description: string }> = [
  { id: "feed", label: "Last Feed", icon: "🍽️", description: "See the latest feeding event and log the next one." },
  { id: "weight", label: "Last Weight", icon: "⚖️", description: "See current weight and open weight recording." },
  { id: "shed", label: "Last Shed", icon: "🐍", description: "See the latest shed status and open Shed Intelligence." },
  { id: "reminders", label: "Reminders", icon: "🔔", description: "See what's due next and manage reminders." },
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

const DEFAULT_SLICES: TitanAtAGlanceSliceId[] = ["feed", "weight", "shed", "reminders"];
const MIN_SLICES = 4;
const MAX_SLICES = 6;
const db = getFirestore(app);

type EasyNavContextValue = {
  mode: EasyNavMode;
  slices: TitanAtAGlanceSliceId[];
  loading: boolean;
  isEasyNav: boolean;
  setMode: (mode: EasyNavMode) => Promise<void>;
  setSlices: (slices: TitanAtAGlanceSliceId[]) => Promise<void>;
  resetSlices: () => Promise<void>;
};

const EasyNavContext = createContext<EasyNavContextValue | undefined>(undefined);

function sanitiseSlices(value: unknown): TitanAtAGlanceSliceId[] {
  if (!Array.isArray(value)) return DEFAULT_SLICES;
  const allowed = new Set<TitanAtAGlanceSliceId>(TITAN_AT_A_GLANCE_OPTIONS.map((option) => option.id));
  const unique = value.filter((item): item is TitanAtAGlanceSliceId => typeof item === "string" && allowed.has(item as TitanAtAGlanceSliceId));
  const result = [...new Set(unique)].slice(0, MAX_SLICES);
  if (result.length < MIN_SLICES) return DEFAULT_SLICES;
  return result;
}

function sanitiseMode(value: unknown): EasyNavMode {
  return value === "easy" ? "easy" : "standard";
}

export function EasyNavProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<EasyNavMode>("standard");
  const [slices, setSlicesState] = useState<TitanAtAGlanceSliceId[]>(DEFAULT_SLICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setModeState("standard");
      setSlicesState(DEFAULT_SLICES);
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
      } else {
        setModeState("standard");
        setSlicesState(DEFAULT_SLICES);
      }
    }).catch(() => {
      if (!active) return;
      try {
        const cached = window.localStorage.getItem(`tinytitans:easy-nav:${user.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached) as Record<string, unknown>;
          setModeState(sanitiseMode(parsed.mode));
          setSlicesState(sanitiseSlices(parsed.slices));
        }
      } catch { /* local storage is a convenience cache only */ }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  async function persist(nextMode: EasyNavMode, nextSlices: TitanAtAGlanceSliceId[]) {
    if (!user) return;
    const cleanSlices = sanitiseSlices(nextSlices);
    setModeState(nextMode);
    setSlicesState(cleanSlices);
    try {
      await setDoc(doc(db, "users", user.uid), {
        easyNavPreferences: {
          mode: nextMode,
          slices: cleanSlices,
          updatedAt: serverTimestamp(),
        },
      }, { merge: true });
    } finally {
      try {
        window.localStorage.setItem(`tinytitans:easy-nav:${user.uid}`, JSON.stringify({ mode: nextMode, slices: cleanSlices }));
      } catch { /* local storage is a convenience cache only */ }
    }
  }

  const value: EasyNavContextValue = {
    mode,
    slices,
    loading,
    isEasyNav: mode === "easy",
    setMode: (nextMode) => persist(nextMode, slices),
    setSlices: (nextSlices) => persist(mode, nextSlices),
    resetSlices: () => persist(mode, DEFAULT_SLICES),
  };

  return <EasyNavContext.Provider value={value}>{children}</EasyNavContext.Provider>;
}

export function useEasyNav(): EasyNavContextValue {
  const context = useContext(EasyNavContext);
  if (!context) throw new Error("useEasyNav must be used within EasyNavProvider");
  return context;
}

export { MIN_SLICES, MAX_SLICES, DEFAULT_SLICES };
