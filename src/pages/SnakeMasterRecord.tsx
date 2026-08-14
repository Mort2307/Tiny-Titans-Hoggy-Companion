import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSnakeMasterRecord, type SnakeMasterRecord } from "../services/snakeMasterRecord";
import { useUnits } from "../context/UnitContext";
import "../styles/SnakeMasterRecord.css";

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <article className="master-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}
function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function SnakeMasterRecord() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isImperial, formatWeight, formatLength } = useUnits();
  const [record, setRecord] = useState<SnakeMasterRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    setLoading(true);
    void getSnakeMasterRecord(user.uid, id).then((result) => { if (!cancelled) setRecord(result); }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load this snake overview."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, id]);

  if (loading) return <main className="page-container"><section className="master-shell"><p role="status">Loading individual record…</p></section></main>;
  if (error) return <main className="page-container"><section className="master-shell"><h1>Unable to load record</h1><p role="alert">{error}</p><Link to={`/snakes/${id}`}>Back to snake</Link></section></main>;
  if (!record) return <main className="page-container"><section className="master-shell"><h1>Snake not found</h1><Link to="/snakes">Back to My Snakes</Link></section></main>;

  const { snake, overview, timeline } = record;
  const weight = overview.currentWeightG === null ? "—" : formatWeight(overview.currentWeightG);
  const change = overview.weightChangeG === null ? "No baseline yet" : `${overview.weightChangeG >= 0 ? "+" : ""}${formatWeight(overview.weightChangeG)}`;
  const shedLength = overview.totalShedLengthCm === null ? "—" : formatLength(overview.totalShedLengthCm);
  const averageShed = overview.averageShedLengthCm === null ? "No measurements" : `${formatLength(overview.averageShedLengthCm)} avg`;

  return <main className="page-container master-record-page"><section className="master-shell">
    <header className="master-hero"><div><p className="master-eyebrow">Individual Master Record</p><h1>{snake.name}</h1><p>{snake.morphs?.join(" • ") || "Western Hognose"}</p></div><Link className="master-back" to={`/snakes/${snake.id}`}>Snake profile</Link></header>
    <section className="master-status"><Metric label="Current weight" value={weight} detail={change} /><Metric label="Meals logged" value={String(overview.totalMeals)} detail={overview.lastMealDate ? `Last: ${formatDate(overview.lastMealDate)}` : undefined} /><Metric label="Sheds logged" value={String(overview.totalSheds)} detail={overview.lastShedDate ? `Last: ${formatDate(overview.lastShedDate)}` : undefined} /><Metric label="Shed length" value={shedLength} detail={isImperial ? "Imperial" : "Metric"} /></section>
    <section className="master-grid"><article className="master-card"><span>⚖️ Weight</span><strong>{overview.weightChangePercent === null ? "Building baseline" : `${overview.weightChangePercent >= 0 ? "+" : ""}${overview.weightChangePercent.toFixed(1)}%`}</strong><small>{overview.totalWeightLogs} weight logs • {overview.confidence.weight} confidence</small></article><article className="master-card"><span>🍽️ Feeding</span><strong>{overview.acceptanceRate === null ? "Building baseline" : `${overview.acceptanceRate}% accepted`}</strong><small>{overview.daysSinceMeal === null ? "No meal history" : `${overview.daysSinceMeal} days since last meal`} • {overview.confidence.feeding} confidence</small></article><article className="master-card"><span>🐍 Shedding</span><strong>{averageShed}</strong><small>{overview.daysSinceShed === null ? "No shed history" : `${overview.daysSinceShed} days since last shed`} • {overview.confidence.shedding} confidence</small></article><article className="master-card"><span>🧠 Overall data</span><strong>{overview.confidence.overall}</strong><small>Confidence reflects how much individual history Tiny Titans has recorded.</small></article></section>
    <section className="master-card master-timeline-card"><div className="master-section-heading"><div><p className="master-eyebrow">Living history</p><h2>Life Timeline</h2></div><span>{timeline.length} events</span></div>{timeline.length === 0 ? <p>No timeline events have been recorded yet.</p> : <ol className="master-timeline">{timeline.map((event) => <li key={event.id}><div className="master-timeline-dot" /><div><time>{formatDate(event.date)}</time><strong>{event.title}</strong>{event.description && <p>{event.description}</p>}</div></li>)}</ol>}</section>
  </section></main>;
}
