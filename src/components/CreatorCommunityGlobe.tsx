import { useMemo, useRef, useState } from "react";

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

function wrapPercent(value: number) {
  return ((value % 100) + 100) % 100;
}

export default function CreatorCommunityGlobe({ locations = [] }: CreatorCommunityGlobeProps) {
  const [rotation, setRotation] = useState(0);
  const dragRef = useRef<{ x: number; rotation: number } | null>(null);

  const summary = useMemo(() => {
    const cityCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    locations.forEach(({ city, country }) => {
      const cleanCity = city.trim();
      const cleanCountry = country.trim();
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

  function startDrag(clientX: number) {
    dragRef.current = { x: clientX, rotation };
  }

  function moveDrag(clientX: number) {
    if (!dragRef.current) return;
    const delta = clientX - dragRef.current.x;
    setRotation(dragRef.current.rotation + delta * 0.22);
  }

  function stopDrag() {
    dragRef.current = null;
  }

  return (
    <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
      <div className="creator-section-heading">
        <div><span className="creator-admin-kicker">PRIVACY-SAFE COMMUNITY MAP</span><h2>🌍 Community Globe</h2><p>Aggregated city-level locations only. No addresses, GPS coordinates, emails or user IDs are shown.</p></div>
        <div className="creator-badge">{locations.length} opted-in location{locations.length === 1 ? "" : "s"}</div>
      </div>
      <div className="creator-globe-panel">
        <div
          className="creator-globe-visual creator-globe-visual-live creator-globe-draggable"
          role="application"
          aria-label="Interactive privacy-safe community globe. Drag left or right to rotate."
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startDrag(event.clientX); }}
          onPointerMove={(event) => moveDrag(event.clientX)}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onPointerLeave={stopDrag}
        >
          <div className="creator-globe-sphere-shell">
            <div className="creator-globe-map" style={{ transform: `translateX(${rotation}%)` }} aria-hidden="true">
              <svg viewBox="0 0 1000 500" preserveAspectRatio="none" className="creator-globe-world" aria-hidden="true">
                <path d="M55 120 L105 80 175 78 220 115 205 165 145 175 112 150 72 158 Z M245 250 L285 230 320 260 310 330 270 405 238 360 250 305 Z M410 125 L455 105 500 120 520 155 490 190 465 175 435 200 410 165 Z M500 205 L555 185 620 195 680 165 755 185 820 230 790 275 735 270 690 300 635 280 585 300 545 260 Z M565 305 L610 320 625 375 600 430 560 405 545 350 Z M790 340 L850 330 900 365 875 405 825 395 Z" />
              </svg>
              <div className="creator-globe-grid creator-globe-grid-one" />
              <div className="creator-globe-grid creator-globe-grid-two" />
            </div>
            <div className="creator-globe-marker-layer">
              {summary.markers.map((marker) => <span className="creator-globe-marker" key={`${marker.city}-${marker.country}`} style={{ left: `${wrapPercent(marker.left + rotation)}%`, top: `${marker.top}%` }} title={`${marker.city}, ${marker.country}`} aria-label={`${marker.city}, ${marker.country}`} />)}
            </div>
            <div className="creator-globe-highlight" />
          </div>
          <div className="creator-globe-drag-hint">↔ Drag to rotate</div>
        </div>
        <div className="creator-globe-summary">
          <div className="creator-list-item"><strong>{summary.cities.length}</strong><span>represented cities</span></div>
          <div className="creator-list-item"><strong>{summary.countries.length}</strong><span>represented countries</span></div>
          {summary.cities.slice(0, 10).map((item) => <div className="creator-list-item" key={item.key}><strong>{item.city}</strong><span>{item.country} · {item.count} {item.count === 1 ? "user" : "users"}</span></div>)}
          {summary.cities.length === 0 && <div className="creator-list-item"><strong>No locations yet</strong><span>Users can opt in from Data &amp; Privacy.</span></div>}
        </div>
      </div>
    </section>
  );
}
