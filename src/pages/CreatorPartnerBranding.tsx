import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCreatorPartnerLandings } from "../services/partnerLandingService";
import type { PartnerLandingProfile } from "../types/partnerLanding";
import "../styles/creatorOperations.css";

export default function CreatorPartnerBranding() {
  const [items, setItems] = useState<PartnerLandingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await getCreatorPartnerLandings());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Partner profiles could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.brandName, item.slug, item.kind, item.contact?.townCity].join(" ").toLowerCase().includes(term));
  }, [items, search]);

  return <main className="creator-section-page">
    <header className="creator-section-header"><div><span>PARTNER BRANDING</span><h1>🏢 Business &amp; rescue pages</h1><p>Review the customer-facing profiles that make participating businesses and rescues feel like their own organisations inside TinyTitans.</p></div><Link to="/creator" className="creator-ops-secondary">← Creator Centre</Link></header>
    <section className="creator-section-panel">
      <div className="creator-section-panel-heading"><div><span>PUBLIC PROFILES</span><h2>Published and draft landing pages</h2><p>Creator access is handled server-side so the dashboard does not depend on a client-side Firestore collection rule.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input className="creator-search-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search organisation, slug or town…" /><button type="button" className="creator-ops-secondary" onClick={() => void load()} disabled={loading}>↻ Refresh</button></div></div>
      {error && <div className="creator-section-error" role="alert">{error}</div>}
      {loading ? <p>Loading partner profiles…</p> : filtered.length === 0 ? <div className="creator-section-empty"><strong>No partner landing profiles found.</strong><p>Eligible Business and Rescue owners can create their page from the Partner Branding route.</p><Link to="/creator" className="creator-ops-secondary">Return to Creator Centre</Link></div> : <div className="creator-run-list">{filtered.map(item => <article key={item.id}><div><strong>{item.brandName}</strong><small>{item.kind === "rescue" ? "Rescue Centre" : "Reptile Business"} · /partner/{item.slug}</small></div><span className={item.publicEnabled ? "creator-run-status creator-run-status-ready" : "creator-run-status creator-run-status-draft"}>{item.publicEnabled ? "Published" : "Draft"}</span><Link to={`/creator/partner-branding/edit?uid=${encodeURIComponent(item.ownerUid)}`} className="creator-ops-secondary">Edit</Link>{item.publicEnabled && <a href={`/partner/${item.slug}`} target="_blank" rel="noreferrer" className="creator-ops-secondary">Open</a>}</article>)}</div>}
    </section>
  </main>;
}
