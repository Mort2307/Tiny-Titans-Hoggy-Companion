import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import PageBackButton from "../components/PageBackButton";
import { benchmarkIsUsable, confidenceLabel, getCommunityBenchmarkDataset, type BenchmarkConfidence, type CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import "../styles/CreatorTools.css";

type FilterState = { species: string; sex: string; morph: string; ageBand: string };
const EMPTY_FILTERS: FilterState = { species: "Western Hognose", sex: "", morph: "", ageBand: "" };
const confidenceTone: Record<BenchmarkConfidence, string> = { strong: "🟢", developing: "🟡", limited: "🟠", insufficient: "🔴" };

export default function CreatorBenchmarkDashboard() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [dataset, setDataset] = useState<CommunityBenchmarkDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setDataset(await getCommunityBenchmarkDataset(filters)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Benchmark intelligence could not be loaded."); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return <section className="creator-admin-page">
    <div className="creator-admin-header"><div><PageBackButton fallbackPath="/creator" label="Back to Creator Centre" /><span className="creator-admin-kicker">COMMUNITY INTELLIGENCE</span><h1>🧠 Benchmark Intelligence</h1><p>Audit anonymised community cohorts before benchmarks are exposed to keepers.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button></div>
    <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">COHORT FILTER</span><h2>🔎 Benchmark population</h2><p>Filters narrow the aggregate cohort only. Individual records are never returned.</p></div></div><div className="creator-global-grid">
      <label className="creator-global-card"><span>🦎</span><strong>Species</strong><select value={filters.species} onChange={(e) => setFilters((c) => ({ ...c, species: e.target.value }))}><option value="">All species</option><option value="Western Hognose">Western Hognose</option></select></label>
      <label className="creator-global-card"><span>⚥</span><strong>Sex</strong><select value={filters.sex} onChange={(e) => setFilters((c) => ({ ...c, sex: e.target.value }))}><option value="">All sexes</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
      <label className="creator-global-card"><span>🧬</span><strong>Morph</strong><input value={filters.morph} onChange={(e) => setFilters((c) => ({ ...c, morph: e.target.value }))} placeholder="Optional morph" /></label>
      <label className="creator-global-card"><span>🎂</span><strong>Age band</strong><select value={filters.ageBand} onChange={(e) => setFilters((c) => ({ ...c, ageBand: e.target.value }))}><option value="">All ages</option><option value="juvenile-early">Juvenile · early</option><option value="juvenile-late">Juvenile · late</option><option value="subadult">Subadult</option><option value="adult">Adult</option><option value="mature">Mature</option></select></label>
    </div></section>
    {error && <div className="creator-error">{error}</div>}{loading && <div className="creator-loading">Reading consent-filtered aggregate intelligence…</div>}
    {!loading && dataset && <>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">DATASET HEALTH</span><h2>📊 Cohort strength</h2><p>{dataset.cohortKey} · generated {new Date(dataset.generatedAt).toLocaleString("en-GB")}</p></div></div><div className="creator-global-grid"><div className="creator-global-card"><span>👥</span><strong>{dataset.contributorCount}</strong><label>Contributors</label><small>Consent-eligible contributors.</small></div><div className="creator-global-card"><span>🐍</span><strong>{dataset.snakeCount}</strong><label>Contributing snakes</label><small>Snakes with qualifying history.</small></div><div className="creator-global-card"><span>🔐</span><strong>Aggregate only</strong><label>Privacy boundary</label><small>No UID, name, note, photo or individual record returned.</small></div></div></section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">BENCHMARKS</span><h2>📈 Current benchmark quality</h2><p>Population indicators, not clinical thresholds or keeper scores.</p></div></div><div className="creator-list">{dataset.metrics.map((metric) => { const usable = benchmarkIsUsable(metric); return <div className="creator-list-card" key={metric.metric}><strong>{confidenceTone[metric.confidence]} {metric.label}</strong><span>{confidenceLabel(metric.confidence)} · {metric.sampleSize} records · {metric.contributorCount} contributors</span>{metric.median !== undefined && <span><b>Median:</b> {metric.median.toFixed(1)} {metric.unit} · <b>middle 50%:</b> {metric.lowerQuartile?.toFixed(1)}–{metric.upperQuartile?.toFixed(1)} {metric.unit}</span>}<span>{metric.explanation}</span><span><b>Keeper exposure:</b> {usable ? "Eligible for cautious benchmark display" : "Keep hidden from keeper benchmarking"}</span></div>; })}</div></section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">GUARDRAILS</span><h2>🛡️ Intelligence rules</h2></div></div><div className="creator-list"><div className="creator-list-card"><strong>Minimum cohort</strong><span>Fewer than 5 contributors cannot produce a keeper-facing benchmark.</span></div><div className="creator-list-card"><strong>Robust centre</strong><span>Median and quartiles reduce the influence of extreme records.</span></div><div className="creator-list-card"><strong>No false precision</strong><span>Weak cohorts stay labelled and hidden from keeper benchmarking.</span></div><div className="creator-list-card"><strong>Consent first</strong><span>Only users with optional community husbandry consent contribute.</span></div></div></section>
    </>}
    <Link className="secondary-button" to="/creator">← Creator Centre</Link>
  </section>;
}
