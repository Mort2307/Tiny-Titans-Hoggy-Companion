export type RegionCode = "GLOBAL" | "UK" | "USA" | "EUROPE" | "AUSTRALIA";
export type MeasurementSystem = "metric" | "imperial";

export type LocaleProfile = {
  region: RegionCode;
  locale: string;
  language: string;
  measurementSystem: MeasurementSystem;
  temperatureUnit: "celsius" | "fahrenheit";
  weightUnit: "g" | "oz";
  lengthUnit: "cm" | "in";
  volumeUnit: "l" | "gal";
  distanceUnit: "km" | "mi";
  currency: "GBP" | "USD" | "EUR" | "AUD";
};

const REGION_PROFILES: Record<RegionCode, LocaleProfile> = {
  GLOBAL: { region: "GLOBAL", locale: "en-GB", language: "en", measurementSystem: "metric", temperatureUnit: "celsius", weightUnit: "g", lengthUnit: "cm", volumeUnit: "l", distanceUnit: "km", currency: "GBP" },
  UK: { region: "UK", locale: "en-GB", language: "en", measurementSystem: "metric", temperatureUnit: "celsius", weightUnit: "g", lengthUnit: "cm", volumeUnit: "l", distanceUnit: "km", currency: "GBP" },
  USA: { region: "USA", locale: "en-US", language: "en", measurementSystem: "imperial", temperatureUnit: "fahrenheit", weightUnit: "oz", lengthUnit: "in", volumeUnit: "gal", distanceUnit: "mi", currency: "USD" },
  EUROPE: { region: "EUROPE", locale: "en-IE", language: "en", measurementSystem: "metric", temperatureUnit: "celsius", weightUnit: "g", lengthUnit: "cm", volumeUnit: "l", distanceUnit: "km", currency: "EUR" },
  AUSTRALIA: { region: "AUSTRALIA", locale: "en-AU", language: "en", measurementSystem: "metric", temperatureUnit: "celsius", weightUnit: "g", lengthUnit: "cm", volumeUnit: "l", distanceUnit: "km", currency: "AUD" },
};

const COUNTRY_TO_REGION: Record<string, RegionCode> = {
  GB: "UK", UK: "UK", US: "USA", CA: "USA", AU: "AUSTRALIA", NZ: "AUSTRALIA",
  IE: "EUROPE", FR: "EUROPE", DE: "EUROPE", ES: "EUROPE", IT: "EUROPE", NL: "EUROPE", BE: "EUROPE", AT: "EUROPE", PT: "EUROPE", SE: "EUROPE", DK: "EUROPE", FI: "EUROPE", PL: "EUROPE", CZ: "EUROPE",
};

export function regionFromCountry(countryCode?: string | null): RegionCode {
  return COUNTRY_TO_REGION[String(countryCode ?? "").trim().toUpperCase()] ?? "GLOBAL";
}

export function getLocaleProfile(region: RegionCode): LocaleProfile {
  return REGION_PROFILES[region] ?? REGION_PROFILES.GLOBAL;
}

export function detectLocaleProfile(): LocaleProfile {
  const language = typeof navigator !== "undefined" ? navigator.language : "en-GB";
  const country = language.split("-")[1]?.toUpperCase();
  return getLocaleProfile(regionFromCountry(country));
}

export function formatNumber(value: number, profile = detectLocaleProfile()): string {
  return new Intl.NumberFormat(profile.locale).format(value);
}

export function formatUnit(value: number, unit: Intl.NumberFormatOptions["unit"], profile = detectLocaleProfile()): string {
  return new Intl.NumberFormat(profile.locale, { style: "unit", unit, unitDisplay: "short" }).format(value);
}

export function convertWeightFromGrams(grams: number, unit: "g" | "oz"): number {
  return unit === "oz" ? grams / 28.349523125 : grams;
}

export function convertLengthFromCm(cm: number, unit: "cm" | "in"): number {
  return unit === "in" ? cm / 2.54 : cm;
}

export function convertTemperatureFromCelsius(celsius: number, unit: "celsius" | "fahrenheit"): number {
  return unit === "fahrenheit" ? (celsius * 9) / 5 + 32 : celsius;
}

export function convertVolumeFromLitres(litres: number, unit: "l" | "gal"): number {
  return unit === "gal" ? litres / 3.785411784 : litres;
}
