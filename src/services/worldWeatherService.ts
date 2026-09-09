export type WorldWeather = {
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidity: number;
  precipitationMm: number;
  weatherCode: number;
  windSpeedKph: number;
  windDirection: number;
  isDay: boolean;
  observedAt: string;
};

type OpenMeteoResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    is_day?: number;
  };
};

export function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if ([96, 99].includes(code)) return "Thunderstorm with hail";
  return "Current conditions";
}

export async function getCurrentWorldWeather(latitude: number, longitude: number, signal?: AbortSignal): Promise<WorldWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
  const data = await response.json() as OpenMeteoResponse;
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") {
    throw new Error("Weather response did not contain current conditions");
  }
  return {
    temperatureC: current.temperature_2m,
    apparentTemperatureC: typeof current.apparent_temperature === "number" ? current.apparent_temperature : current.temperature_2m,
    relativeHumidity: typeof current.relative_humidity_2m === "number" ? current.relative_humidity_2m : 0,
    precipitationMm: typeof current.precipitation === "number" ? current.precipitation : 0,
    weatherCode: current.weather_code,
    windSpeedKph: typeof current.wind_speed_10m === "number" ? current.wind_speed_10m : 0,
    windDirection: typeof current.wind_direction_10m === "number" ? current.wind_direction_10m : 0,
    isDay: current.is_day !== 0,
    observedAt: typeof current.time === "string" ? current.time : new Date().toISOString(),
  };
}
