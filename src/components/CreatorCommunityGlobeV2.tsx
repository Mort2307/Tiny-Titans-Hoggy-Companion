import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { getCommunityLocationMembers, type CommunityLocationMember } from "../services/communityLocationService";
import CreatorSnapshotIntelligence from "./CreatorSnapshotIntelligence";
import "../styles/creatorCommunityGlobeV2.css";

export type CommunityUserLocation = { city: string; country: string };
export type CreatorCommunityGlobeProps = { locations?: CommunityUserLocation[] };
type GeoFeature = { geometry: unknown };
type GeoJson = { features: GeoFeature[] };
type Marker = { areaId: string; city: string; country: string; lat: number; lng: number; members: CommunityLocationMember[] };
type CommunityArea = { city: string; members: CommunityLocationMember[] };
type CountryGroup = { country: string; members: CommunityLocationMember[]; areas: Map<string, CommunityArea> };
const normalise = (value: string) => value.trim().toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CreatorCommunityGlobeV2(_props: CreatorCommunityGlobeProps) {
  const globeRef = useRef<{ controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean; enablePan: boolean; enableDamping: boolean; dampingFactor: number; rotateSpeed: number; zoomSpeed: number } } | undefined>(undefined);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const [globeSize, setGlobeSize] = useState({ width: 720, height: 520 });
  const [members, setMembers] = useState<CommunityLocationMember[]>([]);
  const [countries, setCountries] = useState<GeoFeature[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  useEffect(() => {
    const element = visualRef.current;
    if (!element) return;
    const updateSize = () => {
      const width = Math.max(260, Math.floor(element.clientWidth));
      const isPhone = window.matchMedia("(max-width: 640px)").matches;
      const isTablet = window.matchMedia("(max-width: 900px)").matches;
      const maxHeight = isPhone ? 390 : isTablet ? 470 : 520;
      const minHeight = isPhone ? 300 : 360;
      const ratioHeight = width * (isPhone ? 0.88 : 0.68);
      const height = Math.round(Math.min(maxHeight, Math.max(minHeight, ratioHeight)));
      setGlobeSize((current) => current.width === width && current.height === height ? current : { width, height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("orientationchange", updateSize);
    return () => { observer.disconnect(); window.removeEventListener("orientationchange", updateSize); };
  }, []);

  useEffect(() => {
    let active = true;
    setLocationLoading(true);
    setLocationError(false);
    getCommunityLocationMembers().then((items) => { if (active) setMembers(items); }).catch(() => { if (active) setLocationError(true); }).finally(() => { if (active) setLocationLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((response) => response.ok ? response.json() as Promise<GeoJson> : Promise.reject(new Error("map")))
      .then((data) => { if (active) setCountries(data.features ?? []); })
      .catch(() => undefined)
      .finally(() => { if (active) setMapLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.32;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.7;
  }, [autoRotate, countries.length, globeSize.width, globeSize.height]);

  const markers = useMemo(() => {
    const grouped = new Map<string, Marker>();
    for (const member of members) {
      const existing = grouped.get(member.areaId);
      if (existing) existing.members.push(member);
      else grouped.set(member.areaId, { areaId: member.areaId, city: member.city, country: member.country, lat: member.latitude, lng: member.longitude, members: [member] });
    }
    return Array.from(grouped.values());
  }, [members]);

  const countryGroups = useMemo<CountryGroup[]>(() => {
    const groups = new Map<string, CountryGroup>();
    for (const member of members) {
      const key = normalise(member.country);
      const group = groups.get(key) ?? { country: member.country, members: [] as CommunityLocationMember[], areas: new Map<string, CommunityArea>() };
      group.members.push(member);
      const areaKey = member.areaId || `${normalise(member.city)}-${key}`;
      const area = group.areas.get(areaKey) ?? { city: member.city, members: [] as CommunityLocationMember[] };
      area.members.push(member);
      group.areas.set(areaKey, area);
      groups.set(key, group);
    }
    return Array.from(groups.values()).sort((a, b) => b.members.length - a.members.length);
  }, [members]);

  const selected = selectedKey ? markers.find((marker) => marker.areaId === selectedKey) ?? null : null;
  const totalUsers = new Set(members.map((member) => member.uid)).size;
  const countryCount = countryGroups.length;
  const areaKeys = new Set(members.map((member) => `${normalise(member.city)}|${normalise(member.country)}`));
  const areaCount = areaKeys.size;
  const snakeCountsAvailable = members.every((member) => member.snakeCount !== undefined);
  const totalSnakes = snakeCountsAvailable ? members.reduce((sum, member) => sum + (member.snakeCount ?? 0), 0) : undefined;
  const toggleCountry = (country: string) => setExpandedCountries((current) => { const next = new Set(current); const key = normalise(country); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const toggleArea = (areaId: string) => setExpandedAreas((current) => { const next = new Set(current); if (next.has(areaId)) next.delete(areaId); else next.add(areaId); return next; });
  const expandAll = () => { setExpandedCountries(new Set(countryGroups.map((group) => normalise(group.country)))); setExpandedAreas(new Set(countryGroups.flatMap((group) => Array.from(group.areas.keys())))); };
  const collapseAll = () => { setExpandedCountries(new Set()); setExpandedAreas(new Set()); };

  return <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
    <CreatorSnapshotIntelligence />
    <div className="creator-section-heading"><div><span className="creator-admin-kicker">LIVE COMMUNITY MAP</span><h2>🌍 Where Tiny Titans is growing</h2><p>Privacy-safe area markers. The detail view uses country → approximate area → user and never exposes exact location data.</p></div></div>
    <div className="creator-globe-stats"><div><strong>{totalUsers}</strong><span>represented users</span></div><div><strong>{countryCount}</strong><span>countries</span></div><div><strong>{areaCount}</strong><span>community areas</span></div><div><strong>{totalSnakes ?? "—"}</strong><span>{totalSnakes === undefined ? "snake count not available" : "tracked snakes"}</span></div></div>
    <div className="creator-globe-panel">
      <div ref={visualRef} className="creator-globe-visual" aria-label="Interactive Tiny Titans community globe">
        <Globe ref={globeRef as never} width={globeSize.width} height={globeSize.height} backgroundColor="rgba(0,0,0,0)" showAtmosphere atmosphereColor="#00AEFF" atmosphereAltitude={0.16} globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg" bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png" polygonsData={countries} polygonGeoJsonGeometry="geometry" polygonCapColor={() => "rgba(111,36,184,0.15)"} polygonSideColor={() => "rgba(0,174,255,0.08)"} polygonStrokeColor={() => "rgba(245,182,66,0.25)"} polygonAltitude={0.002} pointsData={markers} pointLat="lat" pointLng="lng" pointAltitude={0.035} pointRadius={(item) => Math.min(0.8, 0.25 + ((item as Marker).members.length * 0.04))} pointColor={() => "#F5B642"} pointLabel={(item) => { const marker = item as Marker; return `${marker.city} area, ${marker.country} · ${marker.members.length} Titan${marker.members.length === 1 ? "" : "s"}`; }} onPointClick={(item) => { const marker = item as Marker; setSelectedKey(marker.areaId); setAutoRotate(false); }} enablePointerInteraction />
        {mapLoading && <div className="creator-globe-loading">Loading the world map…</div>}<div className="creator-globe-drag-hint">Drag to rotate · pinch to zoom · tap an area for details</div>
      </div>
      <aside className="creator-globe-summary"><div className="creator-globe-summary-title">🌎 Community by location</div><div className="creator-location-controls"><button type="button" className="creator-tool-button" onClick={expandAll}>Expand all</button><button type="button" className="creator-tool-button" onClick={collapseAll}>Collapse all</button></div>
        {locationLoading ? <div className="creator-list-item"><strong>Loading…</strong><span>Reading consented community areas.</span></div> : countryGroups.length === 0 ? <div className="creator-list-item"><strong>No location-sharing users</strong><span>No consented approximate locations are currently available.</span></div> : <div className="creator-location-tree">{countryGroups.map((group) => { const countryKey = normalise(group.country); const countryOpen = expandedCountries.has(countryKey); return <div key={countryKey} className="creator-location-country-group"><button type="button" className="creator-location-tree-row creator-location-country" onClick={() => toggleCountry(group.country)} aria-expanded={countryOpen}><span><span className="creator-location-chevron">{countryOpen ? "▾" : "▸"}</span>🌍 {group.country}</span><strong>{group.members.length} user{group.members.length === 1 ? "" : "s"}</strong></button>{countryOpen && <div className="creator-location-children">{Array.from(group.areas.entries()).sort((a, b) => b[1].members.length - a[1].members.length).map(([areaId, area]) => { const areaOpen = expandedAreas.has(areaId); const marker = markers.find((entry) => entry.areaId === areaId); return <div key={areaId} className="creator-location-area-group"><button type="button" className="creator-location-tree-row creator-location-area" onClick={() => toggleArea(areaId)} aria-expanded={areaOpen}><span><span className="creator-location-chevron">{areaOpen ? "▾" : "▸"}</span>📍 {area.city} area</span><strong>{area.members.length}</strong></button>{areaOpen && <div className="creator-location-users">{area.members.map((member) => <button key={member.uid} type="button" className="creator-location-user" onClick={() => { if (marker) { setSelectedKey(marker.areaId); setAutoRotate(false); } }}><span>👤 {member.displayName || "Anonymous Titan"}</span><small>{member.snakeCount !== undefined ? `${member.snakeCount} snake${member.snakeCount === 1 ? "" : "s"}` : "User"}</small></button>)}</div>}</div>; })}</div>}</div>; })}</div>}
        <button type="button" className="creator-tool-button" onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? "⏸ Pause auto-spin" : "▶ Resume auto-spin"}</button>{locationError && <div className="creator-list-item"><strong>Location feed warning</strong><span>The community location feed could not be refreshed.</span></div>}
      </aside>
    </div>
    {selected && <div className="creator-location-detail"><div className="creator-location-detail-header"><div><span className="creator-admin-kicker">COMMUNITY AREA</span><h3>📍 {selected.city} area, {selected.country}</h3><p>{selected.members.length} user{selected.members.length === 1 ? "" : "s"} have consented to community location visibility in this approximate area. Exact coordinates and addresses are not displayed.</p></div><button type="button" onClick={() => setSelectedKey(null)} aria-label="Close location details">✕</button></div><div className="creator-location-member-grid">{selected.members.map((member) => <div key={member.uid} className="creator-location-member"><span className="creator-location-avatar">👤</span><div><strong>{member.displayName || "Anonymous Titan"}</strong><small>{member.snakeCount !== undefined ? `${member.snakeCount} tracked snake${member.snakeCount === 1 ? "" : "s"}` : "Community member"}</small></div></div>)}</div></div>}
  </section>;
}
