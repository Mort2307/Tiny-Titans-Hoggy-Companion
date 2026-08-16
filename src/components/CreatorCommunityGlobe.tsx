import { useMemo } from "react";

export type CommunityUserLocation = { city: string; country: string };
export type CreatorCommunityGlobeProps = { locations?: CommunityUserLocation[] };
type Marker = CommunityUserLocation & { left: number; top: number };

const COUNTRY_POSITIONS: Record<string, { left: number; top: number }> = {
  "United Kingdom": { left: 46, top: 30 }, UK: { left: 46, top: 30 }, England: { left: 46, top: 30 }, Scotland: { left: 45, top: 25 }, Wales: { left: 44, top: 33 }, Ireland: { left: 43, top: 31 },
  "United States": { left: 24, top: 42 }, USA: { left: 24, top: 42 }, Canada: { left: 25, top: 29 }, Australia: { left: 79, top: 72 }, "New Zealand": { left: 88, top: 75 },
  France: { left: 48, top: 36 }, Germany: { left: 51, top: 34 }, Spain: { left: 46, top: 42 }, Italy: { left: 53, top: 41 }, Netherlands: { left: 49, top: 31 }, Belgium: { left: 49, top: 34 }, Poland: { left: 55, top: 32 }, Sweden: { left: 53, top: 22 }, Norway: { left: 51, top: 19 }, Denmark: { left: 51, top: 28 }, Portugal: { left: 43, top: 42 }, Brazil: { left: 34, top: 66 }, Mexico: { left: 24, top: 54 }, Japan: { left: 82, top: 40 }, China: { left: 73, top: 40 }, India: { left: 67, top: 50 }, "South Africa": { left: 56, top: 76 },
};

function fallbackPosition(country: string, index: number) {
  let hash = 0;
  for (const char of country) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return { left: 15 + ((hash + index * 17) % 72), top: 20 + ((hash * 7 + index * 13) % 60) };
}

export default function CreatorCommunityGlobe({ locations = [] }: CreatorCommunityGlobeProps) {
  const summary = useMemo(() => {
    const cityCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    locations.forEach(({ city, country }) => {
      const cleanCity = city.trim(); const cleanCountry = country.trim();
      if (!cleanCity || !cleanCountry) return;
      const key = `${cleanCity}|||${cleanCountry}`;
      cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
      countryCounts.set(cleanCountry, (countryCounts.get(cleanCountry) ?? 0) + 1);
    });
    const markers: Marker[] = Array.from(cityCounts.entries()).map(([key], index) => {
      const [city, country] = key.split("|||");
      return { city, country, ...(COUNTRY_POSITIONS[country] ?? fallbackPosition(country, index)) };
    });
    return {
      markers,
      cities: Array.from(cityCounts.entries()).map(([key, count]) => ({ key, count, city: key.split("|||")[0], country: key.split("|||")[1] })).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
      countries: Array.from(countryCounts.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count || a.country.localeCompare(b.country)),
    };
  }, [locations]);

  return (
    <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">PRIVACY-SAFE COMMUNITY MAP</span><h2>🌍 Community Globe</h2><p>Aggregated city-level locations only. No addresses, GPS coordinates, emails or user IDs are shown.</p></div><div className="creator-badge">{locations.length} opted-in location{locations.length === 1 ? "" : "s"}</div></div>
      <div className="creator-globe-panel">
        <div className="creator-globe-visual creator-globe-visual-live" role="img" aria-label="Privacy-safe community globe showing aggregated city locations">
          <div className="creator-globe-orbit creator-globe-orbit-one" /><div className="creator-globe-orbit creator-globe-orbit-two" /><div className="creator-globe-sphere">🌍</div>
          {summary.markers.map((marker) => <span className="creator-globe-marker" key={`${marker.city}-${marker.country}`} style={{ left: `${marker.left}%`, top: `${marker.top}%` }} title={`${marker.city}, ${marker.country}`} aria-label={`${marker.city}, ${marker.country}`} />)}
        </div>
        <div className="creator-globe-summary">
          <div className="creator-list-item"><strong>{summary.cities.length}</strong><span>represented cities</span></div>
          <div className="creator-list-item"><strong>{summary.countries.length}</strong><span>represented countries</span></div>
          {summary.cities.slice(0, 10).map((item) => <div className="creator-list-item" key={item.key}><strong>{item.city}</strong><span>{item.country} · {item.count} {item.count === 1 ? "user" : "users"}</span></div>)}
          {summary.cities.length === 0 && <div className="creator-list-item"><strong>No locations yet</strong><span>Users can opt in from Data & Privacy.</span></div>}
        </div>
      </div>
    </section>
  );
}
