import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCreatorReports, getFounderApplications, getGlobalStats, getMorphImageSubmissions, type GlobalStats } from "../services/creatorService";
import "../styles/CreatorTools.css";

const EMPTY_STATS: GlobalStats = { registeredUsers: 0, activeUsers: 0, snakeProfiles: 0, mealsFed: 0, weightLogs: 0, totalWeightKg: 0, totalWeightLb: 0, shedsLogged: 0, totalShedLengthCm: 0, totalShedLengthIn: 0, geneticsCalculations: 0 };
const number = (value: number) => new Intl.NumberFormat("en-GB").format(value);

export default function CreatorHub() {
  const [stats, setStats] = useState<GlobalStats>(EMPTY_STATS);
  const [reportCount, setReportCount] = useState(0);
  const [founderCount, setFounderCount] = useState(0);
  const [morphCount, setMorphCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [global, reports, founders, morphs] = await Promise.all([getGlobalStats(), getCreatorReports(), getFounderApplications(), getMorphImageSubmissions()]);
      setStats(global);
      setReportCount(reports.filter((item) => item.status === "Pending" || item.status === "Reviewing" || item.status === "Fixing" || item.status === "Testing").length);
      setFounderCount(founders.filter((item) => item.status === "Pending").length);
      setMorphCount(morphs.filter((item) => item.status === "Pending" || item.status === "NeedsInfo").length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creator data could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return <main className="creator-admin-page">
    <header className="creator-admin-header">
      <div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🛠️ Tiny Titans Creator Hub</h1><p>Your command centre for community, app health, moderation and growth.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button>
    </header>
    {error && <div className="creator-error">{error}</div>}
    {loading ? <div className="creator-loading">Loading Creator intelligence…</div> : <>
      <section className="creator-admin-section creator-global-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">LIVE SNAPSHOT</span><h2>🌍 Tiny Titans Community</h2><p>Aggregated operational data only. Individual community locations will never be exposed here.</p></div></div>
        <div className="creator-global-grid">
          <div className="creator-global-card creator-global-card-users"><span>👥</span><strong>{number(stats.registeredUsers)}</strong><label>Registered Users</label><small>● {number(stats.activeUsers)} active recently</small></div>
          <div className="creator-global-card"><span>🐍</span><strong>{number(stats.snakeProfiles)}</strong><label>Snake Profiles</label><small>Community records</small></div>
          <div className="creator-global-card"><span>🍽️</span><strong>{number(stats.mealsFed)}</strong><label>Meals Logged</label><small>Feeding activity</small></div>
          <div className="creator-global-card"><span>⚖️</span><strong>{number(stats.weightLogs)}</strong><label>Weight Logs</label><small>Growth records</small></div>
          <div className="creator-global-card"><span>🐍</span><strong>{number(stats.shedsLogged)}</strong><label>Sheds Logged</label><small>Life timeline activity</small></div>
          <div className="creator-global-card"><span>🧬</span><strong>{number(stats.geneticsCalculations)}</strong><label>Genetics Calculations</label><small>Tracked calculations</small></div>
        </div>
      </section>

      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">ACTION QUEUE</span><h2>What needs your attention?</h2></div></div>
        <div className="creator-global-grid">
          <Link className="creator-global-card" to="/creator"><span>🐛</span><strong>{number(reportCount)}</strong><label>Open Issue Reports</label><small>Review tester/community reports</small></Link>
          <Link className="creator-global-card" to="/creator"><span>🧬</span><strong>{number(morphCount)}</strong><label>Morph Images Awaiting Review</label><small>Moderate community submissions</small></Link>
          <Link className="creator-global-card" to="/creator"><span>👑</span><strong>{number(founderCount)}</strong><label>Founder Applications</label><small>Applications awaiting review</small></Link>
        </div>
      </section>

      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">CONTROL CENTRE</span><h2>Creator tools</h2><p>The remaining Hub modules are being built on this secured foundation.</p></div></div>
        <div className="creator-list">
          <article className="creator-list-card"><h3>🌎 Community Globe</h3><p>City-level, consented and aggregated community growth. No addresses or precise GPS.</p><span className="creator-badge">NEXT MODULE</span></article>
          <article className="creator-list-card"><h3>🔐 Privacy & Data</h3><p>Consent versions, timestamps, location sharing, analytics and product-update preferences.</p><span className="creator-badge">NEXT MODULE</span></article>
          <article className="creator-list-card"><h3>📈 Analytics & App Health</h3><p>Versions, platforms, feature usage, error trends and community growth over time.</p><span className="creator-badge">NEXT MODULE</span></article>
          <article className="creator-list-card"><h3>🛡️ Moderation Centre</h3><p>Morph submissions, community images, reports and Founder/Creator applications.</p><span className="creator-badge">EXISTING TOOLS</span></article>
        </div>
      </section>
    </>}
  </main>;
}
