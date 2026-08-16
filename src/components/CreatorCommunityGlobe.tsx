import { useMemo } from "react";

/**
 * Privacy-safe Creator Hub globe foundation.
 *
 * This component deliberately renders aggregated/city-level information only.
 * It does not expose addresses, coordinates, email addresses, or user IDs.
 * The visual layer is kept dependency-free so Creator Hub remains build-safe
 * while the underlying community aggregation evolves.
 */
export default function CreatorCommunityGlobe() {
  const regions = useMemo(
    () => [
      { label: "UK", value: "Community locations are aggregated by city" },
      { label: "Worldwide", value: "No personal addresses are displayed" },
    ],
    []
  );

  return (
    <section className="creator-admin-section creator-globe-section" aria-label="Community location overview">
      <div className="creator-section-heading">
        <div>
          <span className="creator-admin-kicker">PRIVACY-SAFE LOCATION</span>
          <h2>🌍 Community Globe</h2>
          <p>
            Community location data is designed for city-level aggregation only. Personal
            addresses and precise user coordinates are never exposed in the Creator Hub.
          </p>
        </div>
      </div>

      <div className="creator-globe-panel">
        <div className="creator-globe-visual" role="img" aria-label="Privacy-safe community globe placeholder">
          <div className="creator-globe-orbit creator-globe-orbit-one" />
          <div className="creator-globe-orbit creator-globe-orbit-two" />
          <div className="creator-globe-sphere">🌍</div>
        </div>
        <div className="creator-globe-summary">
          {regions.map((region) => (
            <div className="creator-list-item" key={region.label}>
              <strong>{region.label}</strong>
              <span>{region.value}</span>
            </div>
          ))}
          <div className="creator-badge">PRIVACY FIRST</div>
        </div>
      </div>
    </section>
  );
}
