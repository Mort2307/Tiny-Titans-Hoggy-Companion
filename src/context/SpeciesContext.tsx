import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { findSnakeSpecies, SNAKE_SPECIES_BY_ID } from "../data/species/speciesRegistry";
import { findUniversalSpecies, UNIVERSAL_SPECIES } from "../data/species/universalSpeciesRegistry";

const STORAGE_KEY = "tiny-titans:selected-species:v3";
const LEGACY_STORAGE_KEY = "tiny-titans:selected-species:v2";
const DEFAULT_SPECIES_ID = "";

type SpeciesContextValue = {
  selectedSpeciesId: string;
  selectedSpecies: ReturnType<typeof findSnakeSpecies>;
  selectedUniversalSpecies: ReturnType<typeof findUniversalSpecies>;
  setSelectedSpeciesId: (speciesId: string) => void;
};

const SpeciesContext = createContext<SpeciesContextValue | null>(null);

function readStoredSpecies(): string {
  if (typeof window === "undefined") return DEFAULT_SPECIES_ID;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const species = stored ? findUniversalSpecies(stored) : undefined;
    return species?.id ?? DEFAULT_SPECIES_ID;
  } catch {
    return DEFAULT_SPECIES_ID;
  }
}

export function SpeciesContextProvider({ children }: { children: ReactNode }) {
  const [selectedSpeciesId, setSelectedSpeciesIdState] = useState(readStoredSpecies);

  const setSelectedSpeciesId = (speciesId: string) => {
    if (!speciesId) {
      setSelectedSpeciesIdState(DEFAULT_SPECIES_ID);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage is an enhancement; species selection still works for the session.
      }
      return;
    }
    const species = findUniversalSpecies(speciesId);
    if (!species) return;
    setSelectedSpeciesIdState(species.id);
    try {
      window.localStorage.setItem(STORAGE_KEY, species.id);
    } catch {
      // Storage is an enhancement; species selection still works for the session.
    }
  };

  useEffect(() => {
    if (selectedSpeciesId && !findUniversalSpecies(selectedSpeciesId)) setSelectedSpeciesIdState(DEFAULT_SPECIES_ID);
  }, [selectedSpeciesId]);

  const value = useMemo(() => ({
    selectedSpeciesId,
    selectedSpecies: SNAKE_SPECIES_BY_ID[selectedSpeciesId],
    selectedUniversalSpecies: findUniversalSpecies(selectedSpeciesId),
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
export const speciesContextCount = UNIVERSAL_SPECIES.length;
