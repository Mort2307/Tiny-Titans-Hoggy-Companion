import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import LiveWorldClockBadge from "./LiveWorldClockBadge";
import { getOwnCommunityLocation, getPublicCommunityLocations, type PublicCommunityLocation } from "../services/communityLocationPublicService";
import { syncCommunityLocationMembership } from "../services/communityLocationSyncService";
import { getCurrentWorldWeather, getGlobalWorldWeatherField, describeWeatherCode, type WorldWeather, type WorldWeatherFieldPoint } from "../services/worldWeatherService";
import { createEarthCloudLayer, disposeEarthCloudLayer, updateEarthCloudLayer, type EarthCloudLayer } from "../services/earthCloudLayer";
import { EARTH_BUMP_TEXTURE_URL, EARTH_DAY_TEXTURE_URL, EARTH_STAR_TEXTURE_URL, type EarthDayNightMaterial, loadEarthDayNightMaterial, updateEarthSun } from "../services/earthDayNight";
import "../styles/tinyTitansPinnacleGlobe.css";

type GlobeRef = { controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean; enablePan: boolean; enableDamping: boolean; dampingFactor: number; rotateSpeed: number; zoomSpeed: number }; pointOfView: (view: { lat: number; lng: number; altitude: number }, transitionMs?: number) => void; renderer?: () => { setPixelRatio: (ratio: number) => void; outputColorSpace?: unknown }; scene?: () => THREE.Scene };
type GlobeArea = PublicCommunityLocation & { isSelf: boolean; kind: "community" };
type WeatherMap = Record<string, WorldWeather>;
type WeatherHex = { points: object[]; sumWeight: number; center: { lat: number; lng: number } };

function locationsMatch(a: PublicCommunityLocation, b: PublicCommunityLocation): boolean {
  if (a.areaId === b.areaId) return true;
  const samePlace = a.city.trim().toLocaleLowerCase("en-GB") === b.city.trim().toLocaleLowerCase("en-GB")
    && a.country.trim().toLocaleLowerCase("en-GB") === b.country.trim().toLocaleLowerCase("en-GB");
  if (!samePlace) return false;
  return Math.abs(a.latitude - b.latitude) <= 0.15 && Math.abs(a.longitude - b.longitude) <= 0.15;
}

function weatherIntensity(point: WorldWeatherFieldPoint): number {
  const precipitation = Math.min(1, point.precipitationMm / 4);
  const cloud = Math.min(1, point.cloudCover / 100);
  return Math.max(0, Math.min(1, cloud * 0.45 + precipitation * 0.9));
}

function weatherColor(points: object[], alpha: number): string {
  const samples = points as WorldWeatherFieldPoint[];
  const precipitation = samples.reduce((sum, point) => sum + point.precipitationMm, 0) / Math.max(1, samples.length);
  const cloud = samples.reduce((sum, point) => sum + point.cloudCover, 0) / Math.max(1, samples.length);
  if (precipitation >= 2) return `rgba(92, 120, 255, ${alpha})`;
  if (precipitation > 0.2) return `rgba(76, 210, 255, ${alpha})`;
  if (cloud >= 70) return `rgba(220, 230, 242, ${alpha})`;
  return `rgba(160, 195, 225, ${alpha})`;
}

