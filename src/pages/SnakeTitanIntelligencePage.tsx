import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getSnakeMasterRecord, type SnakeMasterRecord } from "../services/snakeMasterRecord";
import { buildSnakeIntelligence, type SnakeIntelligence } from "../services/snakeIntelligenceService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import TitanAnimalIntelligencePanel from "../components/TitanIntelligence/TitanAnimalIntelligencePanel";
import "../styles/SnakeMasterRecord.css";

function confidenceExplanation(value: SnakeIntelligence["confidence"], area: string, count: number, target: number) {
  if (value === "Insufficient") return `No ${area.toLowerCase()} history is recorded yet. Add records to start building this individual baseline.`;
  if (count >= target) return `Based on ${count} ${area.toLowerCase()} records. This is enough history for a stronger individual baseline.`;
  return `Based on ${count} ${area.toLowerCase()} record${count === 1 ? "" : "s"}. ${target - count} more will strengthen this baseline.`;
}

export default function SnakeTitanIntelligencePage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const snakeId = params.get("snakeId");
  const [access, setAccess] = useState<boolean | null>(null);
  const [record, setRecord] = useState<SnakeMasterRecord | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const key = user && snakeId ? `${user.uid}:${snakeId}` : null;

  useEffect(() => {
    if (!user || !snakeId) return;
    let active = true;
    const authenticatedUser = user;
    const selectedSnakeId = snakeId;
    setAccess(null);
    setRecord(null);
    setError("");
    setLoadedKey(null);

    async function load() {
      const allowed = await hasFullIntelligenceAccess(authenticatedUser.uid).catch(() => false);
      if (!active) return;
      setAccess(allowed);
      if (!allowed) {
        setLoadedKey(key);
        return;
      }
      try {
        const result = await getSnakeMasterRecord(authenticatedUser.uid, selectedSnakeId);
        if (!active) return;
        setRecord(result);
        setError(result ? "" : "This snake could not be found in your Tiny Titans account.");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load Titan Intelligence for this snake.");
        setRecord(null);
      } finally {
        if (active) setLoadedKey(key);
      }
    }

    void load();
    return () => { active = false; };
  }, [user, snakeId, key]);

  const intelligence = useMemo(() => record ? buildSnakeIntelligence(record) : null, [record]);

  if (!user) return <main className="page-container"><section className="master-shell"><h1>Titan Intelligence</h1><p>You must be logged in to view individual intelligence.</p></section></main>;
  if (!snakeId) return <main className="page-container"><section className="master-shell"><h1>Titan Intelligence</h1><p>No snake was selected.</p><Link to="/snakes">Back to My Snakes</Link></section></main>;
  if (access === null || loadedKey !== key) return <main className="page-container"><section className="master-shell"><p role="status">Reading this Titan's intelligence access and recorded history…</p></section></main>;
  if (!access) return <main className="page-container"><section className="master-shell">
    <header className="master-hero"><div><p className="master-eyebrow">🧠 TITAN INTELLIGENCE</p><h1>Full Intelligence is optional</h1><p>Your core tracking still works normally. Advanced Titan Intelligence only runs when you choose the relevant optional data-sharing setting.</p></div><Link className="master-back" to={`/snakes/${snakeId}`}>Snake profile</Link></header>
    <section className="tt-intelligence-panel tt-intelligence-locked"><p className="tt-intelligence-kicker">YOUR CHOICE</p><h2 className="tt-intelligence-title">Intelligence access is currently off</h2><p className="tt-intelligence-meta">Tiny Titans will not calculate or display the deeper individual intelligence layer until you enable it in Data &amp; Privacy.</p><Link className="tt-intelligence-action" to="/account/data-privacy">Enable Intelligence in Data &amp; Privacy →</Link></section>
  </section></main>;
  if (error || !record || !intelligence) return <main className="page-container"><section className="master-shell"><h1>Unable to load Titan Intelligence</h1><p role="alert">{error || "No individual record is available."}</p><Link to="/snakes">Back to My Snakes</Link></section></main>;

  const { snake, overview } = record;
  const confidenceDetails = [
    ["Weight", overview.confidence.weight, overview.totalWeightLogs, 5],
    ["Feeding", overview.confidence.feeding, overview.totalMeals, 8],
    ["Shedding", overview.confidence.shedding, overview.totalSheds, 5],
    ["Behaviour", overview.confidence.behaviour, overview.totalBehaviourLogs, 5],
    ["Health", overview.confidence.health, overview.totalHealthRecords, 3],
  ] as const;

  return <main className="page-container master-record-page">
    <section className="master-shell">
      <header className="master-hero">
        <div><p className="master-eyebrow">🧠 TITAN INTELLIGENCE</p><h1>{snake.name}</h1><p>Living, record-derived intelligence for this individual. The same canonical engine used by the Master Record.</p></div>
        <Link className="master-back" to={`/snakes/${snake.id}/master-record`}>Master Record</Link>
      </header>

      <section className="master-card tt-intelligence-panel" data-tone={intelligence.priority?.tone ?? "neutral"}>
        <div className="master-section-heading"><div><p className="master-eyebrow">🧠 Central Intelligence Engine</p><h2>What Tiny Titans sees</h2></div><span>{intelligence.confidence}</span></div>
        <p>{intelligence.summary}</p>
        <div className="master-grid">
          {intelligence.insights.map((item) => <article className="master-card" key={item.id}><span>{item.tone === "attention" ? "⚠️" : item.tone === "positive" ? "📈" : "📊"} {item.title}</span><strong>{item.title === "Individual weight trend" ? <>Recent trend: {item.value.split(" · ")[0]}<small>Overall change: {item.value.split(" · ")[1]?.replace(/\s+overall$/, "") ?? "Not available"}</small></> : item.value}</strong><small><b>Why:</b> {item.title === "Build the individual baseline" ? `${snake.name} doesn't yet have enough history across key areas to make stronger individual comparisons.` : item.why}</small><small><b>Next:</b> {item.action}</small><small><b>Confidence:</b> {item.confidence}</small></article>)}
        </div>
      </section>

      <TitanAnimalIntelligencePanel record={record} />

      <section className="master-card">
        <div className="master-section-heading"><div><p className="master-eyebrow">Data quality</p><h2>Confidence explained</h2></div><span>{intelligence.confidence}</span></div>
        <p>Confidence is based on the amount and quality of individual history recorded for {snake.name}; it is not a claim about the snake's health.</p>
        <div className="master-grid">{confidenceDetails.map(([area, level, count, target]) => <article className="master-card" key={area}><span>{area}</span><strong>{level}</strong><small>{confidenceExplanation(level, area, count, target)}</small></article>)}</div>
      </section>

      <section className="master-card"><div className="master-section-heading"><div><p className="master-eyebrow">Connected records</p><h2>Keep feeding the intelligence engine</h2></div></div><div className="master-actions"><Link to={`/snakes/${snake.id}/weights`}>⚖️ Weight</Link><Link to={`/snakes/${snake.id}/feeding`}>🍽️ Feeding</Link><Link to={`/snakes/${snake.id}/shedding`}>🐍 Shed</Link><Link to={`/snakes/${snake.id}/behaviour`}>👀 Behaviour</Link><Link to={`/snakes/${snake.id}/health`}>🩺 Health</Link><Link to={`/snakes/${snake.id}/master-record`}>📖 Master Record</Link></div></section>
    </section>
  </main>;
}
