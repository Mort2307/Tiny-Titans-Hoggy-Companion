import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCreatorReports, getFounderApplications, getGlobalStats, getMorphImageSubmissions, type GlobalStats } from "../services/creatorService";
import "../styles/CreatorTools.css";

const EMPTY_STATS: GlobalStats = { registeredUsers: 0, activeUsers: 0, snakeProfiles: 0, mealsFed: 0, weightLogs: 0, totalWeightKg: 0, totalWeightLb: 0, shedsLogged: 0, totalShedLengthCm: 0, totalShedLengthIn: 0, geneticsCalculations: 0 };
const number = (value: number) => new Intl.NumberFormat("en-GB").format(value);
type HubCardProps = { to: string; icon: string; title: string; description: string; value?: string; detail?: string };
function HubCard({ to, icon, title, description, value, detail }: HubCardProps) { return <Link className="creator-global-card creator-hub-navigation-card" to={to}><span>{icon}</span>{value !== undefined && <strong>{value}</strong>}<label>{title}</label><small>{description}</small>{detail && <small>{detail}</small>}<b>Open full screen →</b></Link>; }

export default function CreatorHub() {
  const navigate = useNavigate();
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
      setReportCount(reports.filter(i => ["Pending", "Reviewing", "Fixing", "Testing"].includes(i.status)).length);
      setFounderCount(founders.filter(i => i.status === "Pending").length);
      setMorphCount(morphs.filter(i => i.status === "Pending" || i.status === "NeedsInfo").length);
    } catch (e) { setError(e instanceof Error ? e.message : "Creator data could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return <main className="creator-admin-page">
    <header className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>🛠️ Tiny Titans Creator Hub</h1><p>Complete command centre for community, app health, moderation, analytics and growth.</p></div><div className="creator-header-actions"><button type="button" onClick={() => navigate(-1)}>← Back</button><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button></div></header>
    {error && <div className="creator-error">{error}</div>}
    {loading ? <div className="creator-loading">Loading Creator intelligence…</div> : <>
      <section className="creator-admin-section creator-global-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">LIVE SNAPSHOT</span><h2>🌍 Tiny Titans Community</h2><p>Aggregated operational data only. Individual community locations are not exposed here.</p></div></div><div className="creator-global-grid"><div className="creator-global-card creator-global-card-users"><span>👥</span><strong>{number(stats.registeredUsers)}</strong><label>Registered Users</label><small>● {number(stats.activeUsers)} active recently</small></div><div className="creator-global-card"><span>🐍</span><strong>{number(stats.snakeProfiles)}</strong><label>Snake Profiles</label><small>Community records</small></div></div></section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">TRACKER CONTROL</span><h2>Husbandry & Genetics</h2><p>Each tracker has its own dedicated Creator screen. Only metrics belonging to the selected tracker are shown.</p></div></div><div className="creator-global-grid"><HubCard to="/creator/feeding" icon="🍽️" value={number(stats.mealsFed)} title="Feeding Analytics" description="Meals logged and feeding activity." /><HubCard to="/creator/shedding" icon="🐍" value={number(stats.shedsLogged)} title="Shed Analytics" description="Sheds and recorded shed length." detail={`${number(stats.totalShedLengthCm)} cm aggregate`} /><HubCard to="/creator/weights" icon="⚖️" value={number(stats.weightLogs)} title="Weight Analytics" description="Weight records and recorded mass." detail={`${number(stats.totalWeightKg)} kg aggregate`} /><HubCard to="/creator/genetics" icon="🧬" value={number(stats.geneticsCalculations)} title="Genetics Analytics" description="Tracked genetics calculator activity only." /></div></section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR NAVIGATION</span><h2>Core Creator tools</h2><p>Every destination is a separate full-screen route with a dedicated purpose.</p></div></div><div className="creator-global-grid"><HubCard to="/creator/app-control" icon="⚙️" title="App Control" description="Central command board for Creator-managed application surfaces." /><HubCard to="/creator/community" icon="🌍" title="Community Globe" description="Explore consenting community locations by country and city." /><HubCard to="/creator/wall-of-titans" icon="🏆" title="Wall of Titans Manager" description="Manage supporter identities, links, tiers, amounts and dates." /><HubCard to="/creator/tester" icon="🤖" title="Tester Bot" description="Run user, security and regression test suites." /><HubCard to="/creator/moderation" icon="🛡️" title="Moderation Centre" description="Review reports, morph submissions and applications." /><HubCard to="/creator/admin" icon="👥" title="Admin Management" description="Manage everyday administrator access." /><HubCard to="/creator/privacy-data" icon="🔐" title="Privacy & Data" description="Manage privacy, consent and community data controls." /></div></section>
      <section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">ACTION QUEUE</span><h2>What needs your attention?</h2></div></div><div className="creator-global-grid"><HubCard to="/creator/moderation" icon="🐛" value={number(reportCount)} title="Open Issue Reports" description="Review tester/community reports." /><HubCard to="/creator/moderation" icon="🧬" value={number(morphCount)} title="Morph Images Awaiting Review" description="Moderate community submissions." /><HubCard to="/creator/moderation" icon="👑" value={number(founderCount)} title="Founder Applications" description="Applications awaiting review." /></div></section>
    </>}
  </main>;
}