export default function TinyTitansPinnacleGlobe({ uid }: { uid: string }) {
  const globeRef = useRef<GlobeRef | undefined>(undefined);
  const cloudLayerRef = useRef<EarthCloudLayer | null>(null);
  const cloudSceneRef = useRef<THREE.Scene | null>(null);
  const [areas, setAreas] = useState<PublicCommunityLocation[]>([]);
  const [ownLocation, setOwnLocation] = useState<PublicCommunityLocation | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [material, setMaterial] = useState<EarthDayNightMaterial | null>(null);
  const [weather, setWeather] = useState<WeatherMap>({});
  const [weatherField, setWeatherField] = useState<WorldWeatherFieldPoint[]>([]);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setLocationError(false); setSyncError(false);
    void (async () => {
      try {
        try { await syncCommunityLocationMembership(); }
        catch (error) { console.warn("Tiny Titans: community location membership sync unavailable", error); if (active) setSyncError(true); }
        const [publicAreas, own] = await Promise.all([getPublicCommunityLocations(), getOwnCommunityLocation(uid)]);
        if (!active) return;
        setAreas(publicAreas); setOwnLocation(own);
      } catch (error) {
        console.warn("Tiny Titans: community globe feed unavailable", error); if (active) setLocationError(true);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    let active = true;
    void loadEarthDayNightMaterial().then((nextMaterial) => {
      if (!active) { nextMaterial.dispose(); return; }
      setMaterial(nextMaterial);
    }).catch((error) => console.warn("Tiny Titans: Earth surface textures could not be loaded", error));
    return () => { active = false; setMaterial((current) => { current?.dispose(); return null; }); };
  }, []);

  useEffect(() => {
    if (!material) return;
    const updateSun = () => updateEarthSun(material, new Date());
    updateSun();
    const timer = window.setInterval(updateSun, 10000);
    return () => window.clearInterval(timer);
  }, [material]);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.enableZoom = true; controls.enablePan = false; controls.enableDamping = true;
    controls.dampingFactor = 0.075; controls.autoRotate = false; controls.autoRotateSpeed = 0;
    controls.rotateSpeed = 0.52; controls.zoomSpeed = 0.62;
    const renderer = globeRef.current?.renderer?.();
    if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }, [material]);

  useEffect(() => {
    if (!material) return;
    const scene = globeRef.current?.scene?.();
    if (!scene) return;
    const cloudLayer = createEarthCloudLayer(100);
    scene.add(cloudLayer);
    cloudLayerRef.current = cloudLayer;
    cloudSceneRef.current = scene;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      if (!cloudLayerRef.current) return;
      updateEarthCloudLayer(cloudLayerRef.current, (performance.now() - startedAt) / 1000, weatherEnabled);
    }, 50);
    return () => {
      window.clearInterval(timer);
      if (cloudLayerRef.current) {
        cloudSceneRef.current?.remove(cloudLayerRef.current);
        disposeEarthCloudLayer(cloudLayerRef.current);
        cloudLayerRef.current = null;
      }
      cloudSceneRef.current = null;
    };
  }, [material, weatherEnabled]);

  useEffect(() => {
    if (!ownLocation || !globeRef.current) return;
    const frame = window.requestAnimationFrame(() => globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 900));
    return () => window.cancelAnimationFrame(frame);
  }, [ownLocation]);

  const globeAreas = useMemo<GlobeArea[]>(() => areas.map((area) => ({ ...area, kind: "community", isSelf: Boolean(ownLocation && locationsMatch(area, ownLocation)) })), [areas, ownLocation]);
  const weatherLocations = useMemo(() => {
    const locations = [...globeAreas];
    if (ownLocation && !locations.some((area) => locationsMatch(area, ownLocation))) locations.push({ ...ownLocation, kind: "community", isSelf: true });
    return locations;
  }, [globeAreas, ownLocation]);

  useEffect(() => {
    if (!weatherEnabled) return;
    let active = true;
    const controller = new AbortController();
    const loadWeather = async () => {
      setWeatherLoading(true);
      try {
        const [field, localResults] = await Promise.all([
          getGlobalWorldWeatherField(controller.signal).catch((error) => {
            console.warn("Tiny Titans: global weather field unavailable", error); return [] as WorldWeatherFieldPoint[];
          }),
          Promise.all(weatherLocations.map(async (area) => {
            try { return [area.areaId, await getCurrentWorldWeather(area.latitude, area.longitude, controller.signal)] as const; }
            catch (error) { console.warn("Tiny Titans: weather unavailable for globe area", area.areaId, error); return null; }
          })),
        ]);
        if (!active) return;
        const next: WeatherMap = {};
        for (const result of localResults) if (result) next[result[0]] = result[1];
        setWeather(next); setWeatherField(field);
      } finally {
        if (active) setWeatherLoading(false);
      }
    };
    void loadWeather();
    const timer = window.setInterval(() => { void loadWeather(); }, 15 * 60 * 1000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [weatherEnabled, weatherLocations]);

  const representedAreaCount = globeAreas.length;
  const representedTitanCount = globeAreas.reduce((sum, area) => sum + Math.max(0, area.memberCount), 0);
  const selected = selectedAreaId ? globeAreas.find((area) => area.areaId === selectedAreaId) ?? null : null;
  const weatherFor = (area: GlobeArea) => weather[area.areaId];

  return <section className="tt-pinnacle-globe-section" aria-label="Globally Represented Titans">
    <div className="tt-pinnacle-globe-heading">
      <div><p className="tt-home-kicker">🌎 THE TINY TITANS WORLD</p><h2>Globally Represented Titans</h2><p>See where Tiny Titans is represented using city-level community areas only. Exact addresses and household locations are never shown.</p></div>
      <div className="tt-pinnacle-globe-tools">
        <LiveWorldClockBadge/>
        <button type="button" className={`tt-pinnacle-weather-toggle${weatherEnabled ? " is-on" : ""}`} onClick={() => { setWeatherEnabled((current) => !current); if (weatherEnabled) { setWeather({}); setWeatherField([]); } }} aria-pressed={weatherEnabled} title="Show or hide current weather across the globe">🌦 <span>Weather</span> <strong>{weatherEnabled ? "ON" : "OFF"}</strong></button>
      </div>
    </div>
    <div className={`tt-pinnacle-globe-shell${selected ? "" : " tt-pinnacle-globe-shell-centered"}`}>
      <div className="tt-pinnacle-globe-space">
        <Globe ref={globeRef as never} width={900} height={520} backgroundColor="rgba(0,0,0,0)" backgroundImageUrl={EARTH_STAR_TEXTURE_URL} globeMaterial={material ?? undefined} globeImageUrl={material ? undefined : EARTH_DAY_TEXTURE_URL} bumpImageUrl={EARTH_BUMP_TEXTURE_URL} showAtmosphere atmosphereColor="#5cc8ff" atmosphereAltitude={0.19}
          globeCurvatureResolution={3} rendererConfig={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          pointsData={globeAreas} pointLat="latitude" pointLng="longitude" pointAltitude={0.035} pointResolution={20}
          pointRadius={(item: object) => { const area = item as GlobeArea; return area.isSelf ? 0.38 : Math.min(0.3, 0.19 + area.memberCount * 0.018); }}
          pointColor={(item: object) => (item as GlobeArea).isSelf ? "#F5B642" : "#4CD7FF"}
          pointLabel={(item: object) => { const area = item as GlobeArea; const currentWeather = weatherFor(area); const weatherLabel = weatherEnabled && currentWeather ? ` · ${Math.round(currentWeather.temperatureC)}°C · ${describeWeatherCode(currentWeather.weatherCode)}` : ""; return `${area.isSelf ? "Creator Pin · " : ""}${area.city} · ${area.country} · ${area.memberCount} Titan${area.memberCount === 1 ? "" : "s"}${weatherLabel}`; }}
          onPointClick={(item: object) => { const area = item as GlobeArea; setSelectedAreaId(area.areaId); const controls = globeRef.current?.controls(); if (controls) controls.autoRotate = false; }}
          hexBinPointsData={weatherEnabled ? weatherField : []}
          hexBinPointLat="latitude" hexBinPointLng="longitude"
          hexBinPointWeight={(item: object) => weatherIntensity(item as WorldWeatherFieldPoint)}
          hexBinResolution={4} hexMargin={0.04} hexAltitude={({ sumWeight }: WeatherHex) => Math.min(0.055, 0.006 + sumWeight * 0.009)}
          hexTopColor={({ points }: WeatherHex) => weatherColor(points, 0.58)} hexSideColor={({ points }: WeatherHex) => weatherColor(points, 0.28)}
          hexBinMerge={true} hexTransitionDuration={1400}
          hexLabel={({ points }: WeatherHex) => { const samples = points as WorldWeatherFieldPoint[]; const precipitation = samples.reduce((sum, point) => sum + point.precipitationMm, 0) / Math.max(1, samples.length); const cloud = Math.round(samples.reduce((sum, point) => sum + point.cloudCover, 0) / Math.max(1, samples.length)); return `Weather field · cloud cover ${cloud}% · precipitation ${precipitation.toFixed(1)} mm`; }}
          ringsData={globeAreas.filter((area) => area.isSelf)} ringLat="latitude" ringLng="longitude" ringColor={() => "#F5B642"} ringAltitude={0.045} ringResolution={96} ringMaxRadius={0.8} ringPropagationSpeed={0.45} ringRepeatPeriod={1800}
          enablePointerInteraction onGlobeReady={() => { if (ownLocation) globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 0); const renderer = globeRef.current?.renderer?.(); if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); }}
        />
        {loading && <div className="tt-pinnacle-status">Loading the global representation…</div>}
        {weatherLoading && weatherEnabled && <div className="tt-pinnacle-weather-status">🌦 Updating live global weather…</div>}
        {!loading && locationError && <div className="tt-pinnacle-status tt-pinnacle-status-warning">The global location feed could not be loaded.</div>}
        {!loading && !locationError && representedAreaCount === 0 && <div className="tt-pinnacle-location-empty"><strong>No community areas are indexed yet.</strong><span>{syncError ? "Your community location service could not synchronise just now. The public map will remain privacy-safe and will retry when the page is refreshed." : ownLocation ? "Your community area is ready, but no aggregate areas are currently available." : "Share your city-level community area in Data & Privacy to add your Titan to the world map."}</span></div>}
        {!loading && !locationError && representedAreaCount > 0 && <div className="tt-pinnacle-map-count">{representedAreaCount} community area{representedAreaCount === 1 ? "" : "s"} · {representedTitanCount} represented Titan{representedTitanCount === 1 ? "" : "s"}</div>}
        <div className="tt-pinnacle-controls-hint">Drag to explore · pinch or wheel to zoom</div>
        {weatherEnabled && representedAreaCount > 0 && <div className="tt-pinnacle-weather-legend">🌦 Live weather field · refreshed every 15 minutes · hover a weather area for details</div>}
      </div>
      {selected && <aside className="tt-pinnacle-location-card" aria-live="polite"><button type="button" className="tt-pinnacle-close" onClick={() => setSelectedAreaId(null)} aria-label="Close location information">×</button><span className={selected.isSelf ? "tt-pinnacle-marker tt-pinnacle-marker-self" : "tt-pinnacle-marker"}>{selected.isSelf ? "✦" : "•"}</span><p className="tt-pinnacle-card-kicker">{selected.isSelf ? "CREATOR PIN" : "COMMUNITY AREA"}</p><h3>{selected.city}</h3><strong>{selected.memberCount} Titan{selected.memberCount === 1 ? "" : "s"}</strong><p>{selected.country}</p>{weatherEnabled && weatherFor(selected) && <div className="tt-pinnacle-weather-card"><strong>🌦 {Math.round(weatherFor(selected)!.temperatureC)}°C</strong><span>{describeWeatherCode(weatherFor(selected)!.weatherCode)}</span><small>Feels like {Math.round(weatherFor(selected)!.apparentTemperatureC)}°C · humidity {weatherFor(selected)!.relativeHumidity}% · wind {Math.round(weatherFor(selected)!.windSpeedKph)} km/h</small></div>}<small>Approximate community area only. No names, profiles, exact coordinates or home addresses are shown here.</small></aside>}
    </div>
    {!selected && <p className="tt-pinnacle-footnote"><span className="tt-pinnacle-legend-self">✦</span> marks the Creator Pin / your community area. Other markers show aggregated community presence only.</p>}
  </section>;
}
