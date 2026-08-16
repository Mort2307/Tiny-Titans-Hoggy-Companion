import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCreatorTrackerMetrics, type CreatorTrackerKind, type CreatorTrackerMetrics } from "../services/creatorAnalyticsService";
import "../styles/CreatorTools.css";

const CONFIG: Record<CreatorTrackerKind, { icon: string; title: string; description: string }> = {
  feeding: { icon: "🍽️", title: "Feeding Analytics", description: "Feeding activity across the Tiny Titans community." },
  shedding: { icon: "🐍", title: "Shed Analytics", description: "Shed activity and recorded shed-length data." },
  weights: { icon: "⚖️", title: "Weight Analytics", description: "Aggregate weight-record activity and recorded mass." },
  genetics: { icon: "🧬", title: "Genetics Analytics", description: "Aggregate genetics-calculator activity only." },
};
function number(value: number) { return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value); }
function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) { return <section style={{ padding: "1rem", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)" }}><strong style={{ display: "block", fontSize: "1.7rem" }}>{value}</strong><span style={{ display: "block", marginTop: ".25rem", fontWeight: 700 }}>{label}</span>{detail && <small style={{ opacity: .72 }}>{detail}</small>}</section>; }

export default function CreatorTrackerAnalytics({ kind }: { kind: CreatorTrackerKind }) {
  const navigate = useNavigate(); const config = CONFIG[kind];
  const [metrics, setMetrics] = useState<CreatorTrackerMetrics>({}); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let active = true; setLoading(true); setError(""); void getCreatorTrackerMetrics(kind).then((value) => { if (active) setMetrics(value); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Unable to load Creator tracker analytics."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [kind]);
  return <main className="creator-admin-page" style={{ minHeight: "100vh", padding: "1rem" }}><header className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>{config.icon} {config.title}</h1><p>{config.description}</p></div><div className="creator-header-actions"><button type="button" onClick={() => navigate("/creator")}>← Creator Hub</button></div></header>{error && <div className="creator-error" role="alert">{error}</div>}{loading ? <div className="creator-loading">Loading {config.title.toLowerCase()}…</div> : <section className="creator-admin-section"><div className="creator-global-grid">
    {kind === "feeding" && <Stat label="Meals Logged" value={number(metrics.mealsFed ?? 0)} detail="Recorded feeding events only" />}
    {kind === "shedding" && <><Stat label="Sheds Logged" value={number(metrics.shedsLogged ?? 0)} detail="Recorded shed events only" /><Stat label="Recorded Shed Length" value={`${number(metrics.totalShedLengthCm ?? 0)} cm`} detail={`${number(metrics.totalShedLengthIn ?? 0)} in aggregate`} /></>}
    {kind === "weights" && <><Stat label="Weight Logs" value={number(metrics.weightLogs ?? 0)} detail="Recorded weight events only" /><Stat label="Recorded Mass" value={`${number(metrics.totalWeightKg ?? 0)} kg`} detail={`${number(metrics.totalWeightLb ?? 0)} lb aggregate`} /></>}
    {kind === "genetics" && <Stat label="Genetics Calculations" value={number(metrics.geneticsCalculations ?? 0)} detail="Completed genetics-calculator events only" />}
  </div><p style={{ opacity: .75, marginTop: "1rem" }}>This screen is intentionally scoped to the selected Creator tool. It does not load the other tracker datasets.</p></section>}</main>;
}
