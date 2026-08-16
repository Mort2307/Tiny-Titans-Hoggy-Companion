import type { PrivacyPreferences } from "../types/privacy";

const REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";

export type ApproximateCommunityLocation = Pick<PrivacyPreferences, "city" | "country"> & {
  approxLat: number;
  approxLng: number;
};

function roundCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

function chooseCity(address: Record<string, unknown>): string | undefined {
  for (const key of ["city", "town", "village", "municipality", "borough", "county"]) {
    if (typeof address[key] === "string" && address[key].trim()) return String(address[key]).trim();
  }
  return undefined;
}

export async function captureApproximateCommunityLocation(): Promise<ApproximateCommunityLocation> {
  if (!navigator.geolocation) throw new Error("This device/browser does not provide location services.");
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 });
  });
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("The device returned an invalid location.");

  const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lng), zoom: "10", addressdetails: "1" });
  const response = await fetch(`${REVERSE_GEOCODE_URL}?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("We could not determine your approximate community area.");
  const payload = await response.json() as { address?: Record<string, unknown> };
  const city = chooseCity(payload.address ?? {});
  const country = typeof payload.address?.country === "string" ? payload.address.country.trim() : undefined;
  if (!city || !country) throw new Error("We could not determine a safe city/country community location.");

  // 0.1° rounding keeps the public point roughly within 5–7 miles of the real
  // position in most UK latitudes while never storing the device's raw GPS.
  return { city, country, approxLat: roundCoordinate(lat), approxLng: roundCoordinate(lng) };
}
