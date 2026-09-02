import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { CanvasTexture, Group, Mesh, MeshPhongMaterial, SphereGeometry, Sprite, SpriteMaterial } from "three";
import type { Texture } from "three";
import { getOwnCommunityLocation, getPublicCommunityLocations, type PublicCommunityLocation } from "../services/communityLocationPublicService";
import { syncCommunityLocationMembership } from "../services/communityLocationSyncService";
import { EARTH_BUMP_TEXTURE_URL, EARTH_DAY_TEXTURE_URL, EARTH_STAR_TEXTURE_URL, type EarthDayNightMaterial, loadEarthDayNightMaterial, updateEarthSun } from "../services/earthDayNight";
import "../styles/tinyTitansPinnacleGlobe.css";

type GlobeRef = { controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean; enablePan: boolean; enableDamping: boolean; dampingFactor: number; rotateSpeed: number; zoomSpeed: number }; pointOfView: (view: { lat: number; lng: number; altitude: number }, transitionMs?: number) => void };
type GlobeArea = PublicCommunityLocation & { isSelf: boolean; kind: "community" };
type MoonGeo = { lat: number; lng: number; altitude: number; distanceKm: number; illumination: number };
type MoonObject = Group & { userData: { labelTexture?: Texture; moonMesh?: Mesh; label?: Sprite } };

const MOON_MEAN_DISTANCE_KM = 384400;
const MOON_ORBIT_VISUAL_RADIUS = 2.35;
const J2000_NOON_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const normaliseDegrees = (value: number): number => ((value % 360) + 360) % 360;
const toRadians = (degrees: number): number => degrees * Math.PI / 180;

function getMoonEcliptic(now = Date.now()) {
  const daysSinceJ2000 = (now - J2000_NOON_MS) / 86_400_000;
  const T = daysSinceJ2000 / 36525;
  const meanLongitude = normaliseDegrees(218.3164477 + 481267.88123421 * T);
  const meanElongation = normaliseDegrees(297.8501921 + 445267.1114034 * T);
  const sunMeanAnomaly = normaliseDegrees(357.5291092 + 35999.0502909 * T);
  const moonMeanAnomaly = normaliseDegrees(134.9633964 + 477198.8675055 * T);
  const argumentLatitude = normaliseDegrees(93.2720950 + 483202.0175233 * T);
  const M = toRadians(moonMeanAnomaly), D = toRadians(meanElongation), F = toRadians(argumentLatitude), Ms = toRadians(sunMeanAnomaly);
  const longitude = normaliseDegrees(meanLongitude + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * M) - 0.186 * Math.sin(Ms) - 0.059 * Math.sin(2 * D - 2 * M) - 0.057 * Math.sin(2 * D - Ms - M) + 0.053 * Math.sin(2 * D + M) + 0.046 * Math.sin(2 * D - Ms) + 0.041 * Math.sin(Ms - M) - 0.035 * Math.sin(D) - 0.031 * Math.sin(Ms + M) - 0.015 * Math.sin(2 * F - 2 * D) + 0.011 * Math.sin(M - 4 * D));
  const latitude = 5.128 * Math.sin(F) + 0.280 * Math.sin(M + F) + 0.277 * Math.sin(M - F) + 0.173 * Math.sin(2 * D - F) + 0.055 * Math.sin(2 * D - M + F) + 0.046 * Math.sin(2 * D - M - F) + 0.033 * Math.sin(2 * D + F) + 0.017 * Math.sin(2 * M + F);
  const distanceKm = 385000.56 - 20905.355 * Math.cos(M) - 3699.111 * Math.cos(2 * D - M) - 2955.968 * Math.cos(2 * D) - 569.925 * Math.cos(2 * M) + 246.158 * Math.cos(2 * M - 2 * D) - 205.435 * Math.cos(Ms - 2 * D) - 170.733 * Math.cos(M + 2 * D) - 152.137 * Math.cos(Ms + M - 2 * D);
  return { longitude, latitude, distanceKm, elongation: normaliseDegrees(meanElongation) };
}

function getMoonGeo(now = Date.now()): MoonGeo {
  const moon = getMoonEcliptic(now);
  const lambda = toRadians(moon.longitude), beta = toRadians(moon.latitude), obliquity = toRadians(23.439291);
  const x = Math.cos(beta) * Math.cos(lambda);
  const y = Math.cos(beta) * Math.sin(lambda) * Math.cos(obliquity) - Math.sin(beta) * Math.sin(obliquity);
  const z = Math.cos(beta) * Math.sin(lambda) * Math.sin(obliquity) + Math.sin(beta) * Math.cos(obliquity);
  const rightAscension = Math.atan2(y, x);
  const declination = Math.asin(Math.max(-1, Math.min(1, z)));
  const altitude = Math.max(0.25, (moon.distanceKm / MOON_MEAN_DISTANCE_KM) * MOON_ORBIT_VISUAL_RADIUS - 1);
  const illumination = 0.5 * (1 - Math.cos(toRadians(moon.elongation)));
  const celestialLongitude = normaliseDegrees(rightAscension * 180 / Math.PI);
  return { lat: declination * 180 / Math.PI, lng: celestialLongitude > 180 ? celestialLongitude - 360 : celestialLongitude, altitude, distanceKm: moon.distanceKm, illumination };
}

