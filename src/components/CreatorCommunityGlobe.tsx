import { useEffect, useMemo, useState } from "react";
import { getCommunityLocationAggregates } from "../services/privacyService";
import type { CommunityLocationAggregate } from "../types/privacy";

export default function CreatorCommunityGlobe() {
  const [locations, setLocations] = useState<CommunityLocationAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    void getCommunityLocationAggregates()
      .then(setLocations)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Community locations could not be loaded."),
      )
      .finally(() => setLoading(false));
  }, []);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of locations) {
      counts.set(item.country, (counts.get(item.country) ?? 0) + item.users);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [locations]);

  const selectedCountryLocations = useMemo(() => {
    if (!selectedCountry) return [];
    return locations
      .filter((location) => location.country === selectedCountry)
      .sort((a, b) => b.users - a.users);
  }, [locations, selectedCountry]);

  const selectedCountryUsers = selectedCountryLocations.reduce((sum, location) => sum + location.users, 0);
  const totalUsers = locations.reduce((sum, item) => sum + item.users, 0);

  return (
    <section className="creator-admin-section">
      <div className="creator-section-heading">
        <div>
          <span className="creator-admin-kicker">CONSENTED COMMUNITY DATA</span>
          <h2>🌍 Tiny Titans Community Globe</h2>
          <p>
            City-level aggregation only. No addresses, exact GPS or individual location records are displayed.
            Select a country to explore its aggregated community.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="creator-loading">Loading aggregated community locations…</div>
      ) : error ? (
        <div className="creator-error">{error}</div>
      ) : (
        <>
          <div className="creator-global-grid">
            <div className="creator-global-card">
              <span>👥</span>
              <strong>{totalUsers.toLocaleString("en-GB")}</strong>
              <label>Location-sharing users</label>
              <small>{countries.length} countries · {locations.length} cities</small>
            </div>

            {countries.slice(0, 5).map(([country, users]) => (
              <button
                type="button"
                className="creator-global-card"
                key={country}
                onClick={() => setSelectedCountry(country)}
                aria-label={`Show aggregated users in ${country}`}
                aria-pressed={selectedCountry === country}
              >
                <span>📍</span>
                <strong>{users.toLocaleString("en-GB")}</strong>
                <label>{country}</label>
                <small>Click to explore cities</small>
              </button>
            ))}
          </div>

          {selectedCountry && (
            <div className="creator-list" role="region" aria-label={`${selectedCountry} community details`}>
              <div className="creator-section-heading">
                <div>
                  <span className="creator-admin-kicker">COUNTRY BREAKDOWN</span>
                  <h2>📍 {selectedCountry}</h2>
                  <p>
                    {selectedCountryUsers.toLocaleString("en-GB")} consenting location-sharing users across {selectedCountryLocations.length} recorded cities.
                    Individual users are never exposed.
                  </p>
                </div>
                <button type="button" className="creator-action-button" onClick={() => setSelectedCountry(null)}>
                  Close
                </button>
              </div>

              {selectedCountryLocations.length === 0 ? (
                <div className="creator-loading">No aggregated city data is available for this country.</div>
              ) : (
                selectedCountryLocations.map((location) => (
                  <article className="creator-list-card" key={`${location.country}-${location.city}`}>
                    <div className="creator-list-top">
                      <h3>{location.city}</h3>
                      <strong>{location.users.toLocaleString("en-GB")}</strong>
                    </div>
                    <p>{location.country} · aggregated users</p>
                  </article>
                ))
              )}
            </div>
          )}

          {!selectedCountry && (
            <div className="creator-list">
              {locations.slice(0, 30).map((location) => (
                <article className="creator-list-card" key={`${location.country}-${location.city}`}>
                  <div className="creator-list-top">
                    <h3>{location.city}</h3>
                    <strong>{location.users.toLocaleString("en-GB")}</strong>
                  </div>
                  <p>{location.country}</p>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
