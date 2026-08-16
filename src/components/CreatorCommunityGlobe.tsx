import { useEffect, useMemo, useState } from "react";
import { getCommunityLocationAggregates } from "../services/privacyService";
import type { CommunityLocationAggregate } from "../types/privacy";

export default function CreatorCommunityGlobe() {
  const [locations, setLocations] = useState<CommunityLocationAggregate[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { void getCommunityLocationAggregates().then(setLocations).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Community locations could not be loaded.")).finally(() => setLoading(false)); }, []);
  const countries = useMemo(() => { const counts = new Map<string, number>(); for (const item of locations) counts.set(item.country, (counts.get(item.country) ?? 0) + item.users); return [...counts.entries()].sort((a, b) => b[1] - a[1]); }, [locations]);
  const totalUsers = locations.reduce((sum, item) => sum + item.users, 0);
  return <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">CONSENTED COMMUNITY DATA</span><h2>🌍 Tiny Titans Community Globe</h2><p>City-level aggregation only. No addresses, exact GPS or individual location records are displayed.</p></div></div>{loading ? <div className="creator-loading">Loading aggregated community locations…</div> : error ? <div className="creator-error">{error}</div> : <><div className="creator-global-grid"><div className="creator-global-card"><span>👥</span><strong>{totalUsers.toLocaleString("en-GB")}</strong><label>Location-sharing users</label><small>{countries.length} countries · {locations.length} cities</small></div>{countries.slice(0, 5).map(([country, users]) => <div className="creator-global-card" key={country}><span>📍</span><strong>{users.toLocaleString("en-GB")}</strong><label>{country}</label><small>Aggregated users</small></div>)}</div><div className="creator-list">{locations.slice(0, 30).map((location) => <article className="creator-list-card" key={`${location.country}-${location.city}`}><div className="creator-list-top"><h3>{location.city}</h3><strong>{location.users.toLocaleString("en-GB")}</strong></div><p>{location.country}</p></article>)}</div></>}</section>;
}