function makeMoonLabelTexture(): CanvasTexture {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d"); if (!ctx) return new CanvasTexture(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.strokeStyle = "rgba(245,182,66,0.88)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(5, 7, 246, 50, 13); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#F5B642"; ctx.font = "800 24px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("📍 Nana Farm", 128, 32);
  const texture = new CanvasTexture(canvas); texture.needsUpdate = true; return texture;
}

function createMoonObject(): MoonObject {
  const group = new Group() as MoonObject;
  const moonMesh = new Mesh(new SphereGeometry(0.13, 32, 32), new MeshPhongMaterial({ color: 0xc9c6bb, shininess: 3 }));
  group.add(moonMesh);
  const labelTexture = makeMoonLabelTexture();
  const label = new Sprite(new SpriteMaterial({ map: labelTexture, transparent: true, depthTest: true, depthWrite: false }));
  label.scale.set(0.34, 0.085, 1); label.position.set(0, 0.17, 0); group.add(label);
  group.userData.labelTexture = labelTexture; group.userData.moonMesh = moonMesh; group.userData.label = label; return group;
}

function updateMoonObject(object: MoonObject, data: MoonGeo): void {
  const mesh = object.userData.moonMesh; if (!mesh) return;
  const material = mesh.material as MeshPhongMaterial; const shade = 0.28 + data.illumination * 0.72; material.color.setRGB(shade, shade * 0.985, shade * 0.92);
}

