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

function confidenceExplanation(value: SnakeMasterRecord["overview"]["confidence"]["overall"], area: string, count: number, target: number) {
  if (value === "Insufficient") return `No ${area.toLowerCase()} history is recorded yet. Add records to start building this individual baseline.`;
  if (count >= target) return `Based on ${count} ${area.toLowerCase()} records. This is enough history for a stronger individual baseline.`;
  return `Based on ${count} ${area.toLowerCase()} record${count === 1 ? "" : "s"}. ${target - count} more will strengthen this baseline.`;
}

function timelineDestination(snakeId: string, type: string, recordId?: string) {
  if (type === "Weight") return `/snakes/${snakeId}/weights?record=${encodeURIComponent(recordId ?? "")}`;
  if (type === "Feeding") return `/snakes/${snakeId}/feeding?record=${encodeURIComponent(recordId ?? "")}`;
  if (type === "Shed") return `/snakes/${snakeId}/shedding?record=${encodeURIComponent(recordId ?? "")}`;
  return `/snakes/${snakeId}`;
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
    setError("");
    void getSnakeMasterRecord(user.uid, id)
      .then((result) => { if (!cancelled) setRecord(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load this snake overview."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, id]);

  if (loading) return <main className="page-container"><section className="master-shell"><p role="status">Loading individual record…</p></section></main>;
  if (error) return <main className="page-container"><section className="master-shell"><h1>Unable to load record</h1><p role="alert">{error}</p><Link to={`/snakes/${id}`}>Back to snake</Link></section></main>;
  if (!record) return <main className="page-container"><section className="master-shell"><h1>Snake not found</h1><p>This Master Record could not be found for this account.</p><Link to="/snakes">Back to My Snakes</Link></section></main>;

  const { snake, overview, timeline } = record;
  const weight = overview.currentWeightG === null ? "—" : formatWeight(overview.currentWeightG);
  const change = overview.weightChangeG === null ? "No baseline yet" : `${overview.weightChangeG >= 0 ? "+" : ""}${formatWeight(overview.weightChangeG)}`;
  const shedLength = overview.totalShedLengthCm === null ? "—" : formatLength(overview.totalShedLengthCm);
  const averageShed = overview.averageShedLengthCm === null ? "No measurements" : `${formatLength(overview.averageShedLengthCm)} avg`;
  const confidenceDetails = [
    ["Weight", overview.confidence.weight, overview.totalWeightLogs, 5],
    ["Feeding", overview.confidence.feeding, overview.totalMeals, 8],
    ["Shedding", overview.confidence.shedding, overview.totalSheds, 5],
  ] as const;

  return <main className="page-container master-record-page"><section className="master-shell">
    <header className="master-hero"><div><p className="master-eyebrow">Individual Master Record</p><h1>{snake.name}</h1><p>{snake.morphs?.join(" • ") || "Western Hognose"}</p></div><Link className="master-back" to={`/snakes/${snake.id}`}>Snake profile</Link></header>

    <section className="master-status"><Metric label="Current weight" value={weight} detail={change} /><Metric label="Meals logged" value={String(overview.totalMeals)} detail={overview.lastMealDate ? `Last: ${formatDate(overview.lastMealDate)}` : "Start feeding history"} /><Metric label="Sheds logged" value={String(overview.totalSheds)} detail={overview.lastShedDate ? `Last: ${formatDate(overview.lastShedDate)}` : "Start shed history"} /><Metric label="Shed length" value={shedLength} detail={isImperial ? "Imperial" : "Metric"} /></section>

    <section className="master-grid">
      <Link className="master-card" to={`/snakes/${snake.id}/weights`}><span>⚖️ Weight</span><strong>{overview.weightChangePercent === null ? "Build baseline" : `${overview.weightChangePercent >= 0 ? "+" : ""}${overview.weightChangePercent.toFixed(1)}%`}</strong><small>{overview.totalWeightLogs} weight logs • {overview.confidence.weight} confidence</small></Link>
      <Link className="master-card" to={`/snakes/${snake.id}/feeding`}><span>🍽️ Feeding</span><strong>{overview.acceptanceRate === null ? "Build baseline" : `${overview.acceptanceRate}% accepted`}</strong><small>{overview.daysSinceMeal === null ? "No meal history" : `${overview.daysSinceMeal} days since last meal`} • {overview.confidence.feeding} confidence</small></Link>
      <Link className="master-card" to={`/snakes/${snake.id}/shedding`}><span>🐍 Shedding</span><strong>{averageShed}</strong><small>{overview.daysSinceShed === null ? "No shed history" : `${overview.daysSinceShed} days since last shed`} • {overview.confidence.shedding} confidence</small></Link>
      <article className="master-card"><span>🧠 Overall data</span><strong>{overview.confidence.overall}</strong><small>Confidence reflects how much individual history Tiny Titans has recorded.</small></article>
      <Link className="master-card" to="/calculator"><span>🧬 Genetics</span><strong>{snake.morphs?.length ? `${snake.morphs.length} morph${snake.morphs.length === 1 ? "" : "s"}` : "Review genetics"}</strong><small>Open the Genetics Calculator to explore this snake's genetics.</small></Link>
      <article className="master-card"><span>📝 Notes & observations</span><strong>{snake.notes?.trim() ? "Recorded" : "Nothing recorded"}</strong><small>Keep important observations with the snake profile.</small><Link to={`/snakes/${snake.id}/edit`}>Edit snake record →</Link></article>
    </section>

    <section className="master-card">
      <div className="master-section-heading"><div><p className="master-eyebrow">Data quality</p><h2>Confidence explained</h2></div><span>{overview.confidence.overall}</span></div>
      <p>Confidence is based on the amount of individual history recorded for {snake.name}; it is not a claim about the snake's health.</p>
      <div className="master-grid">{confidenceDetails.map(([area, level, count, target]) => <article className="master-card" key={area}><span>{area}</span><strong>{level}</strong><small>{confidenceExplanation(level, area, count, target)}</small></article>)}</div>
    </section>

    <section className="master-card master-timeline-card">
      <div className="master-section-heading"><div><p className="master-eyebrow">Living history</p><h2>Life Timeline</h2></div><span>{timeline.length} events</span></div>
      {timeline.length === 0 ? <div><p>No timeline events have been recorded yet. Start building {snake.name}'s history with an individual record.</p><div className="master-actions"><Link to={`/snakes/${snake.id}/weights`}>⚖️ Log Weight</Link><Link to={`/snakes/${snake.id}/feeding`}>🍽️ Log Feeding</Link><Link to={`/snakes/${snake.id}/shedding`}>🐍 Record Shed</Link></div></div> : <ol className="master-timeline">{timeline.map((event) => <li key={event.id}><Link to={timelineDestination(snake.id, event.type, event.relatedRecordId)} className="master-timeline-link"><div className="master-timeline-dot" /><div><time>{formatDate(event.date)}</time><strong>{event.title}</strong>{event.description && <p>{event.description}</p>}<small>Open record →</small></div></Link></li>)}</ol>}
    </section>

    <section className="master-card"><div className="master-section-heading"><div><p className="master-eyebrow">Keep recording</p><h2>What's next?</h2></div></div><div className="master-actions"><Link to={`/snakes/${snake.id}/weights`}>⚖️ Weight</Link><Link to={`/snakes/${snake.id}/feeding`}>🍽️ Feeding</Link><Link to={`/snakes/${snake.id}/shedding`}>🐍 Shed</Link><Link to={`/snakes/${snake.id}`}>🐍 Snake Profile</Link></div></section>
  </section></main>;
}
