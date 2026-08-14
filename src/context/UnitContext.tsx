import { createContext, useContext, useMemo, type ReactNode } from "react";
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

export function UnitProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const system: UnitSystem = profile?.unitSystem ?? "metric";
  const value = useMemo<UnitContextValue>(() => ({
    system,
    isImperial: system === "imperial",
    weightUnit: system === "imperial" ? "oz" : "g",
    lengthUnit: system === "imperial" ? "in" : "cm",
    temperatureUnit: system === "imperial" ? "°F" : "°C",
    formatWeight: (grams, decimals = 1) => grams == null || Number.isNaN(grams) ? "—" : `${round(system === "imperial" ? grams / 28.349523125 : grams, decimals)} ${system === "imperial" ? "oz" : "g"}`,
    formatLength: (cm, decimals = 1) => cm == null || Number.isNaN(cm) ? "—" : `${round(system === "imperial" ? cm / 2.54 : cm, decimals)} ${system === "imperial" ? "in" : "cm"}`,
    formatTemperature: (celsius, decimals = 1) => celsius == null || Number.isNaN(celsius) ? "—" : `${round(system === "imperial" ? (celsius * 9) / 5 + 32 : celsius, decimals)} ${system === "imperial" ? "°F" : "°C"}`,
  }), [system]);
  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnits() {
  const value = useContext(UnitContext);
  if (!value) throw new Error("useUnits must be used inside UnitProvider");
  return value;
}