export default function TinyTitansPinnacleGlobe({ uid }: { uid: string }) {
  const globeRef = useRef<GlobeRef | undefined>(undefined);
  const [areas, setAreas] = useState<PublicCommunityLocation[]>([]); const [ownLocation, setOwnLocation] = useState<PublicCommunityLocation | null>(null); const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null); const [material, setMaterial] = useState<EarthDayNightMaterial | null>(null);
  const [moon, setMoon] = useState<MoonGeo>(() => getMoonGeo()); const [loading, setLoading] = useState(true); const [locationError, setLocationError] = useState(false); const [syncError, setSyncError] = useState(false); const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => { const reduced = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setIsReducedMotion(reduced.matches); update(); reduced.addEventListener?.("change", update); return () => reduced.removeEventListener?.("change", update); }, []);
  useEffect(() => { const updateMoon = () => setMoon(getMoonGeo()); updateMoon(); if (isReducedMotion) return; const timer = window.setInterval(updateMoon, 1_000); return () => window.clearInterval(timer); }, [isReducedMotion]);
  useEffect(() => { let active = true; setLoading(true); setLocationError(false); setSyncError(false); void (async () => { try { try { await syncCommunityLocationMembership(); } catch (error) { console.warn("Tiny Titans: community location membership sync unavailable", error); if (active) setSyncError(true); } const [publicAreas, own] = await Promise.all([getPublicCommunityLocations(), getOwnCommunityLocation(uid)]); if (!active) return; setAreas(publicAreas); setOwnLocation(own); } catch (error) { console.warn("Tiny Titans: community globe feed unavailable", error); if (active) setLocationError(true); } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, [uid]);
  useEffect(() => { let active = true; void loadEarthDayNightMaterial().then((nextMaterial) => { if (!active) { nextMaterial.dispose(); return; } setMaterial(nextMaterial); }).catch((error) => console.warn("Tiny Titans: Earth surface textures could not be loaded", error)); return () => { active = false; setMaterial((current) => { current?.dispose(); return null; }); }; }, []);
  useEffect(() => { if (!material) return; const updateSun = () => updateEarthSun(material); updateSun(); const timer = window.setInterval(updateSun, 10_000); return () => window.clearInterval(timer); }, [material]);
  useEffect(() => { const controls = globeRef.current?.controls(); if (!controls) return; controls.enableZoom = true; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.075; controls.autoRotate = false; controls.autoRotateSpeed = 0; controls.rotateSpeed = 0.52; controls.zoomSpeed = 0.62; }, [material]);
  useEffect(() => { if (!ownLocation || !globeRef.current) return; const frame = window.requestAnimationFrame(() => globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 900)); return () => window.cancelAnimationFrame(frame); }, [ownLocation]);

  const globeAreas = useMemo<GlobeArea[]>(() => areas.map((area) => ({ ...area, kind: "community", isSelf: ownLocation?.areaId === area.areaId })), [areas, ownLocation]);
  const representedAreaCount = globeAreas.length; const representedTitanCount = globeAreas.reduce((sum, area) => sum + Math.max(0, area.memberCount), 0); const selected = selectedAreaId ? globeAreas.find((area) => area.areaId === selectedAreaId) ?? null : null;

  return <section className="tt-pinnacle-globe-section" aria-label="Globally Represented Titans"><div className="tt-pinnacle-globe-heading"><div><p className="tt-home-kicker">🌎 THE TINY TITANS WORLD</p><h2>Globally Represented Titans</h2><p>See where Tiny Titans is represented using city-level community areas only. Exact addresses and household locations are never shown.</p></div></div><div className="tt-pinnacle-globe-shell"><div className="tt-pinnacle-globe-space"><Globe ref={globeRef as never} width={900} height={520} backgroundColor="rgba(0,0,0,0)" backgroundImageUrl={EARTH_STAR_TEXTURE_URL} globeMaterial={material ?? undefined} globeImageUrl={material ? undefined : EARTH_DAY_TEXTURE_URL} bumpImageUrl={EARTH_BUMP_TEXTURE_URL} showAtmosphere atmosphereColor="#5cc8ff" atmosphereAltitude={0.17} pointsData={globeAreas} pointLat="latitude" pointLng="longitude" pointAltitude={0.035} pointRadius={(item) => { const area = item as GlobeArea; return area.isSelf ? 0.38 : Math.min(0.3, 0.19 + area.memberCount * 0.018); }} pointColor={(item) => (item as GlobeArea).isSelf ? "#F5B642" : "#4CD7FF"} pointLabel={(item) => { const area = item as GlobeArea; return `${area.isSelf ? "Your community area · " : ""}${area.city} · ${area.country} · ${area.memberCount} Titan${area.memberCount === 1 ? "" : "s"}`; }} onPointClick={(item) => { const area = item as GlobeArea; setSelectedAreaId(area.areaId); const controls = globeRef.current?.controls(); if (controls) controls.autoRotate = false; }} ringsData={globeAreas.filter((area) => area.isSelf)} ringLat="latitude" ringLng="longitude" ringColor={() => "#F5B642"} ringAltitude={0.045} ringMaxRadius={0.8} ringPropagationSpeed={0.45} ringRepeatPeriod={1800} customLayerData={[moon]} customThreeObject={createMoonObject} customThreeObjectUpdate={updateMoonObject} enablePointerInteraction onGlobeReady={() => { if (ownLocation) globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 0); }} />{loading && <div className="tt-pinnacle-status">Loading the global representation…</div>}{!loading && locationError && <div className="tt-pinnacle-status tt-pinnacle-status-warning">The global location feed could not be loaded.</div>}{!loading && !locationError && representedAreaCount === 0 && <div className="tt-pinnacle-location-empty"><strong>No community areas are indexed yet.</strong><span>{syncError ? "Your location service could not synchronise just now. The public map will remain privacy-safe and will retry when the page is refreshed." : ownLocation ? "Your community area is ready, but no aggregate areas are currently available." : "Share your city-level community area in Data & Privacy to add your Titan to the world map."}</span></div>}{!loading && !locationError && representedAreaCount > 0 && <div className="tt-pinnacle-map-count">{representedAreaCount} community area{representedAreaCount === 1 ? "" : "s"} · {representedTitanCount} represented Titan{representedTitanCount === 1 ? "" : "s"}</div>}<div className="tt-pinnacle-controls-hint">Drag to explore · pinch or wheel to zoom</div></div>{selected && <aside className="tt-pinnacle-location-card" aria-live="polite"><button type="button" className="tt-pinnacle-close" onClick={() => setSelectedAreaId(null)} aria-label="Close location information">×</button><span className={selected.isSelf ? "tt-pinnacle-marker tt-pinnacle-marker-self" : "tt-pinnacle-marker"}>{selected.isSelf ? "✦" : "•"}</span><p className="tt-pinnacle-card-kicker">{selected.isSelf ? "YOUR COMMUNITY AREA" : "COMMUNITY AREA"}</p><h3>{selected.city}</h3><strong>{selected.memberCount} Titan{selected.memberCount === 1 ? "" : "s"}</strong><p>{selected.country}</p><small>Approximate community area only. No names, profiles, exact coordinates or home addresses are shown here.</small></aside>}</div>{!selected && <p className="tt-pinnacle-footnote"><span className="tt-pinnacle-legend-self">✦</span> marks your community area. Other markers show aggregated community presence only. 🌙 Nana Farm is a dedicated marker on the Moon.</p>}</section>;
}
