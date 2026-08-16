import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";
import { getCanonicalGlobalStats } from "../services/trackerStatsService";
import "../styles/CreatorTools.css";

const EMPTY_STATS: GlobalStats = {
  registeredUsers: 0,
  activeUsers: 0,
  snakeProfiles: 0,
  mealsFed: 0,
  weightLogs: 0,
  totalWeightKg: 0,
  totalWeightLb: 0,
  shedsLogged: 0,
  totalShedLengthCm: 0,
  totalShedLengthIn: 0,
  geneticsCalculations: 0,
};

const fmt = (value: number) => new Intl.NumberFormat("en-GB").format(value);

export default function CreatorAdmin() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<GlobalStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"users" | "snakes" | "trackers" | null>(null);

  async function loadDashboard() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [legacyStats, canonicalStats] = await Promise.all([
        getGlobalStats(),
        getCanonicalGlobalStats(),
      ]);

      setStats({
        ...legacyStats,
        ...canonicalStats,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creator data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile?.role === "admin" && user) void loadDashboard();
  }, [profile?.role, user]);

  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  const cards = [
    { key: "users", icon: "👥", value: stats.registeredUsers, label: "Registered Users", detail: `${fmt(stats.activeUsers)} active`, onClick: () => setPanel("users") },
    { key: "snakes", icon: "🐍", value: stats.snakeProfiles, label: "Snake Profiles", detail: "Global collection", onClick: () => setPanel("snakes") },
    { key: "meals", icon: "🍽️", value: stats.mealsFed, label: "Meals Fed", detail: "Global feeding records", onClick: () => setPanel("trackers") },
    { key: "sheds", icon: "🐍", value: stats.shedsLogged, label: "Sheds Logged", detail: "Global shed records", onClick: () => setPanel("trackers") },
    { key: "length", icon: "📏", value: `${(stats.totalShedLengthCm / 100).toFixed(2)} m`, label: "Total Shed Length", detail: "Recorded shed lengths", onClick: () => setPanel("trackers") },
    { key: "genetics", icon: "🧬", value: stats.geneticsCalculations, label: "Genetics Calculations", detail: "Tracked calculations", onClick: () => setPanel("trackers") },
  ];

  return (
    <section className="creator-admin-page">
      <div className="creator-admin-header">
        <div>
          <span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span>
          <h1>🛠️ Tiny Titans Control Centre</h1>
          <p>Global app activity, community intelligence and QA.</p>
        </div>
        <button type="button" onClick={() => void loadDashboard()} disabled={loading}>
          {loading ? "↻ Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="creator-error">{error}</div>}

      {loading ? (
        <div className="creator-loading">Loading global Tiny Titans statistics…</div>
      ) : (
        <>
          <section className="creator-admin-section creator-global-section">
            <div className="creator-section-heading">
              <div>
                <span className="creator-admin-kicker">INTERACTIVE GLOBAL TRACKERS</span>
                <h2>🌍 Tiny Titans Community</h2>
                <p>Click any statistic to open its detailed Creator view.</p>
              </div>
            </div>
            <div className="creator-global-grid">
              {cards.map((card) => (
                <button
                  key={card.key}
                  className="creator-global-card creator-global-card-button"
                  type="button"
                  onClick={card.onClick}
                >
                  <span>{card.icon}</span>
                  <strong>{card.value}</strong>
                  <label>{card.label}</label>
                  <small>{card.detail} · View details →</small>
                </button>
              ))}
            </div>
          </section>

          <div className="creator-actions">
            <Link className="primary-button" to="/creator/tester">🤖 Tester Centre</Link>
            <Link className="secondary-button" to="/creator/community">🌍 Community Manager</Link>
          </div>
        </>
      )}

      {panel === "users" && (
        <section className="creator-admin-section">
          <h2>👥 User Overview</h2>
          <div className="creator-global-grid">
            <div className="creator-global-card"><span>👥</span><strong>{fmt(stats.registeredUsers)}</strong><label>Registered Users</label></div>
            <div className="creator-global-card"><span>🟢</span><strong>{fmt(stats.activeUsers)}</strong><label>Active Users</label></div>
            <div className="creator-global-card"><span>🐍</span><strong>{fmt(stats.snakeProfiles)}</strong><label>Snake Profiles</label></div>
            <div className="creator-global-card"><span>📱</span><strong>{fmt(stats.weightLogs)}</strong><label>Weight Records</label></div>
          </div>
          <p className="creator-muted">This view currently uses the canonical Firebase totals. Device, app-version and privacy-safe city analytics can be added as a dedicated user analytics layer without exposing personal addresses.</p>
          <button type="button" onClick={() => setPanel(null)}>← Back</button>
        </section>
      )}

      {panel === "snakes" && (
        <section className="creator-admin-section">
          <h2>🐍 Snake Overview</h2>
          <div className="creator-global-grid">
            <div className="creator-global-card"><span>🐍</span><strong>{fmt(stats.snakeProfiles)}</strong><label>Total Snake Profiles</label></div>
            <div className="creator-global-card"><span>⚖️</span><strong>{fmt(stats.weightLogs)}</strong><label>Weight Records</label></div>
            <div className="creator-global-card"><span>🍽️</span><strong>{fmt(stats.mealsFed)}</strong><label>Feeding Records</label></div>
            <div className="creator-global-card"><span>🐍</span><strong>{fmt(stats.shedsLogged)}</strong><label>Shed Records</label></div>
          </div>
          <p className="creator-muted">Global totals are derived from the current Firebase data model.</p>
          <button type="button" onClick={() => setPanel(null)}>← Back</button>
        </section>
      )}

      {panel === "trackers" && (
        <section className="creator-admin-section">
          <h2>📊 Tracker Analytics</h2>
          <div className="creator-list">
            <div className="creator-list-card"><strong>🍽️ Feeding</strong><span>{fmt(stats.mealsFed)} meals recorded globally.</span></div>
            <div className="creator-list-card"><strong>🐍 Sheds</strong><span>{fmt(stats.shedsLogged)} sheds recorded globally.</span></div>
            <div className="creator-list-card"><strong>📏 Shed Length</strong><span>{(stats.totalShedLengthCm / 100).toFixed(2)} m total recorded.</span></div>
            <div className="creator-list-card"><strong>🧬 Genetics</strong><span>{fmt(stats.geneticsCalculations)} persisted calculations.</span></div>
          </div>
          <button type="button" onClick={() => setPanel(null)}>← Back</button>
        </section>
      )}
    </section>
  );
}
