import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { findSnakeSpecies, INITIAL_SNAKE_SPECIES } from "../data/species/speciesRegistry";

const STORAGE_KEY = "tiny-titans:selected-species:v1";
const DEFAULT_SPECIES_ID = "heterodon-nasicus";

type SpeciesContextValue = {
  selectedSpeciesId: string;
  selectedSpecies: ReturnType<typeof findSnakeSpecies>;
  setSelectedSpeciesId: (speciesId: string) => void;
};

const SpeciesContext = createContext<SpeciesContextValue | null>(null);

function readStoredSpecies(): string {
  if (typeof window === "undefined") return DEFAULT_SPECIES_ID;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && findSnakeSpecies(stored) ? stored : DEFAULT_SPECIES_ID;
  } catch {
    return DEFAULT_SPECIES_ID;
  }
}

export function SpeciesContextProvider({ children }: { children: ReactNode }) {
  const [selectedSpeciesId, setSelectedSpeciesIdState] = useState(readStoredSpecies);

  const setSelectedSpeciesId = (speciesId: string) => {
    if (!findSnakeSpecies(speciesId)) return;
    setSelectedSpeciesIdState(speciesId);
    try {
      window.localStorage.setItem(STORAGE_KEY, speciesId);
    } catch {
      // Storage is an enhancement; species selection still works for the session.
    }
  };

  useEffect(() => {
    if (!findSnakeSpecies(selectedSpeciesId)) setSelectedSpeciesIdState(DEFAULT_SPECIES_ID);
  }, [selectedSpeciesId]);

  const value = useMemo(() => ({
    selectedSpeciesId,
    selectedSpecies: findSnakeSpecies(selectedSpeciesId),
    setSelectedSpeciesId,
  }), [selectedSpeciesId]);

  return <SpeciesContext.Provider value={value}>{children}</SpeciesContext.Provider>;
}

export function useSpeciesContext(): SpeciesContextValue {
  const context = useContext(SpeciesContext);
  if (!context) throw new Error("useSpeciesContext must be used inside SpeciesContextProvider");
  return context;
}

export const speciesContextDefaultId = DEFAULT_SPECIES_ID;
export const speciesContextCount = INITIAL_SNAKE_SPECIES.length;
