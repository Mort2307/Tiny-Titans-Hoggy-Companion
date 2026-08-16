import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";
import "../styles/CreatorTools.css";

export default function CreatorFeedingAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void getGlobalStats().then(setStats).catch((e) => setError(e instanceof Error ? e.message : "Feeding analytics could not be loaded.")); }, []);
  return <main className="creator-admin-page"><header className="creator-admin-header"><div><span className="creator-admin-kicker">CREATOR ANALYTICS</span><h1>🍽️ Feeding Analytics</h1><p>Feeding activity only. No shed, weight or genetics records are shown on this screen.</p></div><button type="button" onClick={() => navigate("/creator")}>← Creator Hub</button></header>{error && <div className="creator-error">{error}</div>} {!stats ? <div className="creator-loading">Loading feeding analytics…</div> : <section className="creator-admin-section"><div className="creator-global-grid"><div className="creator-global-card"><span>🍽️</span><strong>{stats.mealsFed.toLocaleString("en-GB")}</strong><label>Total Meals Logged</label><small>Across community snake profiles</small></div></div></section>}</main>;
}
