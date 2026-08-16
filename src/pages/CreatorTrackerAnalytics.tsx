import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGlobalStats, type GlobalStats } from "../services/creatorService";

export type CreatorTrackerKind = "feeding" | "shedding" | "weights" | "genetics";

const EMPTY: GlobalStats = {
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

const CONFIG: Record<CreatorTrackerKind, { icon: string; title: string; description: string }> = {
  feeding: { icon: "🍽️", title: "Feeding Analytics", description: "Feeding activity across the Tiny Titans community." },
  shedding: { icon: "🐍", title: "Shed Analytics", description: "Shed activity and recorded shed-length data." },
  weights: { icon: "⚖️", title: "Weight Analytics", description: "Aggregate weight-record activity and recorded mass." },
  genetics: { icon: "🧬", title: "Genetics Analytics", description: "Aggregate genetics-calculator activity only." },
};

function number(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <section style={{ padding: "1rem", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}><strong style={{ display: "block", fontSize: "1.7rem" }}>{value}</strong><span style={{ display: "block", marginTop: ".25rem", fontWeight: 700 }}>{label}</span>{detail && <small style={{ opacity: .72 }}>{detail}</small>}</section>;
}

export default function CreatorTrackerAnalytics({ kind }: { kind: CreatorTrackerKind }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GlobalStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = CONFIG[kind];

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getGlobalStats().then((value) => {
      if (active) setStats(value);
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Unable to load Creator analytics.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <main className="creator-admin-page" style={{ minHeight: "100vh", padding: "1rem" }}>
    <header className="creator-admin-header">
      <div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>{config.icon} {config.title}</h1><p>{config.description}</p></div>
      <div className="creator-header-actions"><button type="button" onClick={() => navigate("/creator")}>← Creator Hub</button></div>
    </header>
    {error && <div className="creator-error" role="alert">{error}</div>}
    {loading ? <div className="creator-loading">Loading tracker data…</div> : <>
      {kind === "feeding" && <section className="creator-admin-section"><div className="creator-global-grid"><Stat label="Meals Logged" value={number(stats.mealsFed)} detail="All recorded feeding activity" /></div><p style={{ opacity: .75 }}>This screen intentionally contains feeding metrics only. Snake profiles, weight logs, shed records and genetics calculations are not displayed here.</p></section>}
      {kind === "shedding" && <section className="creator-admin-section"><div className="creator-global-grid"><Stat label="Sheds Logged" value={number(stats.shedsLogged)} detail="All recorded shed events" /><Stat label="Recorded Shed Length" value={`${number(stats.totalShedLengthCm)} cm`} detail={`${number(stats.totalShedLengthIn)} in aggregate`} /></div><p style={{ opacity: .75 }}>This screen intentionally contains shed-specific metrics only. Feeding, weight and genetics activity are not displayed here.</p></section>}
      {kind === "weights" && <section className="creator-admin-section"><div className="creator-global-grid"><Stat label="Weight Logs" value={number(stats.weightLogs)} detail="All recorded weight events" /><Stat label="Recorded Mass" value={`${number(stats.totalWeightKg)} kg`} detail={`${number(stats.totalWeightLb)} lb aggregate`} /></div><p style={{ opacity: .75 }}>This screen intentionally contains weight-specific metrics only. Feeding, shed and genetics activity are not displayed here.</p></section>}
      {kind === "genetics" && <section className="creator-admin-section"><div className="creator-global-grid"><Stat label="Genetics Calculations" value={number(stats.geneticsCalculations)} detail="Tracked calculator activity" /></div><p style={{ opacity: .75 }}>This screen intentionally contains genetics-calculator metrics only. Husbandry tracker data is not displayed here.</p></section>}
    </>}
  </main>;
}
