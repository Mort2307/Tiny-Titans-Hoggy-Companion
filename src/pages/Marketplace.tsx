import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { findUniversalSpecies } from "../data/species/universalSpeciesRegistry";
import { getPublicMarketplaceListings, type PublicMarketplaceListing } from "../services/publicMarketplaceService";
import { useSearchParams } from "react-router-dom";

function formatPrice(listing: PublicMarketplaceListing): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: listing.currency || "GBP" }).format(listing.price);
  } catch {
    return `${listing.currency || "GBP"} ${listing.price.toFixed(2)}`;
  }
}

export default function Marketplace() {
  const [listings, setListings] = useState<PublicMarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const speciesFilter = searchParams.get("species") || "";
  const filteredListings = useMemo(() => speciesFilter ? listings.filter((listing) => listing.speciesId === speciesFilter) : listings, [listings, speciesFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getPublicMarketplaceListings()
      .then((response) => {
        if (!active) return;
        setListings((response.listings ?? []).filter((item) => item.status === "active"));
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "The Marketplace could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="page-container" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 56px" }}>
      <header className="welcome-card" style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontWeight: 800, letterSpacing: ".08em", opacity: .7 }}>TINY TITANS · MARKETPLACE</p>
        <h1 style={{ marginBottom: 8 }}>🛒 Tiny Titans Marketplace</h1>
        <p style={{ marginBottom: 18, maxWidth: 760 }}>Browse active listings from hobbyist sellers, specialist keepers and businesses using Tiny Titans. Species-linked listings connect directly to the same care and health intelligence used across the app.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link className="tt-home-primary" to="/community">Explore Community →</Link>
          <Link className="personalisation-back" to="/paid/marketplace">Seller Marketplace Manager →</Link>
        </div>
      </header>

      {loading && <section className="personalisation-card"><strong>Loading Marketplace…</strong><p>Finding active listings.</p></section>}
      {!loading && error && <section className="personalisation-card"><strong>Marketplace temporarily unavailable</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Retry</button></section>}
      {!loading && !error && listings.length > 0 && speciesFilter && filteredListings.length === 0 && <section className="personalisation-card"><strong>No active listings are linked to this species.</strong><p>Businesses and sellers can add a canonical species link to their listings. Other listings remain discoverable without a species link.</p><button type="button" onClick={() => setSearchParams({})}>Show all Marketplace listings</button></section>}
      {!loading && !error && listings.length === 0 && <section className="personalisation-card"><strong>No active listings yet.</strong><p>Seller inventory will appear here as marketplace listings are published.</p></section>}

      {!loading && !error && filteredListings.length > 0 && (
        <section aria-label="Active Marketplace listings" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {filteredListings.map((listing) => (
            <article key={listing.id} className="personalisation-card" style={{ height: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                  <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", opacity: .65 }}>{listing.category || "Marketplace"}</span>
                  <h2 style={{ margin: "6px 0 8px", fontSize: "1.25rem" }}>{listing.title}</h2>
                  {listing.speciesId && findUniversalSpecies(listing.speciesId) ? (
                    (() => {
                      const species = findUniversalSpecies(listing.speciesId);
                      return (
                        <div style={{ marginBottom: 10, display: "grid", gap: 2 }}>
                          <strong>{species?.commonNames[0]}</strong>
                          <span style={{ fontSize: 12, opacity: .7 }}>{species?.acceptedScientificName} · {species?.className}</span>
                          {species && <Link to={`/species/${species.id}`} style={{ fontSize: 12 }}>View species care & health →</Link>}
                        </div>
                      );
                    })()
                  ) : listing.speciesCommonName ? (
                    <div style={{ marginBottom: 10, display: "grid", gap: 2 }}>
                      <strong>{listing.speciesCommonName}</strong>
                      {listing.scientificName && <span style={{ fontSize: 12, opacity: .7 }}>{listing.scientificName}</span>}
                    </div>
                  ) : null}
                </div>
                {listing.isPromoted && <span aria-label="Promoted listing" title="Promoted listing" style={{ fontWeight: 800 }}>★</span>}
              </div>
              <p style={{ lineHeight: 1.55 }}>{listing.description}</p>
              <strong style={{ display: "block", fontSize: "1.25rem", margin: "14px 0" }}>{formatPrice(listing)}</strong>
              <div style={{ borderTop: "1px solid var(--tt-border, rgba(127,127,127,.2))", paddingTop: 12, display: "grid", gap: 4 }}>
                <strong>{listing.seller.businessName || listing.seller.displayName}</strong>
                <span>{listing.seller.location}</span>
                {listing.seller.contactEmail && <a href={`mailto:${listing.seller.contactEmail}`}>{listing.seller.contactEmail}</a>}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
