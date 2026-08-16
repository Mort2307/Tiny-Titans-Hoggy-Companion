import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { getCommunityLocationMembers, type CommunityLocationMember } from "../services/communityLocationService";
import "../styles/creatorCommunityGlobeV2.css";

export type CommunityUserLocation = { city: string; country: string };
export type CreatorCommunityGlobeProps = { locations?: CommunityUserLocation[] };
type Coordinate = [number, number];
type GeoFeature = { geometry: unknown };
type GeoJson = { features: GeoFeature[] };
type Marker = { city: string; country: string; lat: number; lng: number; precision: "city" | "country"; members: CommunityLocationMember[] };

const CITY_COORDS: Record<string, Coordinate> = {
  "london|united kingdom":[51.5074,-0.1278],"peterborough|united kingdom":[52.5695,-0.2405],"birmingham|united kingdom":[52.4862,-1.8904],"manchester|united kingdom":[53.4808,-2.2426],"liverpool|united kingdom":[53.4084,-2.9916],"leeds|united kingdom":[53.8008,-1.5491],"sheffield|united kingdom":[53.3811,-1.4701],"bristol|united kingdom":[51.4545,-2.5879],"nottingham|united kingdom":[52.9548,-1.1581],"leicester|united kingdom":[52.6369,-1.1398],"cardiff|united kingdom":[51.4816,-3.1791],"newcastle upon tyne|united kingdom":[54.9783,-1.6178],"edinburgh|united kingdom":[55.9533,-3.1883],"glasgow|united kingdom":[55.8642,-4.2518],"belfast|united kingdom":[54.5973,-5.9301],"brighton|united kingdom":[50.8225,-0.1372],"southampton|united kingdom":[50.9097,-1.4044],"portsmouth|united kingdom":[50.8198,-1.088],"reading|united kingdom":[51.4543,-0.9781],"oxford|united kingdom":[51.752,-1.2577],"cambridge|united kingdom":[52.2053,0.1218],"norwich|united kingdom":[52.6309,1.2974],"york|united kingdom":[53.959,-1.0815],"lincoln|united kingdom":[53.2307,-0.5406],"coventry|united kingdom":[52.4068,-1.5197],"derby|united kingdom":[52.9225,-1.4746],"preston|united kingdom":[53.7632,-2.7031],
  "new york|united states":[40.7128,-74.006],"los angeles|united states":[34.0522,-118.2437],"chicago|united states":[41.8781,-87.6298],"houston|united states":[29.7604,-95.3698],"phoenix|united states":[33.4484,-112.074],"philadelphia|united states":[39.9526,-75.1652],"san diego|united states":[32.7157,-117.1611],"dallas|united states":[32.7767,-96.797],"toronto|canada":[43.6532,-79.3832],"vancouver|canada":[49.2827,-123.1207],"montreal|canada":[45.5019,-73.5674],"sydney|australia":[-33.8688,151.2093],"melbourne|australia":[-37.8136,144.9631],"brisbane|australia":[-27.4698,153.0251],"auckland|new zealand":[-36.8509,174.7645],"paris|france":[48.8566,2.3522],"berlin|germany":[52.52,13.405],"madrid|spain":[40.4168,-3.7038],"rome|italy":[41.9028,12.4964],"amsterdam|netherlands":[52.3676,4.9041],"brussels|belgium":[50.8503,4.3517],"warsaw|poland":[52.2297,21.0122],"lisbon|portugal":[38.7223,-9.1393],"vienna|austria":[48.2082,16.3738],"prague|czechia":[50.0755,14.4377],"tokyo|japan":[35.6762,139.6503],"osaka|japan":[34.6937,135.5023],"beijing|china":[39.9042,116.4074],"shanghai|china":[31.2304,121.4737],"mumbai|india":[19.076,72.8777],"delhi|india":[28.6139,77.209],"cape town|south africa":[-33.9249,18.4241],"dubai|united arab emirates":[25.2048,55.2708],"singapore|singapore":[1.3521,103.8198],"seoul|south korea":[37.5665,126.978]
};
const COUNTRY_CENTROIDS: Record<string, Coordinate> = { "united kingdom":[54.5,-3.4],uk:[54.5,-3.4],england:[52.6,-1.5],scotland:[56.5,-4.2],wales:[52.3,-3.8],"united states":[39.8,-98.6],usa:[39.8,-98.6],canada:[56.1,-106.3],australia:[-25.3,133.8],"new zealand":[-41.3,174.8],france:[46.2,2.2],germany:[51.2,10.4],spain:[40.3,-3.7],italy:[42.8,12.5],netherlands:[52.1,5.3],belgium:[50.8,4.5],poland:[52.1,19.1],portugal:[39.6,-8],austria:[47.6,14.1],japan:[36.2,138.3],china:[35.9,104.2],india:[22,79],"south africa":[-30.6,22.9],"united arab emirates":[24.4,54.4],singapore:[1.35,103.82],"south korea":[35.9,127.8] };
const normalise = (value: string) => value.trim().toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function CreatorCommunityGlobeV2({ locations = [] }: CreatorCommunityGlobeProps) {
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

  useEffect(() => { let active = true; setLocationLoading(true); setLocationError(false); getCommunityLocationMembers().then((items) => { if (active) setMembers(items); }).catch(() => { if (active) setLocationError(true); }).finally(() => { if (active) setLocationLoading(false); }); return () => { active = false; }; }, [locations]);
  useEffect(() => { let active = true; fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then((response) => response.ok ? response.json() as Promise<GeoJson> : Promise.reject(new Error("map"))).then((data) => { if (active) setCountries(data.features ?? []); }).catch(() => undefined).finally(() => { if (active) setMapLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => { const controls = globeRef.current?.controls(); if (!controls) return; controls.enableZoom = true; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.32; controls.rotateSpeed = 0.65; controls.zoomSpeed = 0.7; }, [autoRotate, countries.length, globeSize.width, globeSize.height]);

  const markers = useMemo(() => { const grouped = new Map<string, Marker>(); for (const member of members) { const key = `${normalise(member.city)}|${normalise(member.country)}`; const cityCoords = CITY_COORDS[key]; const countryCoords = COUNTRY_CENTROIDS[normalise(member.country)]; const coords = cityCoords ?? countryCoords; if (!coords) continue; const existing = grouped.get(key); if (existing) existing.members.push(member); else grouped.set(key, { city: member.city, country: member.country, lat: coords[0], lng: coords[1], precision: cityCoords ? "city" : "country", members: [member] }); } return Array.from(grouped.values()); }, [members]);
  const selected = selectedKey ? markers.find((marker) => `${normalise(marker.city)}|${normalise(marker.country)}` === selectedKey) ?? null : null;
  const totalRecords = members.length; const countryCount = new Set(members.map((member) => normalise(member.country))).size; const cityCount = new Set(markers.filter((marker) => marker.precision === "city").map((marker) => `${normalise(marker.city)}|${normalise(marker.country)}`)).size;
  const totalSnakes = members.reduce((sum, member) => sum + (member.snakeCount ?? 0), 0);
  const countriesSummary = useMemo(() => Array.from(new Map(members.map((member) => [normalise(member.country), member.country])).entries()).map(([key, country]) => ({ country, count: members.filter((member) => normalise(member.country) === key).length })).sort((a, b) => b.count - a.count), [members]);

  return <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
    <div className="creator-section-heading"><div><span className="creator-admin-kicker">LIVE COMMUNITY MAP</span><h2>🌍 Where Tiny Titans is growing</h2><p>Consent-backed city-level pins only. No exact addresses or GPS positions are shown.</p></div></div>
    <div className="creator-globe-stats"><div><strong>{totalRecords}</strong><span>consented Titans</span></div><div><strong>{countryCount}</strong><span>countries</span></div><div><strong>{cityCount}</strong><span>cities</span></div><div><strong>{totalSnakes || "—"}</strong><span>{totalSnakes ? "tracked snakes" : "snake count not available"}</span></div></div>
    <div className="creator-globe-panel"><div ref={visualRef} className="creator-globe-visual" aria-label="Interactive Tiny Titans community globe">
      <Globe ref={globeRef as never} width={globeSize.width} height={globeSize.height} backgroundColor="rgba(0,0,0,0)" showAtmosphere atmosphereColor="#00AEFF" atmosphereAltitude={0.16} globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg" bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png" polygonsData={countries} polygonGeoJsonGeometry="geometry" polygonCapColor={() => "rgba(111,36,184,0.15)"} polygonSideColor={() => "rgba(0,174,255,0.08)"} polygonStrokeColor={() => "rgba(245,182,66,0.25)"} polygonAltitude={0.002} pointsData={markers} pointLat="lat" pointLng="lng" pointAltitude={0.035} pointRadius={(item) => Math.min(0.75, 0.24 + ((item as Marker).members.length * 0.035))} pointColor={() => "#F5B642"} pointLabel={(item) => { const marker = item as Marker; return `${marker.city}, ${marker.country} · ${marker.members.length} Titan${marker.members.length === 1 ? "" : "s"}`; }} onPointClick={(item) => { const marker = item as Marker; setSelectedKey(`${normalise(marker.city)}|${normalise(marker.country)}`); setAutoRotate(false); }} enablePointerInteraction />
      {mapLoading && <div className="creator-globe-loading">Loading the world map…</div>}<div className="creator-globe-drag-hint">Drag to rotate · pinch to zoom · tap a pin for details</div>
    </div><aside className="creator-globe-summary"><div className="creator-globe-summary-title">🌎 Community by location</div>{locationLoading ? <div className="creator-list-item"><strong>Loading…</strong><span>Reading consented community locations.</span></div> : countriesSummary.slice(0, 8).map((item) => <button key={item.country} type="button" className="creator-location-country" onClick={() => { const marker = markers.find((entry) => normalise(entry.country) === normalise(item.country)); if (marker) { setSelectedKey(`${normalise(marker.city)}|${normalise(marker.country)}`); setAutoRotate(false); } }}><span>🌍 {item.country}</span><strong>{item.count} Titan{item.count === 1 ? "" : "s"}</strong></button>)}<button type="button" className="creator-tool-button" onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? "⏸ Pause auto-spin" : "▶ Resume auto-spin"}</button>{locationError && <div className="creator-list-item"><strong>Location feed warning</strong><span>The community location feed could not be refreshed.</span></div>}</aside></div>
    {selected && <div className="creator-location-detail"><div className="creator-location-detail-header"><div><span className="creator-admin-kicker">CITY COMMUNITY</span><h3>📍 {selected.city}, {selected.country}</h3><p>{selected.members.length} Titan{selected.members.length === 1 ? "" : "s"} have consented to community location visibility here.</p></div><button type="button" onClick={() => setSelectedKey(null)} aria-label="Close location details">✕</button></div><div className="creator-location-member-grid">{selected.members.map((member) => <div className="creator-location-member" key={member.uid}><span className="creator-location-avatar">{member.displayName.trim().charAt(0).toUpperCase() || "🐍"}</span><div><strong>{member.displayName}</strong><small>{member.role === "admin" ? "👑 Founder / Admin" : "🐍 Titan"}</small></div>{member.snakeCount !== undefined && <span className="creator-location-snakes">🐍 {member.snakeCount}</span>}</div>)}</div></div>}
  </section>;
}
