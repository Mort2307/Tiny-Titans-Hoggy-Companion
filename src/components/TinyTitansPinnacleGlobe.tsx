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

type MoonModel = {
  orbitAngleDeg: number;
  orbitRadius: number;
  illumination: number;
  phaseName: string;
  distanceKm: number;
};

const SIDEREAL_MONTH_DAYS = 27.321661;
const J2000_NOON_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MOON_ECCENTRICITY = 0.0549;
const MOON_INCLINATION_DEG = 5.145;

function normaliseDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function getMoonModel(now = Date.now()): MoonModel {
  const daysSinceJ2000 = (now - J2000_NOON_MS) / 86_400_000;
  const T = daysSinceJ2000 / 36_525;

  // Low-precision geocentric lunar elements: enough for a faithful live
  // Earth/Moon display, without pretending to be a full Horizons ephemeris.
  const meanLongitude = normaliseDegrees(218.3164477 + 481267.88123421 * T);
  const meanElongation = normaliseDegrees(297.8501921 + 445267.1114034 * T);
  const sunMeanAnomaly = normaliseDegrees(357.5291092 + 35999.0502909 * T);
  const moonMeanAnomaly = normaliseDegrees(134.9633964 + 477198.8675055 * T);
  const argumentLatitude = normaliseDegrees(93.2720950 + 483202.0175233 * T);

  const M = toRadians(moonMeanAnomaly);
  const D = toRadians(meanElongation);
  const F = toRadians(argumentLatitude);
  const Ms = toRadians(sunMeanAnomaly);

  const eclipticLongitude = normaliseDegrees(
    meanLongitude
      + 6.289 * Math.sin(M)
      + 1.274 * Math.sin(2 * D - M)
      + 0.658 * Math.sin(2 * D)
      + 0.214 * Math.sin(2 * M)
      - 0.186 * Math.sin(Ms)
      - 0.059 * Math.sin(2 * D - 2 * M)
      - 0.057 * Math.sin(2 * D - Ms - M)
      + 0.053 * Math.sin(2 * D + M)
      + 0.046 * Math.sin(2 * D - Ms)
      + 0.041 * Math.sin(Ms - M)
      - 0.035 * Math.sin(D)
      - 0.031 * Math.sin(Ms + M)
      - 0.015 * Math.sin(2 * F - 2 * D)
      + 0.011 * Math.sin(M - 4 * D),
  );
  const distanceKm =
    385000.56
      - 20905.355 * Math.cos(M)
      - 3699.111 * Math.cos(2 * D - M)
      - 2955.968 * Math.cos(2 * D)
      - 569.925 * Math.cos(2 * M)
      + 246.158 * Math.cos(2 * M - 2 * D)
      - 205.435 * Math.cos(Ms - 2 * D)
      - 170.733 * Math.cos(M + 2 * D)
      - 152.137 * Math.cos(Ms + M - 2 * D);

  const illumination = 0.5 * (1 - Math.cos(D));
  const phaseFraction = normaliseDegrees(meanElongation) / 360;
  const phaseName = phaseFraction < 0.0625 || phaseFraction >= 0.9375
    ? "New Moon"
    : phaseFraction < 0.1875
      ? "Waxing Crescent"
      : phaseFraction < 0.3125
        ? "First Quarter"
        : phaseFraction < 0.4375
          ? "Waxing Gibbous"
          : phaseFraction < 0.5625
            ? "Full Moon"
            : phaseFraction < 0.6875
              ? "Waning Gibbous"
              : phaseFraction < 0.8125
                ? "Third Quarter"
                : "Waning Crescent";

  return {
    orbitAngleDeg: eclipticLongitude,
    orbitRadius: Math.max(0.88, Math.min(1.12, distanceKm / 384400)),
    illumination,
    phaseName,
    distanceKm: Math.round(distanceKm),
  };
}

