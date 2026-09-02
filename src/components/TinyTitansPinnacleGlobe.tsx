import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { getOwnCommunityLocation, getPublicCommunityLocations, type PublicCommunityLocation } from "../services/communityLocationPublicService";
import { syncCommunityLocationMembership } from "../services/communityLocationSyncService";
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

type DayNightMaterial = THREE.ShaderMaterial & {
  uniforms: {
    dayTexture: { value: THREE.Texture };
    nightTexture: { value: THREE.Texture };
    sunDirection: { value: THREE.Vector3 };
  };
};

const DAY_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg";
const NIGHT_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg";
const BUMP_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
const STAR_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";

function solarCoordinates(date: Date): { lat: number; lng: number } {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - yearStart) / 86400000) + 1;
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (utcMinutes - 720) / 1440);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const subsolarLongitude = (720 - utcMinutes - equationOfTime) / 4;
  return { lat: declination * 180 / Math.PI, lng: subsolarLongitude };
}

function geoToVector(lat: number, lng: number): THREE.Vector3 {
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  return new THREE.Vector3(Math.cos(latRad) * Math.sin(lngRad), Math.sin(latRad), Math.cos(latRad) * Math.cos(lngRad)).normalize();
}

const dayNightShader = {
  vertexShader: `
    varying vec3 vWorldNormal;
    varying vec2 vUv;
    void main() {
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunDirection;
    varying vec3 vWorldNormal;
    varying vec2 vUv;

    void main() {
      float intensity = dot(normalize(vWorldNormal), normalize(sunDirection));
      float dayFactor = smoothstep(-0.13, 0.16, intensity);
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      vec3 twilightColor = mix(nightColor.rgb, dayColor.rgb, smoothstep(-0.26, -0.03, intensity));
      vec3 finalColor = mix(twilightColor, dayColor.rgb, dayFactor);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

export default function TinyTitansPinnacleGlobe({ uid }: { uid: string }) {
  const globeRef = useRef<GlobeRef | undefined>(undefined);
  const [areas, setAreas] = useState<PublicCommunityLocation[]>([]);
  const [ownLocation, setOwnLocation] = useState<PublicCommunityLocation | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [material, setMaterial] = useState<DayNightMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
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
    void (async () => {
      try {
        await syncCommunityLocationMembership().catch(() => undefined);
        const [publicAreas, own] = await Promise.all([
          getPublicCommunityLocations(),
          getOwnCommunityLocation(uid),
        ]);
        if (!active) return;
        setAreas(publicAreas);
        setOwnLocation(own);
        if (own) setSelectedAreaId(own.areaId);
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
    const loader = new THREE.TextureLoader();
    let active = true;
    void Promise.all([
      loader.loadAsync(DAY_TEXTURE_URL),
      loader.loadAsync(NIGHT_TEXTURE_URL),
    ]).then(([dayTexture, nightTexture]) => {
      if (!active) return;
      dayTexture.colorSpace = THREE.SRGBColorSpace;
      nightTexture.colorSpace = THREE.SRGBColorSpace;
      const nextMaterial = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTexture },
          nightTexture: { value: nightTexture },
          sunDirection: { value: geoToVector(0, 0) },
        },
        vertexShader: dayNightShader.vertexShader,
        fragmentShader: dayNightShader.fragmentShader,
        side: THREE.FrontSide,
      }) as DayNightMaterial;
      setMaterial(nextMaterial);
    }).catch((error) => console.warn("Tiny Titans: Earth surface textures could not be loaded", error));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!material) return;
    const updateSun = () => {
      const sun = solarCoordinates(new Date());
      material.uniforms.sunDirection.value.copy(geoToVector(sun.lat, sun.lng));
    };
    updateSun();
    const timer = window.setInterval(updateSun, 10000);
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

  const selected = selectedAreaId ? globeAreas.find((area) => area.areaId === selectedAreaId) ?? null : null;
  const totalAreas = globeAreas.length;
  const totalRepresented = areas.reduce((sum, area) => sum + area.memberCount, 0);

  return <section className="tt-pinnacle-globe-section" aria-label="Tiny Titans community globe">
    <div className="tt-pinnacle-globe-heading">
      <div>
        <p className="tt-home-kicker">🌎 THE TINY TITANS WORLD</p>
        <h2>A community, around the world.</h2>
        <p>See where Tiny Titans is represented without exposing where anyone lives.</p>
      </div>
      <div className="tt-pinnacle-globe-meta"><span>{totalAreas} areas</span><span>{totalRepresented} Titans represented</span></div>
    </div>
    <div className="tt-pinnacle-globe-shell">
      <div className="tt-pinnacle-globe-space">
        <Globe
          ref={globeRef as never}
          width={900}
          height={620}
          backgroundColor="rgba(0,0,0,0)"
          backgroundImageUrl={STAR_TEXTURE_URL}
          globeMaterial={material ?? undefined}
          globeImageUrl={material ? undefined : DAY_TEXTURE_URL}
          bumpImageUrl={BUMP_TEXTURE_URL}
          showAtmosphere
          atmosphereColor="#5cc8ff"
          atmosphereAltitude={0.17}
          pointsData={globeAreas}
          pointLat="latitude"
          pointLng="longitude"
          pointAltitude={0.035}
          pointRadius={(item) => (item as GlobeArea).isSelf ? 0.38 : Math.min(0.3, 0.19 + ((item as GlobeArea).memberCount * 0.018))}
          pointColor={(item) => (item as GlobeArea).isSelf ? "#F5B642" : "#4CD7FF"}
          pointLabel={(item) => { const area = item as GlobeArea; return `${area.city} · ${area.country} · ${area.memberCount} Titan${area.memberCount === 1 ? "" : "s"}`; }}
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
        {loading && <div className="tt-pinnacle-status">Loading the world…</div>}
        {!loading && locationError && <div className="tt-pinnacle-status tt-pinnacle-status-warning">The community globe could not refresh right now.</div>}
        <div className="tt-pinnacle-controls-hint">Drag to explore · pinch or wheel to zoom</div>
      </div>
      {selected && <aside className="tt-pinnacle-location-card" aria-live="polite">
        <button type="button" className="tt-pinnacle-close" onClick={() => setSelectedAreaId(null)} aria-label="Close location information">×</button>
        <span className={selected.isSelf ? "tt-pinnacle-marker tt-pinnacle-marker-self" : "tt-pinnacle-marker"}>{selected.isSelf ? "✦" : "•"}</span>
        <p className="tt-pinnacle-card-kicker">{selected.isSelf ? "YOUR COMMUNITY AREA" : "COMMUNITY AREA"}</p>
        <h3>{selected.city}</h3>
        <strong>{selected.memberCount} Titan{selected.memberCount === 1 ? "" : "s"}</strong>
        <p>{selected.country}</p>
        {selected.isSelf ? <div className="tt-pinnacle-privacy-note"><b>🔐 Your exact location is not shown.</b><span>This marker represents the area you entered in Tiny Titans. It is not a live GPS position, home address or exact pinpoint.</span></div> : <small>Approximate community area only. No names, profiles or personal keeper data are shown here.</small>}
      </aside>}
    </div>
    {!selected && <p className="tt-pinnacle-footnote"><span className="tt-pinnacle-legend-self">✦</span> marks your community area. Other markers show aggregated community presence only.</p>}
  </section>;
}
