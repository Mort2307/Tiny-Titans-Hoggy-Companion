import { createContext, useContext } from "react";
<<<<<<< HEAD
export type UnitSystem = "metric" | "imperial"; export type UnitContextValue = { system:UnitSystem; isImperial:boolean; formatWeight:(grams:number|null|undefined,decimals?:number)=>string; formatLength:(cm:number|null|undefined,decimals?:number)=>string; formatTemperature:(celsius:number|null|undefined,decimals?:number)=>string; weightUnit:"g"|"kg"|"oz"|"lb"; lengthUnit:"cm"|"in"; temperatureUnit:"°C"|"°F" }; export const UnitContext=createContext<UnitContextValue|null>(null); export function useUnits(){const value=useContext(UnitContext);if(!value)throw new Error("useUnits must be used inside UnitProvider");return value;}
=======
export type UnitSystem = "metric" | "imperial";
export type UnitContextValue = { system: UnitSystem; isImperial: boolean; formatWeight: (grams: number | null | undefined, decimals?: number) => string; formatLength: (cm: number | null | undefined, decimals?: number) => string; formatTemperature: (celsius: number | null | undefined, decimals?: number) => string; weightUnit: "g" | "kg" | "oz" | "lb"; lengthUnit: "cm" | "in"; temperatureUnit: "°C" | "°F" };
export const UnitContext = createContext<UnitContextValue | null>(null);
export function useUnits() { const value = useContext(UnitContext); if (!value) throw new Error("useUnits must be used inside UnitProvider"); return value; }
>>>>>>> origin/master
