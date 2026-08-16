import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCreatorReports, getFounderApplications, getGlobalStats, getMorphImageSubmissions, type GlobalStats } from "../services/creatorService";
import "../styles/CreatorTools.css";

const EMPTY_STATS: GlobalStats = { registeredUsers: 0, activeUsers: 0, snakeProfiles: 0, mealsFed: 0, weightLogs: 0, totalWeightKg: 0, totalWeightLb: 0, shedsLogged: 0, totalShedLengthCm: 0, totalShedLengthIn: 0, geneticsCalculations: 0 };
const number = (value: number) => new Intl.NumberFormat("en-GB").format(value);

type HubCardProps = { to: string; icon: string; title: string; description: string; value?: string; detail?: string };

function HubCard({ to, icon, title, description, value, detail }: HubCardProps) {
  return (
    <Link className="creator-global-card creator-hub-navigation-card" to={to}>
      <span>{icon}</span>
      {value !== undefined && <strong>{value}</strong>}
      <label>{title}</label>
      <small>{description}</small>
      {detail && <small>{detail}</small>}
      <b>Open full screen →</b>
    </Link>
  );
}

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
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR NAVIGATION</span><h2>Open a tool</h2><p>Every destination opens as its own full screen. Nothing is appended underneath this page.</p></div></div>
        <div className="creator-global-grid">
          <HubCard to="/creator/community" icon="🌍" title="Community Globe" description="Explore consenting community locations by country and city." />
          <HubCard to="/creator/tester" icon="🤖" title="Tester Bot" description="Run full user, specific user, full security and specific security tests." />
          <HubCard to="/creator/moderation" icon="🛡️" title="Moderation Centre" description="Review reports, morph submissions and legacy applications." />
          <HubCard to="/account" icon="🔐" title="Privacy & Data" description="Review account privacy and permission controls." />
        </div>
      </section>

      <section className="creator-admin-section">
        <div className="creator-section-heading"><div><span className="creator-admin-kicker">ACTION QUEUE</span><h2>What needs your attention?</h2></div></div>
        <div className="creator-global-grid">
          <HubCard to="/creator/moderation" icon="🐛" value={number(reportCount)} title="Open Issue Reports" description="Review tester/community reports." />
          <HubCard to="/creator/moderation" icon="🧬" value={number(morphCount)} title="Morph Images Awaiting Review" description="Moderate community submissions." />
          <HubCard to="/creator/moderation" icon="👑" value={number(founderCount)} title="Founder Applications" description="Applications awaiting review." />
        </div>
      </section>
    </>}
  </main>;
}
