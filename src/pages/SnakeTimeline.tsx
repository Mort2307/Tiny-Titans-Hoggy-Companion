import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { getSnakeMasterRecord, type SnakeMasterRecord } from "../services/snakeMasterRecord";
import "./SnakeTimeline.css";

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function eventIcon(type: string) {
  return type === "Weight" ? "⚖️" : type === "Feeding" ? "🍽️" : type === "Shed" ? "🐍" : type === "Health" ? "❤️" : type === "Breeding" ? "🥚" : type === "Hatch" ? "🥚" : type === "Arrival" ? "🏠" : "📝";
}

export default function SnakeTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [record, setRecord] = useState<SnakeMasterRecord | null>(null);
  const [error, setError] = useState("");
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (loading || profileLoading || !user || !id) return;
    let active = true;
    setLoadingRecord(true);
    void getSnakeMasterRecord(user.uid, id).then((result) => {
      if (!active) return;
      if (!result) setError("This snake could not be found in your Tiny Titans account.");
      else { setRecord(result); setError(""); }
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this timeline."); }).finally(() => { if (active) setLoadingRecord(false); });
    return () => { active = false; };
  }, [id, user, loading, profileLoading]);

  if (loading || profileLoading || loadingRecord) return <div className="page-container"><BackHomeButton /><h1>📜 Loading Timeline…</h1><section className="tracker-card"><p>Tiny Titans is assembling the chronological history from the canonical records.</p></section></div>;
  if (error || !record) return <div className="page-container"><BackHomeButton /><h1>📜 Timeline unavailable</h1><section className="tracker-card"><p>{error || "No timeline is available for this snake."}</p><button type="button" onClick={() => navigate(`/snakes/${id}`)}>Back to Snake Profile</button></section></div>;

  return <div className="page-container tt-timeline-page"><BackHomeButton /><header className="tt-timeline-header"><div><p className="tt-intelligence-kicker">LIVING HISTORY</p><h1>📜 {record.snake.name}'s Timeline</h1><p>One chronological view of the records Tiny Titans currently has for this snake. This is a presentation layer — it does not create a second copy of the underlying records.</p></div><div className="tt-timeline-actions"><button type="button" onClick={() => navigate(`/snakes/${record.snake.id}/master-record`)}>Open Master Record</button><button type="button" onClick={() => navigate(`/snakes/${record.snake.id}`)}>Snake Profile</button></div></header>
    <section className="tt-timeline-summary"><div><strong>{record.timeline.length}</strong><span>events</span></div><div><strong>{record.overview.totalWeightLogs}</strong><span>weights</span></div><div><strong>{record.overview.totalMeals}</strong><span>feeds</span></div><div><strong>{record.overview.totalSheds}</strong><span>sheds</span></div><div><strong>{record.overview.confidence.overall}</strong><span>intelligence confidence</span></div></section>
    {record.timeline.length === 0 ? <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">EMPTY HISTORY</p><h2 className="tt-intelligence-title">The timeline is ready for its first event.</h2><p className="tt-intelligence-meta">Record a weight, feeding or shed and the event will appear here automatically.</p></section> : <div className="tt-timeline-list">{record.timeline.map((event) => <article className="tt-timeline-event" key={event.id}><div className="tt-timeline-marker" aria-hidden="true">{eventIcon(event.type)}</div><div className="tt-timeline-event-body"><div className="tt-timeline-event-meta"><span>{formatDate(event.date)}</span><span>{event.type}</span></div><h2>{event.title}</h2>{event.description && <p>{event.description}</p>}{event.relatedRecordId && <button type="button" onClick={() => { if (event.type === "Weight") navigate(`/weights/${record.snake.id}?record=${encodeURIComponent(event.relatedRecordId!)}`); else if (event.type === "Feeding") navigate(`/feeding/${record.snake.id}`); else if (event.type === "Shed") navigate(`/shedding/${record.snake.id}`); }}>Open record →</button>}</div></article>)}</div>}
  </div>;
}
