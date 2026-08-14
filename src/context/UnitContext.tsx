import { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

export type UnitSystem = "metric" | "imperial";

type UnitContextValue = {
  system: UnitSystem;
  isImperial: boolean;
  formatWeight: (grams: number | null | undefined, decimals?: number) => string;
  formatLength: (cm: number | null | undefined, decimals?: number) => string;
  formatTemperature: (celsius: number | null | undefined, decimals?: number) => string;
  weightUnit: "g" | "oz";
  lengthUnit: "cm" | "in";
  temperatureUnit: "°C" | "°F";
};

const UnitContext = createContext<UnitContextValue | null>(null);

const round = (value: number, decimals: number) => Number(value.toFixed(decimals));

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const system: UnitSystem = (profile as { unitSystem?: UnitSystem } | null)?.unitSystem === "imperial" ? "imperial" : "metric";

  const value = useMemo<UnitContextValue>(() => ({
    system,
    isImperial: system === "imperial",
    weightUnit: system === "imperial" ? "oz" : "g",
    lengthUnit: system === "imperial" ? "in" : "cm",
    temperatureUnit: system === "imperial" ? "°F" : "°C",
    formatWeight: (grams, decimals = 1) => {
      if (grams == null || Number.isNaN(grams)) return "—";
      if (system === "imperial") return `${round(grams / 28.349523125, decimals)} oz`;
      return `${round(grams, decimals)} g`;
    },
    formatLength: (cm, decimals = 1) => {
      if (cm == null || Number.isNaN(cm)) return "—";
      if (system === "imperial") return `${round(cm / 2.54, decimals)} in`;
      return `${round(cm, decimals)} cm`;
    },
    formatTemperature: (celsius, decimals = 1) => {
      if (celsius == null || Number.isNaN(celsius)) return "—";
      if (system === "imperial") return `${round((celsius * 9) / 5 + 32, decimals)} °F`;
      return `${round(celsius, decimals)} °C`;
    },
  }), [system]);

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnits() {
  const value = useContext(UnitContext);
  if (!value) throw new Error("useUnits must be used inside UnitProvider");
  return value;
}
