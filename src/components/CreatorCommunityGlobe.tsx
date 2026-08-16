import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { getCommunityUserLocations } from "../services/creatorService";

export type CommunityUserLocation = { city: string; country: string };
export type CreatorCommunityGlobeProps = { locations?: CommunityUserLocation[] };

type GeoFeature = { type: string; properties?: { name?: string }; geometry: unknown };
type GeoJson = { type: "FeatureCollection"; features: GeoFeature[] };
type Marker = CommunityUserLocation & { lat: number; lng: number; precision: "city" | "country" };
type Coordinate = [number, number];

const CITY_COORDS: Record<string, Coordinate> = {
  "london|united kingdom": [51.5074, -0.1278], "peterborough|united kingdom": [52.5695, -0.2405], "birmingham|united kingdom": [52.4862, -1.8904], "manchester|united kingdom": [53.4808, -2.2426], "liverpool|united kingdom": [53.4084, -2.9916], "leeds|united kingdom": [53.8008, -1.5491], "sheffield|united kingdom": [53.3811, -1.4701], "bristol|united kingdom": [51.4545, -2.5879], "nottingham|united kingdom": [52.9548, -1.1581], "leicester|united kingdom": [52.6369, -1.1398], "coventry|united kingdom": [52.4068, -1.5197], "cardiff|united kingdom": [51.4816, -3.1791], "swansea|united kingdom": [51.6214, -3.9436], "newcastle upon tyne|united kingdom": [54.9783, -1.6178], "newcastle|united kingdom": [54.9783, -1.6178], "sunderland|united kingdom": [54.9069, -1.3838], "york|united kingdom": [53.959, -1.0815], "hull|united kingdom": [53.7676, -0.3274], "lincoln|united kingdom": [53.2307, -0.5406], "peterborough|uk": [52.5695, -0.2405], "edinburgh|united kingdom": [55.9533, -3.1883], "glasgow|united kingdom": [55.8642, -4.2518], "aberdeen|united kingdom": [57.1497, -2.0943], "dundee|united kingdom": [56.462, -2.9707], "belfast|united kingdom": [54.5973, -5.9301], "brighton|united kingdom": [50.8225, -0.1372], "southampton|united kingdom": [50.9097, -1.4044], "portsmouth|united kingdom": [50.8198, -1.088], "reading|united kingdom": [51.4543, -0.9781], "oxford|united kingdom": [51.752, -1.2577], "cambridge|united kingdom": [52.2053, 0.1218], "norwich|united kingdom": [52.6309, 1.2974], "ipswich|united kingdom": [52.0567, 1.1482], "milton keynes|united kingdom": [52.0406, -0.7594], "luton|united kingdom": [51.8787, -0.4200], "stoke-on-trent|united kingdom": [53.0027, -2.1794], "wolverhampton|united kingdom": [52.5862, -2.128], "derby|united kingdom": [52.9225, -1.4746], "exeter|united kingdom": [50.7184, -3.5339], "plymouth|united kingdom": [50.3755, -4.1427], "bath|united kingdom": [51.3811, -2.359], "canterbury|united kingdom": [51.2802, 1.0789], "dover|united kingdom": [51.1279, 1.3134], "blackpool|united kingdom": [53.8175, -3.0357], "bolton|united kingdom": [53.5785, -2.4299], "warrington|united kingdom": [53.390, -2.596], "wigan|united kingdom": [53.545, -2.6325], "stockport|united kingdom": [53.4106, -2.1575], "crewe|united kingdom": [53.0997, -2.441], "chester|united kingdom": [53.1934, -2.8931], "wakefield|united kingdom": [53.6833, -1.4977], "bradford|united kingdom": [53.795, -1.7594], "doncaster|united kingdom": [53.5228, -1.1285], "middlesbrough|united kingdom": [54.5742, -1.235], "carlisle|united kingdom": [54.8951, -2.9382], "preston|united kingdom": [53.7632, -2.7031], "bangor|united kingdom": [53.2275, -4.1293], "wrexham|united kingdom": [53.0465, -2.9913], "newport|united kingdom": [51.5842, -2.9977], "inverness|united kingdom": [57.4778, -4.2247], "jersey|jersey": [49.1900, -2.1100], "guernsey|guernsey": [49.4561, -2.5853],
  "new york|united states": [40.7128, -74.006], "new york city|united states": [40.7128, -74.006], "los angeles|united states": [34.0522, -118.2437], "chicago|united states": [41.8781, -87.6298], "houston|united states": [29.7604, -95.3698], "phoenix|united states": [33.4484, -112.074], "philadelphia|united states": [39.9526, -75.1652], "san antonio|united states": [29.4241, -98.4936], "san diego|united states": [32.7157, -117.1611], "dallas|united states": [32.7767, -96.797], "toronto|canada": [43.6532, -79.3832], "vancouver|canada": [49.2827, -123.1207], "montreal|canada": [45.5019, -73.5674], "calgary|canada": [51.0447, -114.0719], "sydney|australia": [-33.8688, 151.2093], "melbourne|australia": [-37.8136, 144.9631], "brisbane|australia": [-27.4698, 153.0251], "perth|australia": [-31.9505, 115.8605], "adelaide|australia": [-34.9285, 138.6007], "auckland|new zealand": [-36.8509, 174.7645], "wellington|new zealand": [-41.2866, 174.7756], "christchurch|new zealand": [-43.5321, 172.6362], "paris|france": [48.8566, 2.3522], "marseille|france": [43.2965, 5.3698], "lyon|france": [45.764, 4.8357], "berlin|germany": [52.52, 13.405], "munich|germany": [48.1351, 11.582], "hamburg|germany": [53.5511, 9.9937], "madrid|spain": [40.4168, -3.7038], "barcelona|spain": [41.3874, 2.1686], "rome|italy": [41.9028, 12.4964], "milan|italy": [45.4642, 9.19], "amsterdam|netherlands": [52.3676, 4.9041], "brussels|belgium": [50.8503, 4.3517], "warsaw|poland": [52.2297, 21.0122], "lisbon|portugal": [38.7223, -9.1393], "vienna|austria": [48.2082, 16.3738], "prague|czechia": [50.0755, 14.4378], "prague|czech republic": [50.0755, 14.4378], "sao paulo|brazil": [-23.5505, -46.6333], "rio de janeiro|brazil": [-22.9068, -43.1729], "mexico city|mexico": [19.4326, -99.1332], "buenos aires|argentina": [-34.6037, -58.3816], "tokyo|japan": [35.6762, 139.6503], "osaka|japan": [34.6937, 135.5023], "beijing|china": [39.9042, 116.4074], "shanghai|china": [31.2304, 121.4737], "hong kong|hong kong": [22.3193, 114.1694], "mumbai|india": [19.076, 72.8777], "delhi|india": [28.6139, 77.209], "new delhi|india": [28.6139, 77.209], "bangalore|india": [12.9716, 77.5946], "cape town|south africa": [-33.9249, 18.4241], "johannesburg|south africa": [-26.2041, 28.0473], "dubai|united arab emirates": [25.2048, 55.2708], "singapore|singapore": [1.3521, 103.8198], "seoul|south korea": [37.5665, 126.978],
};

