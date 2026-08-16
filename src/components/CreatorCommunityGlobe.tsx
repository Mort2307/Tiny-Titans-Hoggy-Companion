import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeProps } from "react-globe.gl";
import FullScreenSubview from "./FullScreenSubview";
import { getCommunityLocationAggregates } from "../services/privacyService";
import type { CommunityLocationAggregate } from "../types/privacy";

type CountryFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: unknown;
};

type CountryCollection = { type: "FeatureCollection"; features: CountryFeature[] };
type PolygonGeometry = Parameters<NonNullable<GlobeProps["polygonGeoJsonGeometry"]>> extends [object]
  ? ReturnType<Extract<NonNullable<GlobeProps["polygonGeoJsonGeometry"]>, (...args: any[]) => any>>
  : never;

const COUNTRY_GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

function countryName(feature: CountryFeature) {
  const properties = feature.properties ?? {};
  const value = properties.ADMIN ?? properties.NAME ?? properties.name ?? properties.COUNTRY;
  return typeof value === "string" ? value : "";
}

export default function CreatorCommunityGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<CommunityLocationAggregate[]>([]);
  const [countriesGeoJson, setCountriesGeoJson] = useState<CountryCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(true);
  const [error, setError] = useState("");
  const [geoError, setGeoError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: 720, height: 560 });

  useEffect(() => {
    void getCommunityLocationAggregates()
      .then(setLocations)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Community locations could not be loaded."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(COUNTRY_GEOJSON_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Country map data returned ${response.status}.`);
        return response.json() as Promise<CountryCollection>;
      })
      .then(setCountriesGeoJson)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setGeoError("The interactive map could not be loaded. Country cards remain available below.");
      })
      .finally(() => setGeoLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      const width = Math.max(280, Math.floor(element.clientWidth));
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const height = Math.max(320, Math.min(isPortrait ? 560 : 620, Math.floor(width * (isPortrait ? 1.05 : 0.72))));
      setViewport({ width, height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("orientationchange", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of locations) counts.set(item.country, (counts.get(item.country) ?? 0) + item.users);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [locations]);

  const selectedCountryLocations = useMemo(() => {
    if (!selectedCountry) return [];
    return locations.filter((location) => location.country === selectedCountry).sort((a, b) => b.users - a.users);
  }, [locations, selectedCountry]);

  const totalUsers = locations.reduce((sum, item) => sum + item.users, 0);

  if (selectedCountry) {
    const selectedCountryUsers = selectedCountryLocations.reduce((sum, location) => sum + location.users, 0);
    return (
      <FullScreenSubview
        eyebrow="COUNTRY BREAKDOWN"
        title={`📍 ${selectedCountry}`}
        description={`${selectedCountryUsers.toLocaleString("en-GB")} consenting location-sharing users across ${selectedCountryLocations.length} recorded cities. Individual users are never exposed.`}
        onBack={() => setSelectedCountry(null)}
      >
        {selectedCountryLocations.length === 0 ? (
          <div className="creator-loading">No aggregated city data is available for this country.</div>
        ) : (
          <div className="creator-list creator-drilldown-list">
            {selectedCountryLocations.map((location) => (
              <article className="creator-list-card" key={`${location.country}-${location.city}`}>
                <div className="creator-list-top">
                  <h3>{location.city}</h3>
                  <strong>{location.users.toLocaleString("en-GB")}</strong>
                </div>
                <p>{location.country} · aggregated users</p>
              </article>
            ))}
          </div>
        )}
      </FullScreenSubview>
    );
  }

  return (
    <section className="creator-admin-section creator-globe-view">
      <div className="creator-section-heading">
        <div>
          <span className="creator-admin-kicker">CONSENTED COMMUNITY DATA</span>
          <h2>🌍 Tiny Titans Community Globe</h2>
          <p>City-level aggregation only. No addresses, exact GPS or individual location records are displayed. Select any country on the globe or from the cards below.</p>
        </div>
      </div>

      {loading ? (
        <div className="creator-loading">Loading aggregated community locations…</div>
      ) : error ? (
        <div className="creator-error">{error}</div>
      ) : (
        <>
          <div ref={containerRef} className="creator-globe-canvas" aria-label="Interactive community globe">
            {geoLoading ? (
              <div className="creator-loading">Loading interactive globe…</div>
            ) : countriesGeoJson ? (
              <Globe
                width={viewport.width}
                height={viewport.height}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                showAtmosphere
                atmosphereColor="#00AEFF"
                atmosphereAltitude={0.16}
                polygonsData={countriesGeoJson.features}
                polygonGeoJsonGeometry={(feature): PolygonGeometry => (feature as CountryFeature).geometry as PolygonGeometry}
                polygonCapColor={(feature) => {
                  const name = countryName(feature as CountryFeature);
                  return countries.some(([country]) => country === name) ? "rgba(111,36,184,0.82)" : "rgba(255,255,255,0.07)";
                }}
                polygonSideColor={() => "rgba(20,5,30,0.45)"}
                polygonStrokeColor={() => "rgba(0,174,255,0.35)"}
                polygonAltitude={(feature) => (countries.some(([country]) => country === countryName(feature as CountryFeature)) ? 0.012 : 0.003)}
                polygonLabel={(feature) => {
                  const name = countryName(feature as CountryFeature);
                  const users = countries.find(([country]) => country === name)?.[1] ?? 0;
                  return `<div style="padding:6px 9px"><strong>${name}</strong><br/>${users.toLocaleString("en-GB")} consenting users</div>`;
                }}
                onPolygonClick={(feature) => {
                  const name = countryName(feature as CountryFeature);
                  if (name) setSelectedCountry(name);
                }}
                polygonsTransitionDuration={300}
                animateIn
              />
            ) : null}
          </div>
          {geoError && <div className="creator-error creator-globe-fallback">{geoError}</div>}

          <div className="creator-global-grid creator-globe-summary-grid">
            <div className="creator-global-card creator-global-card-users">
              <span>👥</span><strong>{totalUsers.toLocaleString("en-GB")}</strong><label>Location-sharing users</label><small>{countries.length} countries · {locations.length} cities</small>
            </div>
            {countries.map(([country, users]) => (
              <button type="button" className="creator-global-card creator-global-card-button" key={country} onClick={() => setSelectedCountry(country)} aria-label={`Open ${country} community details`}>
                <span>📍</span><strong>{users.toLocaleString("en-GB")}</strong><label>{country}</label><small>Open country view →</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