function drawMoonSystem(canvas: HTMLCanvasElement, model: MoonModel): void {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = 240;
  const height = 156;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const orbitWidth = 88;
  const orbitHeight = orbitWidth * Math.cos(toRadians(MOON_INCLINATION_DEG));

  context.save();
  context.translate(cx, cy);
  context.rotate(toRadians(-23.44));
  context.scale(1, 0.42);
  context.beginPath();
  context.arc(0, 0, orbitWidth, 0, Math.PI * 2);
  context.strokeStyle = "rgba(122, 194, 255, 0.34)";
  context.lineWidth = 1.2;
  context.setLineDash([4, 5]);
  context.stroke();
  context.restore();

  const theta = toRadians(model.orbitAngleDeg);
  const moonX = cx + Math.cos(theta) * orbitWidth * model.orbitRadius;
  const moonY = cy + Math.sin(theta) * orbitHeight * model.orbitRadius;

  const earthGlow = context.createRadialGradient(cx, cy, 8, cx, cy, 36);
  earthGlow.addColorStop(0, "rgba(92, 200, 255, 0.35)");
  earthGlow.addColorStop(1, "rgba(92, 200, 255, 0)");
  context.fillStyle = earthGlow;
  context.beginPath();
  context.arc(cx, cy, 36, 0, Math.PI * 2);
  context.fill();

  const earth = context.createRadialGradient(cx - 7, cy - 8, 3, cx, cy, 20);
  earth.addColorStop(0, "#78d7ff");
  earth.addColorStop(0.5, "#257da8");
  earth.addColorStop(1, "#0d3046");
  context.fillStyle = earth;
  context.beginPath();
  context.arc(cx, cy, 19, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.15)";
  context.stroke();

  context.fillStyle = "rgba(83, 209, 133, 0.72)";
  context.beginPath();
  context.ellipse(cx - 5, cy - 3, 7, 4, -0.25, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(cx + 7, cy + 5, 5, 3, 0.35, 0, Math.PI * 2);
  context.fill();

  const moonRadius = 8.5;
  const moonLightAngle = toRadians(90 + normaliseDegrees(model.orbitAngleDeg));
  const moonLightX = Math.cos(moonLightAngle);
  const moonLightY = Math.sin(moonLightAngle);
  const moonGradient = context.createRadialGradient(
    moonX - moonLightX * 3,
    moonY - moonLightY * 3,
    1,
    moonX,
    moonY,
    moonRadius * 1.2,
  );
  moonGradient.addColorStop(0, "#fffbe9");
  moonGradient.addColorStop(Math.max(0.35, model.illumination), "#d6d0bc");
  moonGradient.addColorStop(1, "#625f57");
  context.fillStyle = moonGradient;
  context.shadowColor = "rgba(245, 242, 220, 0.36)";
  context.shadowBlur = 10;
  context.beginPath();
  context.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  context.fillStyle = "rgba(75, 72, 64, 0.24)";
  [[-2, -3, 1.6], [3, -2, 1.3], [2, 3, 1.5], [-3, 3, 1.1]].forEach(([dx, dy, r]) => {
    context.beginPath();
    context.arc(moonX + dx, moonY + dy, r, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = "rgba(245, 245, 238, 0.78)";
  context.font = "700 9px system-ui, sans-serif";
  context.fillText("EARTH", cx - 17, cy + 32);
  context.fillText("MOON", moonX - 12, moonY + 19);
}

function MoonOrbitWidget() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [model, setModel] = useState<MoonModel>(() => getMoonModel());

  useEffect(() => {
    const update = () => setModel(getMoonModel());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (canvasRef.current) drawMoonSystem(canvasRef.current, model);
  }, [model]);

  return <div className="tt-pinnacle-moon-widget" aria-label={`Real-time Earth and Moon orbit. ${model.phaseName}, ${Math.round(model.illumination * 100)} percent illuminated. Lunar distance ${model.distanceKm.toLocaleString("en-GB")} kilometres.`}>
    <canvas ref={canvasRef} width={240} height={156} aria-hidden="true" />
    <div className="tt-pinnacle-moon-copy">
      <strong>🌙 For Mum</strong>
      <span>{model.phaseName}</span>
      <small>{Math.round(model.illumination * 100)}% illuminated</small>
      <small>{model.distanceKm.toLocaleString("en-GB")} km · {SIDEREAL_MONTH_DAYS} d orbit</small>
      <small>5.145° inclination · e={MOON_ECCENTRICITY}</small>
    </div>
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
      <MoonOrbitWidget />
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
