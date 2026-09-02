export type ResolvedCommunityLocation = {
  city: string;
  country: string;
  countryCode?: string;
  areaId: string;
  latitude: number;
  longitude: number;
  precision: "city";
  source: "open-meteo-geocoding";
};

type GeocodingResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  country_code?: string;
  feature_code?: string;
  population?: number;
};

type GeocodingResponse = { results?: GeocodingResult[] };

const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

function normalise(value: string): string {
  return value.trim().toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function safeCoordinate(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

function privacyRound(value: number): number {
  // ~1 km latitude precision while keeping the point useful for a city-level globe.
  return Number(value.toFixed(2));
}

export async function resolveCommunityLocation(cityInput: string, countryInput: string): Promise<ResolvedCommunityLocation> {
  const city = cityInput.trim();
  const country = countryInput.trim();
  if (!city || !country) throw new Error("Please enter both your city and country.");

  const params = new URLSearchParams({ name: `${city}, ${country}`, count: "10", language: "en", format: "json" });
  const response = await fetch(`${GEOCODING_ENDPOINT}?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("We couldn't validate that community location right now. Please check the city and country and try again.");

  const payload = await response.json() as GeocodingResponse;
  const results = Array.isArray(payload.results) ? payload.results : [];
  const wantedCity = normalise(city);
  const wantedCountry = normalise(country);
  const match = results.find((item) => normalise(String(item.name ?? "")) === wantedCity && normalise(String(item.country ?? "")) === wantedCountry)
    ?? results.find((item) => normalise(String(item.country ?? "")) === wantedCountry)
    ?? results[0];

  const latitude = safeCoordinate(match?.latitude, -90, 90);
  const longitude = safeCoordinate(match?.longitude, -180, 180);
  if (!match || latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
    throw new Error("That city and country could not be linked to a valid community area. Please check the spelling and try again.");
  }

  const canonicalCity = String(match.name ?? city).trim() || city;
  const canonicalCountry = String(match.country ?? country).trim() || country;
  const areaId = typeof match.id === "number" && Number.isFinite(match.id)
    ? `geo-${match.id}`
    : `geo-${normalise(canonicalCity)}-${normalise(canonicalCountry)}`;

  return {
    city: canonicalCity,
    country: canonicalCountry,
    countryCode: typeof match.country_code === "string" ? match.country_code.toUpperCase() : undefined,
    areaId,
    latitude: privacyRound(latitude),
    longitude: privacyRound(longitude),
    precision: "city",
    source: "open-meteo-geocoding",
  };
}
