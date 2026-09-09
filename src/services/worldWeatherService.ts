export type WorldWeather = {
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidity: number;
  precipitationMm: number;
  weatherCode: number;
  windSpeedKph: number;
  windDirection: number;
  cloudCover: number;
  isDay: boolean;
  observedAt: string;
};

export type WorldWeatherFieldPoint = {
  latitude: number;
  longitude: number;
  cloudCover: number;
  precipitationMm: number;
  weatherCode: number;
  isDay: boolean;
};

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  cloud_cover?: number;
  is_day?: number;
};

type OpenMeteoSingleResponse = {
  latitude?: number;
  longitude?: number;
  current?: OpenMeteoCurrent;
};

type OpenMeteoResponse = OpenMeteoSingleResponse | OpenMeteoSingleResponse[];

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

function buildCurrentParams(): URLSearchParams {
  return new URLSearchParams({
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,is_day",
    timezone: "auto",
  });
}

export async function getCurrentWorldWeather(latitude: number, longitude: number, signal?: AbortSignal): Promise<WorldWeather> {
  const params = buildCurrentParams();
  params.set("latitude", String(latitude));
  params.set("longitude", String(longitude));
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
  const data = await response.json() as OpenMeteoResponse;
  const current = Array.isArray(data) ? data[0]?.current : data.current;
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
    cloudCover: typeof current.cloud_cover === "number" ? current.cloud_cover : 0,
    isDay: current.is_day !== 0,
    observedAt: typeof current.time === "string" ? current.time : new Date().toISOString(),
  };
}

function buildGlobalWeatherGrid(): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  for (let latitude = -75; latitude <= 75; latitude += 15) {
    for (let longitude = -180; longitude < 180; longitude += 15) {
      points.push({ latitude, longitude });
    }
  }
  return points;
}

export async function getGlobalWorldWeatherField(signal?: AbortSignal): Promise<WorldWeatherFieldPoint[]> {
  const grid = buildGlobalWeatherGrid();
  const params = buildCurrentParams();
  params.set("latitude", grid.map(({ latitude }) => latitude).join(","));
  params.set("longitude", grid.map(({ longitude }) => longitude).join(","));
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Global weather request failed (${response.status})`);
  const data = await response.json() as OpenMeteoResponse;
  const responses = Array.isArray(data) ? data : [data];

  return responses.flatMap((entry, index) => {
    const current = entry.current;
    const fallbackLocation = grid[index];
    if (!current || !fallbackLocation || typeof current.weather_code !== "number") return [];
    return [{
      latitude: typeof entry.latitude === "number" ? entry.latitude : fallbackLocation.latitude,
      longitude: typeof entry.longitude === "number" ? entry.longitude : fallbackLocation.longitude,
      cloudCover: typeof current.cloud_cover === "number" ? current.cloud_cover : 0,
      precipitationMm: typeof current.precipitation === "number" ? current.precipitation : 0,
      weatherCode: current.weather_code,
      isDay: current.is_day !== 0,
    }];
  });
}
