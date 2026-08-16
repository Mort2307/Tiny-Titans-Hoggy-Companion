import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";

export type CommunityUserLocation = { city: string; country: string };
export type CreatorCommunityGlobeProps = { locations?: CommunityUserLocation[] };

type GeoFeature = {
  type: string;
  properties?: { name?: string };
  geometry: unknown;
};

type GeoJson = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type Marker = CommunityUserLocation & { lat: number; lng: number };

// A deliberately small local city-centre lookup for common community locations.
// Unknown cities fall back to their country's approximate centroid rather than
// sending user-entered location data to a third-party geocoding service.
const KNOWN_CITY_COORDS: Record<string, [number, number]> = {
  "London|United Kingdom": [51.5074, -0.1278],
  "Peterborough|United Kingdom": [52.5695, -0.2405],
  "Birmingham|United Kingdom": [52.4862, -1.8904],
  "Manchester|United Kingdom": [53.4808, -2.2426],
  "Liverpool|United Kingdom": [53.4084, -2.9916],
  "Leeds|United Kingdom": [53.8008, -1.5491],
  "Edinburgh|United Kingdom": [55.9533, -3.1883],
  "Glasgow|United Kingdom": [55.8642, -4.2518],
  "New York|United States": [40.7128, -74.006],
  "Los Angeles|United States": [34.0522, -118.2437],
  "Chicago|United States": [41.8781, -87.6298],
  "Toronto|Canada": [43.6532, -79.3832],
  "Sydney|Australia": [-33.8688, 151.2093],
  "Melbourne|Australia": [-37.8136, 144.9631],
  "Paris|France": [48.8566, 2.3522],
  "Berlin|Germany": [52.52, 13.405],
  "Madrid|Spain": [40.4168, -3.7038],
  "Rome|Italy": [41.9028, 12.4964],
  "Amsterdam|Netherlands": [52.3676, 4.9041],
  "Brussels|Belgium": [50.8503, 4.3517],
  "Warsaw|Poland": [52.2297, 21.0122],
  "Lisbon|Portugal": [38.7223, -9.1393],
  "Sao Paulo|Brazil": [-23.5505, -46.6333],
  "Mexico City|Mexico": [19.4326, -99.1332],
  "Tokyo|Japan": [35.6762, 139.6503],
  "Beijing|China": [39.9042, 116.4074],
  "Shanghai|China": [31.2304, 121.4737],
  "Mumbai|India": [19.076, 72.8777],
  "New Delhi|India": [28.6139, 77.209],
  "Cape Town|South Africa": [-33.9249, 18.4241],
};

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  "United Kingdom": [54.5, -3.4],
  UK: [54.5, -3.4],
  "United States": [39.8, -98.6],
  USA: [39.8, -98.6],
  Canada: [56.1, -106.3],
  Australia: [-25.3, 133.8],
  France: [46.2, 2.2],
  Germany: [51.2, 10.4],
  Spain: [40.3, -3.7],
  Italy: [42.8, 12.5],
  Netherlands: [52.1, 5.3],
  Belgium: [50.8, 4.5],
  Poland: [52.1, 19.1],
  Portugal: [39.6, -8.0],
  Brazil: [-10.8, -51.9],
  Mexico: [23.6, -102.6],
  Japan: [36.2, 138.3],
  China: [35.9, 104.2],
  India: [22.0, 79.0],
  "South Africa": [-30.6, 22.9],
};

function markerFor(location: CommunityUserLocation): Marker {
  const city = location.city.trim();
  const country = location.country.trim();
  const coords = KNOWN_CITY_COORDS[`${city}|${country}`] ?? COUNTRY_CENTROIDS[country] ?? [20, 0];
  return { city, country, lat: coords[0], lng: coords[1] };
}

export default function CreatorCommunityGlobe({ locations = [] }: CreatorCommunityGlobeProps) {
  const globeRef = useRef<{ controls: () => { autoRotate: boolean; autoRotateSpeed: number; enableZoom: boolean } } | undefined>(undefined);
  const [countries, setCountries] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((response) => {
        if (!response.ok) throw new Error(`World map request failed: ${response.status}`);
        return response.json() as Promise<GeoJson>;
      })
      .then((data) => {
        if (!active) return;
        setCountries(data.features ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controls.enableZoom = true;
  }, [countries]);

  const markers = useMemo(() => locations
    .map(markerFor)
    .filter((item) => item.city && item.country), [locations]);

  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    markers.forEach((marker) => {
      const key = `${marker.city}|||${marker.country}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([key, count]) => {
        const [city, country] = key.split("|||");
        return { city, country, count };
      })
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  }, [markers]);

  const countryCount = useMemo(() => new Set(markers.map((marker) => marker.country)).size, [markers]);

  return (
    <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
      <div className="creator-section-heading">
        <div>
          <span className="creator-admin-kicker">PRIVACY-SAFE COMMUNITY MAP</span>
          <h2>🌍 Community Globe</h2>
          <p>Real-world country geography with aggregated city-level community markers. No addresses, GPS coordinates, emails or user IDs are shown.</p>
        </div>
        <div className="creator-badge">{locations.length} opted-in location{locations.length === 1 ? "" : "s"}</div>
      </div>

      <div className="creator-globe-panel">
        <div className="creator-globe-visual creator-globe-visual-live creator-globe-accurate" aria-label="Interactive geographic community globe. Drag to rotate and use the wheel or pinch gesture to zoom.">
          {loading && <div className="creator-globe-loading">Loading accurate world geography…</div>}
          {error && <div className="creator-globe-loading">World geography could not be loaded. Refresh to try again.</div>}
          {!error && (
            <Globe
              ref={globeRef as never}
              width={720}
              height={520}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              polygonsData={countries}
              polygonGeoJsonGeometry="geometry"
              polygonCapColor={() => "rgba(22, 38, 48, 0.35)"}
              polygonSideColor={() => "rgba(11, 24, 31, 0.55)"}
              polygonStrokeColor={() => "rgba(91, 201, 170, 0.45)"}
              polygonAltitude={0.006}
              pointsData={markers}
              pointLat="lat"
              pointLng="lng"
              pointColor={() => "#72e0bb"}
              pointAltitude={0.025}
              pointRadius={0.42}
              pointLabel={(item) => `${(item as Marker).city}, ${(item as Marker).country}`}
              enablePointerInteraction
            />
          )}
          <div className="creator-globe-drag-hint">↔ Drag to rotate · Scroll/pinch to zoom</div>
        </div>

        <div className="creator-globe-summary">
          <div className="creator-list-item"><strong>{cityCounts.length}</strong><span>represented cities</span></div>
          <div className="creator-list-item"><strong>{countryCount}</strong><span>represented countries</span></div>
          {cityCounts.slice(0, 10).map((item) => (
            <div className="creator-list-item" key={`${item.city}-${item.country}`}>
              <strong>{item.city}</strong><span>{item.country} · {item.count} {item.count === 1 ? "user" : "users"}</span>
            </div>
          ))}
          {cityCounts.length === 0 && <div className="creator-list-item"><strong>No locations yet</strong><span>Users can opt in from Data &amp; Privacy.</span></div>}
        </div>
      </div>
    </section>
  );
}