const COUNTRY_CENTROIDS: Record<string, Coordinate> = { "united kingdom": [54.5, -3.4], uk: [54.5, -3.4], england: [52.6, -1.5], scotland: [56.5, -4.2], wales: [52.3, -3.8], "united states": [39.8, -98.6], usa: [39.8, -98.6], canada: [56.1, -106.3], australia: [-25.3, 133.8], "new zealand": [-41.3, 174.8], france: [46.2, 2.2], germany: [51.2, 10.4], spain: [40.3, -3.7], italy: [42.8, 12.5], netherlands: [52.1, 5.3], belgium: [50.8, 4.5], poland: [52.1, 19.1], portugal: [39.6, -8], austria: [47.6, 14.1], brazil: [-10.8, -51.9], mexico: [23.6, -102.6], argentina: [-38.4, -63.6], japan: [36.2, 138.3], china: [35.9, 104.2], india: [22, 79], "south africa": [-30.6, 22.9], "united arab emirates": [24.4, 54.4], singapore: [1.35, 103.82], "south korea": [35.9, 127.8] };

function normalise(value: string) { return value.trim().toLocaleLowerCase("en-GB").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function markerFor(location: CommunityUserLocation): Marker { const city = location.city.trim(); const country = location.country.trim(); const cityCoords = CITY_COORDS[`${normalise(city)}|${normalise(country)}`]; if (cityCoords) return { city, country, lat: cityCoords[0], lng: cityCoords[1], precision: "city" }; const countryCoords = COUNTRY_CENTROIDS[normalise(country)]; if (countryCoords) return { city, country, lat: countryCoords[0], lng: countryCoords[1], precision: "country" }; return { city, country, lat: 20, lng: 0, precision: "country" }; }

export default function CreatorCommunityGlobe({ locations = [] }: CreatorCommunityGlobeProps) {
  const globeRef = useRef<{ controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean; enableDamping: boolean; dampingFactor: number; enablePan: boolean } } | undefined>(undefined);
  const [countries, setCountries] = useState<GeoFeature[]>([]);
  const [liveLocations, setLiveLocations] = useState<CommunityUserLocation[]>(locations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => { setLiveLocations(locations); }, [locations]);
  useEffect(() => {
    if (locations.length > 0) return;
    let active = true;
    getCommunityUserLocations().then((items) => { if (active) setLiveLocations(items); }).catch(() => { if (active) setLocationError(true); });
    return () => { active = false; };
  }, [locations.length]);
  useEffect(() => {
    let active = true;
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((response) => { if (!response.ok) throw new Error(`World map request failed: ${response.status}`); return response.json() as Promise<GeoJson>; })
      .then((data) => { if (!active) return; setCountries(data.features ?? []); setLoading(false); })
      .catch(() => { if (!active) return; setError(true); setLoading(false); });
    return () => { active = false; };
  }, []);

  const configureControls = () => { const controls = globeRef.current?.controls(); if (!controls) return; controls.enableZoom = true; controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.35; };
  useEffect(() => { const controls = globeRef.current?.controls(); if (controls) controls.autoRotate = autoRotate; }, [autoRotate]);

  const markers = useMemo(() => liveLocations.map(markerFor).filter((item) => item.city && item.country), [liveLocations]);
  const cityCounts = useMemo(() => { const counts = new Map<string, number>(); markers.forEach((marker) => { const key = `${marker.city}|||${marker.country}`; counts.set(key, (counts.get(key) ?? 0) + 1); }); return Array.from(counts.entries()).map(([key, count]) => { const [city, country] = key.split("|||"); return { city, country, count }; }).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)); }, [markers]);
  const countryCount = useMemo(() => new Set(markers.map((marker) => marker.country)).size, [markers]);
  const cityPreciseCount = useMemo(() => markers.filter((marker) => marker.precision === "city").length, [markers]);
  const uniqueCityMarkers = useMemo(() => { const seen = new Set<string>(); return markers.filter((marker) => { const key = `${marker.city}|||${marker.country}`; if (seen.has(key)) return false; seen.add(key); return true; }).map((marker) => ({ ...marker, userCount: cityCounts.find((item) => item.city === marker.city && item.country === marker.country)?.count ?? 1 })); }, [markers, cityCounts]);

  return (
    <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">PRIVACY-SAFE COMMUNITY MAP</span><h2>🌍 Community Globe</h2><p>Opted-in community locations shown at city-centre level only. No addresses, GPS coordinates, emails or user IDs are shown.</p></div><div className="creator-badge">{liveLocations.length} opted-in location{liveLocations.length === 1 ? "" : "s"}</div></div>
      <div className="creator-globe-panel">
        <div className="creator-globe-visual creator-globe-visual-live creator-globe-accurate" aria-label="Interactive geographic community globe. Drag in any direction to rotate and use the wheel or pinch gesture to zoom.">
          {loading && <div className="creator-globe-loading">Loading accurate world geography…</div>}
          {error && <div className="creator-globe-loading">World geography could not be loaded. Refresh to try again.</div>}
          {!error && <Globe ref={globeRef as never} width={720} height={520} backgroundColor="rgba(0,0,0,0)" globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg" bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png" polygonsData={countries} polygonGeoJsonGeometry="geometry" polygonCapColor={() => "rgba(22, 38, 48, 0.35)"} polygonSideColor={() => "rgba(11, 24, 31, 0.55)"} polygonStrokeColor={() => "rgba(91, 201, 170, 0.45)"} polygonAltitude={0.006} pointsData={uniqueCityMarkers} pointLat="lat" pointLng="lng" pointColor={() => "#72e0bb"} pointAltitude={0.04} pointRadius={(item) => Math.min(0.8, 0.42 + (((item as Marker & { userCount: number }).userCount - 1) * 0.06))} pointLabel={(item) => { const marker = item as Marker & { userCount: number }; return `${marker.city}, ${marker.country} · ${marker.userCount} opted-in ${marker.userCount === 1 ? "user" : "users"}`; }} enablePointerInteraction onGlobeReady={configureControls} />}
          <div className="creator-globe-drag-hint">↔ ↕ Drag in any direction · Scroll/pinch to zoom</div>
        </div>
        <div className="creator-globe-summary">
          <button type="button" className="creator-tool-button" onClick={() => setAutoRotate((current) => !current)}>{autoRotate ? "⏸ Stop auto-rotate" : "▶ Auto-rotate"}</button>
          <div className="creator-list-item"><strong>{cityCounts.length}</strong><span>represented cities</span></div>
          <div className="creator-list-item"><strong>{countryCount}</strong><span>represented countries</span></div>
          <div className="creator-list-item"><strong>{cityPreciseCount}</strong><span>city-centre markers</span></div>
          {locationError && <div className="creator-list-item"><strong>Location data unavailable</strong><span>Check Creator permissions and refresh.</span></div>}
          {cityCounts.slice(0, 10).map((item) => <div className="creator-list-item" key={`${item.city}-${item.country}`}><strong>{item.city}</strong><span>{item.country} · {item.count} {item.count === 1 ? "user" : "users"}</span></div>)}
          {cityCounts.length === 0 && !locationError && <div className="creator-list-item"><strong>No locations yet</strong><span>Users can opt in from Data &amp; Privacy.</span></div>}
        </div>
      </div>
    </section>
  );
}
