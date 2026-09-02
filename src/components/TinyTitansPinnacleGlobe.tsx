import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { getOwnCommunityLocation, getPublicCommunityLocations, type PublicCommunityLocation } from "../services/communityLocationPublicService";
import { syncCommunityLocationMembership } from "../services/communityLocationSyncService";
import { EARTH_BUMP_TEXTURE_URL, EARTH_DAY_TEXTURE_URL, EARTH_STAR_TEXTURE_URL, type EarthDayNightMaterial, loadEarthDayNightMaterial, updateEarthSun } from "../services/earthDayNight";
import "../styles/tinyTitansPinnacleGlobe.css";

type GlobeRef = {
  controls: () => {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
    enablePan: boolean;
    enableDamping: boolean;
    dampingFactor: number;
    rotateSpeed: number;
    zoomSpeed: number;
  };
  pointOfView: (view: { lat: number; lng: number; altitude: number }, transitionMs?: number) => void;
};

type GlobeArea = PublicCommunityLocation & { isSelf: boolean };

type MoonPhase = {
  fraction: number;
  illumination: number;
  name: string;
};

const SYNODIC_MONTH_MS = 29.530588853 * 86_400_000;
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

function getMoonPhase(now = Date.now()): MoonPhase {
  const fraction = (((now - NEW_MOON_EPOCH_MS) / SYNODIC_MONTH_MS) % 1 + 1) % 1;
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * fraction));
  const name = fraction < 0.0625 ? "New Moon" : fraction < 0.1875 ? "Waxing Crescent" : fraction < 0.3125 ? "First Quarter" : fraction < 0.4375 ? "Waxing Gibbous" : fraction < 0.5625 ? "Full Moon" : fraction < 0.6875 ? "Waning Gibbous" : fraction < 0.8125 ? "Third Quarter" : fraction < 0.9375 ? "Waning Crescent" : "New Moon";
  return { fraction, illumination, name };
}

function drawMoon(canvas: HTMLCanvasElement, phase: MoonPhase): void {
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return;
  const image = context.createImageData(size, size);
  const radius = size * 0.42;
  const center = size / 2;
  const sunAngle = 2 * Math.PI * phase.fraction;
  const sunX = Math.sin(sunAngle);
  const sunZ = Math.cos(sunAngle);
  const craters = [
    [-0.24, -0.17, 0.10, 0.06], [0.17, -0.25, 0.075, 0.08], [0.25, 0.15, 0.12, 0.065],
    [-0.08, 0.26, 0.065, 0.05], [-0.31, 0.13, 0.055, 0.07], [0.03, 0.03, 0.045, 0.09],
  ];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x - center) / radius;
      const ny = (y - center) / radius;
      const rr = nx * nx + ny * ny;
      const index = (y * size + x) * 4;
      if (rr > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - rr));
      const light = nx * sunX + nz * sunZ;
      const lit = Math.max(0, light);
      let surface = 0.72 + 0.28 * lit;
      for (const [cx, cy, cr, shade] of craters) {
        const dx = nx - cx;
        const dy = ny - cy;
        if (dx * dx + dy * dy < cr * cr) surface *= 1 - shade;
      }
      const edge = Math.min(1, (1 - rr) * 18);
      const value = Math.round(210 * surface);
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = Math.round(edge * (0.85 + 0.15 * lit) * 255);
    }
  }
  context.putImageData(image, 0, 0);
}

function MoonPhaseWidget() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<MoonPhase>(() => getMoonPhase());

  useEffect(() => {
    const update = () => setPhase(getMoonPhase());
    const timer = window.setInterval(update, 3_600_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (canvasRef.current) drawMoon(canvasRef.current, phase);
  }, [phase]);

  return <div className="tt-pinnacle-moon-widget" aria-label={`Current Moon phase: ${phase.name}, ${Math.round(phase.illumination * 100)} percent illuminated`}>
    <canvas ref={canvasRef} width={128} height={128} aria-hidden="true" />
    <div><strong>🌙 For Mum</strong><span>{phase.name}</span><small>{Math.round(phase.illumination * 100)}% illuminated</small></div>
  </div>;
}

