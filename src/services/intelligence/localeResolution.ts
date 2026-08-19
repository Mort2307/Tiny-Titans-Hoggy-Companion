import { detectLocaleProfile, getLocaleProfile, regionFromCountry, type LocaleProfile, type RegionCode } from "./localeProfile";

export type LocalePreference = "automatic" | RegionCode;

export type ResolvedLocale = LocaleProfile & {
  source: "manual" | "profile" | "browser";
};

export function resolveLocalePreference(preference: LocalePreference = "automatic", profileRegion?: RegionCode | null): ResolvedLocale {
  if (preference !== "automatic") return { ...getLocaleProfile(preference), source: "manual" };
  if (profileRegion && profileRegion !== "GLOBAL") return { ...getLocaleProfile(profileRegion), source: "profile" };
  const detected = detectLocaleProfile();
  return { ...detected, source: "browser" };
}

export function regionFromLocale(locale?: string | null): RegionCode {
  const country = String(locale ?? "").split("-")[1]?.toUpperCase();
  return regionFromCountry(country);
}

export function explainLocaleResolution(resolved: ResolvedLocale): string {
  if (resolved.source === "manual") return "Using your selected regional format.";
  if (resolved.source === "profile") return "Using your saved regional profile.";
  return "Using your device/browser locale as a starting point.";
}
