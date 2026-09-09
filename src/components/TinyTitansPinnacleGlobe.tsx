import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import LiveWorldClockBadge from "./LiveWorldClockBadge";
import { useWorldTime } from "../context/WorldTimeContext";
import { getOwnCommunityLocation, getPublicCommunityLocations, type PublicCommunityLocation } from "../services/communityLocationPublicService";
import { syncCommunityLocationMembership } from "../services/communityLocationSyncService";
import { EARTH_BUMP_TEXTURE_URL, EARTH_DAY_TEXTURE_URL, EARTH_STAR_TEXTURE_URL, type EarthDayNightMaterial, loadEarthDayNightMaterial, updateEarthSun } from "../services/earthDayNight";
import "../styles/tinyTitansPinnacleGlobe.css";

type GlobeRef = { controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean; enablePan: boolean; enableDamping: boolean; dampingFactor: number; rotateSpeed: number; zoomSpeed: number }; pointOfView: (view: { lat: number; lng: number; altitude: number }, transitionMs?: number) => void };
type GlobeArea = PublicCommunityLocation & { isSelf: boolean; kind: "community" };

export default function TinyTitansPinnacleGlobe({ uid }: { uid: string }) {
  useWorldTime();
  const globeRef = useRef<GlobeRef | undefined>(undefined);
  const [areas, setAreas] = useState<PublicCommunityLocation[]>([]);
  const [ownLocation, setOwnLocation] = useState<PublicCommunityLocation | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [material, setMaterial] = useState<EarthDayNightMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let active = true; setLoading(true); setLocationError(false); setSyncError(false);
    void (async () => { try { try { await syncCommunityLocationMembership(); } catch (error) { console.warn("Tiny Titans: community location membership sync unavailable", error); if (active) setSyncError(true); } const [publicAreas, own] = await Promise.all([getPublicCommunityLocations(), getOwnCommunityLocation(uid)]); if (!active) return; setAreas(publicAreas); setOwnLocation(own); } catch (error) { console.warn("Tiny Titans: community globe feed unavailable", error); if (active) setLocationError(true); } finally { if (active) setLoading(false); } })();
    return () => { active = false; };
  }, [uid]);

  useEffect(() => { let active = true; void loadEarthDayNightMaterial().then((nextMaterial) => { if (!active) { nextMaterial.dispose(); return; } setMaterial(nextMaterial); }).catch((error) => console.warn("Tiny Titans: Earth surface textures could not be loaded", error)); return () => { active = false; setMaterial((current) => { current?.dispose(); return null; }); }; }, []);

  useEffect(() => {
    if (!material) return;
    const updateSun = () => updateEarthSun(material, new Date());
    updateSun();
    const timer = window.setInterval(updateSun, 10000);
    return () => window.clearInterval(timer);
  }, [material]);

  useEffect(() => { const controls = globeRef.current?.controls(); if (!controls) return; controls.enableZoom = true; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.075; controls.autoRotate = false; controls.autoRotateSpeed = 0; controls.rotateSpeed = 0.52; controls.zoomSpeed = 0.62; }, [material]);

  useEffect(() => { if (!ownLocation || !globeRef.current) return; const frame = window.requestAnimationFrame(() => { globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 900); }); return () => window.cancelAnimationFrame(frame); }, [ownLocation]);
  const globeAreas = useMemo<GlobeArea[]>(() => areas.map((area) => ({ ...area, kind: "community", isSelf: ownLocation?.areaId === area.areaId })), [areas, ownLocation]);
  const representedAreaCount = globeAreas.length; const representedTitanCount = globeAreas.reduce((sum, area) => sum + Math.max(0, area.memberCount), 0); const selected = selectedAreaId ? globeAreas.find((area) => area.areaId === selectedAreaId) ?? null : null;
  return <section className="tt-pinnacle-globe-section" aria-label="Globally Represented Titans"><div className="tt-pinnacle-globe-heading"><div><p className="tt-home-kicker">🌎 THE TINY TITANS WORLD</p><h2>Globally Represented Titans</h2><p>See where Tiny Titans is represented using city-level community areas only. Exact addresses and household locations are never shown.</p></div><LiveWorldClockBadge/></div><div className={`tt-pinnacle-globe-shell${selected ? "" : " tt-pinnacle-globe-shell-centered"}`}><div className="tt-pinnacle-globe-space"><Globe ref={globeRef as never} width={900} height={520} backgroundColor="rgba(0,0,0,0)" backgroundImageUrl={EARTH_STAR_TEXTURE_URL} globeMaterial={material ?? undefined} globeImageUrl={material ? undefined : EARTH_DAY_TEXTURE_URL} bumpImageUrl={EARTH_BUMP_TEXTURE_URL} showAtmosphere atmosphereColor="#5cc8ff" atmosphereAltitude={0.17} pointsData={globeAreas} pointLat="latitude" pointLng="longitude" pointAltitude={0.035} pointRadius={(item: object) => { const area = item as GlobeArea; return area.isSelf ? 0.38 : Math.min(0.3, 0.19 + area.memberCount * 0.018); }} pointColor={(item: object) => (item as GlobeArea).isSelf ? "#F5B642" : "#4CD7FF"} pointLabel={(item: object) => { const area = item as GlobeArea; return `${area.isSelf ? "Your community area · " : ""}${area.city} · ${area.country} · ${area.memberCount} Titan${area.memberCount === 1 ? "" : "s"}`; }} onPointClick={(item: object) => { const area = item as GlobeArea; setSelectedAreaId(area.areaId); const controls = globeRef.current?.controls(); if (controls) controls.autoRotate = false; }} ringsData={globeAreas.filter((area) => area.isSelf)} ringLat="latitude" ringLng="longitude" ringColor={() => "#F5B642"} ringAltitude={0.045} ringMaxRadius={0.8} ringPropagationSpeed={0.45} ringRepeatPeriod={1800} enablePointerInteraction onGlobeReady={() => { if (ownLocation) globeRef.current?.pointOfView({ lat: ownLocation.latitude, lng: ownLocation.longitude, altitude: 2.05 }, 0); }} />{loading && <div className="tt-pinnacle-status">Loading the global representation…</div>}{!loading && locationError && <div className="tt-pinnacle-status tt-pinnacle-status-warning">The global location feed could not be loaded.</div>}{!loading && !locationError && representedAreaCount === 0 && <div className="tt-pinnacle-location-empty"><strong>No community areas are indexed yet.</strong><span>{syncError ? "Your location service could not synchronise just now. The public map will remain privacy-safe and will retry when the page is refreshed." : ownLocation ? "Your community area is ready, but no aggregate areas are currently available." : "Share your city-level community area in Data & Privacy to add your Titan to the world map."}</span></div>}{!loading && !locationError && representedAreaCount > 0 && <div className="tt-pinnacle-map-count">{representedAreaCount} community area{representedAreaCount === 1 ? "" : "s"} · {representedTitanCount} represented Titan{representedTitanCount === 1 ? "" : "s"}</div>}<div className="tt-pinnacle-controls-hint">Drag to explore · pinch or wheel to zoom</div></div>{selected && <aside className="tt-pinnacle-location-card" aria-live="polite"><button type="button" className="tt-pinnacle-close" onClick={() => setSelectedAreaId(null)} aria-label="Close location information">×</button><span className={selected.isSelf ? "tt-pinnacle-marker tt-pinnacle-marker-self" : "tt-pinnacle-marker"}>{selected.isSelf ? "✦" : "•"}</span><p className="tt-pinnacle-card-kicker">{selected.isSelf ? "YOUR COMMUNITY AREA" : "COMMUNITY AREA"}</p><h3>{selected.city}</h3><strong>{selected.memberCount} Titan{selected.memberCount === 1 ? "" : "s"}</strong><p>{selected.country}</p><small>Approximate community area only. No names, profiles, exact coordinates or home addresses are shown here.</small></aside>}</div>{!selected && <p className="tt-pinnacle-footnote"><span className="tt-pinnacle-legend-self">✦</span> marks your community area. Other markers show aggregated community presence only.</p>}</section>;
}