export default function TinyTitansPinnacleGlobe({ uid }: { uid: string }) {
  const globeRef = useRef<GlobeRef | undefined>(undefined);
  const [areas, setAreas] = useState<PublicCommunityLocation[]>([]);
  const [ownLocation, setOwnLocation] = useState<PublicCommunityLocation | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [material, setMaterial] = useState<EarthDayNightMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setIsReducedMotion(reduced.matches);
    update();
    reduced.addEventListener?.("change", update);
    return () => reduced.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLocationError(false);
    setSyncError(false);
    void (async () => {
      try {
        try {
          await syncCommunityLocationMembership();
        } catch (error) {
          console.warn("Tiny Titans: community location membership sync unavailable", error);
          if (active) setSyncError(true);
        }
        const [publicAreas, own] = await Promise.all([
          getPublicCommunityLocations(),
          getOwnCommunityLocation(uid),
        ]);
        if (!active) return;
        setAreas(publicAreas);
        setOwnLocation(own);
      } catch (error) {
        console.warn("Tiny Titans: community globe feed unavailable", error);
        if (active) setLocationError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    let active = true;
    void loadEarthDayNightMaterial().then((nextMaterial) => {
      if (!active) { nextMaterial.dispose(); return; }
      setMaterial(nextMaterial);
    }).catch((error) => console.warn("Tiny Titans: Earth surface textures could not be loaded", error));
    return () => {
      active = false;
      setMaterial((current) => { current?.dispose(); return null; });
    };
  }, []);

  useEffect(() => {
    if (!material) return;
    const updateSun = () => updateEarthSun(material);
    updateSun();
    const timer = window.setInterval(updateSun, 10_000);
    return () => window.clearInterval(timer);
  }, [material]);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.autoRotate = !isReducedMotion;
    controls.autoRotateSpeed = 0.24;
    controls.rotateSpeed = 0.52;
    controls.zoomSpeed = 0.62;
  }, [isReducedMotion, material]);

  useEffect(() => {
    const own = ownLocation;
    if (!own || !globeRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      globeRef.current?.pointOfView({ lat: own.latitude, lng: own.longitude, altitude: 2.05 }, 900);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ownLocation]);

  const globeAreas = useMemo<GlobeArea[]>(() => {
    const byId = new Map(areas.map((area) => [area.areaId, area]));
    if (ownLocation && !byId.has(ownLocation.areaId)) byId.set(ownLocation.areaId, ownLocation);
    return Array.from(byId.values()).map((area) => ({ ...area, isSelf: ownLocation?.areaId === area.areaId }));
  }, [areas, ownLocation]);

  const representedAreaCount = globeAreas.length;
  const representedTitanCount = globeAreas.reduce((sum, area) => sum + Math.max(0, area.memberCount), 0);
  const selected = selectedAreaId ? globeAreas.find((area) => area.areaId === selectedAreaId) ?? null : null;

  return <section className="tt-pinnacle-globe-section" aria-label="Globally Represented Titans">
    <div className="tt-pinnacle-globe-heading">
      <div>
        <p className="tt-home-kicker">🌎 THE TINY TITANS WORLD</p>
        <h2>Globally Represented Titans</h2>
        <p>See where Tiny Titans is represented using city-level community areas only. Exact addresses and household locations are never shown.</p>
      </div>
      <MoonPhaseWidget />
    </div>
    <div className="tt-pinnacle-globe-shell">
      <div className="tt-pinnacle-globe-space">
        <Globe
          ref={globeRef as never}
          width={900}
          height={520}
          backgroundColor="rgba(0,0,0,0)"
          backgroundImageUrl={EARTH_STAR_TEXTURE_URL}
          globeMaterial={material ?? undefined}
          globeImageUrl={material ? undefined : EARTH_DAY_TEXTURE_URL}
          bumpImageUrl={EARTH_BUMP_TEXTURE_URL}
          showAtmosphere
          atmosphereColor="#5cc8ff"
          atmosphereAltitude={0.17}
          pointsData={globeAreas}
          pointLat="latitude"
          pointLng="longitude"
          pointAltitude={0.035}
          pointRadius={(item) => (item as GlobeArea).isSelf ? 0.38 : Math.min(0.3, 0.19 + ((item as GlobeArea).memberCount * 0.018))}
          pointColor={(item) => (item as GlobeArea).isSelf ? "#F5B642" : "#4CD7FF"}
          pointLabel={(item) => { const area = item as GlobeArea; return `${area.isSelf ? "Your community area · " : ""}${area.city} · ${area.country} · ${area.memberCount} Titan${area.memberCount === 1 ? "" : "s"}`; }}
          onPointClick={(item) => { const area = item as GlobeArea; setSelectedAreaId(area.areaId); const controls = globeRef.current?.controls(); if (controls) controls.autoRotate = false; }}
          ringsData={globeAreas.filter((area) => area.isSelf)}
          ringLat="latitude"
          ringLng="longitude"
          ringColor={() => "#F5B642"}
          ringAltitude={0.045}
          ringMaxRadius={0.8}
          ringPropagationSpeed={0.45}
          ringRepeatPeriod={1800}
          enablePointerInteraction
          onGlobeReady={() => {
            if (ownLocation) globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 0);
          }}
        />
        {loading && <div className="tt-pinnacle-status">Loading the global representation…</div>}
        {!loading && locationError && <div className="tt-pinnacle-status tt-pinnacle-status-warning">The global location feed could not be loaded.</div>}
        {!loading && !locationError && representedAreaCount === 0 && <div className="tt-pinnacle-location-empty"><strong>No community areas are indexed yet.</strong><span>{syncError ? "Your location service could not synchronise just now. The public map will remain privacy-safe and will retry when the page is refreshed." : ownLocation ? "Your community area is ready, but no aggregate areas are currently available." : "Share your city-level community area in Data & Privacy to add your Titan to the world map."}</span></div>}
        {!loading && !locationError && representedAreaCount > 0 && <div className="tt-pinnacle-map-count">{representedAreaCount} community area{representedAreaCount === 1 ? "" : "s"} · {representedTitanCount} represented Titan{representedTitanCount === 1 ? "" : "s"}</div>}
        <div className="tt-pinnacle-controls-hint">Drag to explore · pinch or wheel to zoom</div>
      </div>
      {selected && <aside className="tt-pinnacle-location-card" aria-live="polite">
        <button type="button" className="tt-pinnacle-close" onClick={() => setSelectedAreaId(null)} aria-label="Close location information">×</button>
        <span className={selected.isSelf ? "tt-pinnacle-marker tt-pinnacle-marker-self" : "tt-pinnacle-marker"}>{selected.isSelf ? "✦" : "•"}</span>
        <p className="tt-pinnacle-card-kicker">{selected.isSelf ? "YOUR COMMUNITY AREA" : "COMMUNITY AREA"}</p>
        <h3>{selected.city}</h3>
        <strong>{selected.memberCount} Titan{selected.memberCount === 1 ? "" : "s"}</strong>
        <p>{selected.country}</p>
        <small>Approximate community area only. No names, profiles, exact coordinates or home addresses are shown here.</small>
      </aside>}
    </div>
    {!selected && <p className="tt-pinnacle-footnote"><span className="tt-pinnacle-legend-self">✦</span> marks your community area. Other markers show aggregated community presence only.</p>}
  </section>;
}
