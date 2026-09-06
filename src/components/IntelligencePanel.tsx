import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SnakeIntelligence, SnakeInsight } from "../services/snakeIntelligenceService";
import { hasFullIntelligenceAccess } from "../services/intelligenceAccessService";
import { useAuth } from "../context/useAuth";

function confidenceLabel(value: SnakeIntelligence["confidence"]): string {
  return value === "High" ? "High · Reliable pattern" : value === "Moderate" ? "Moderate · Pattern developing" : value === "Low" ? "Low · More data needed" : "More data needed";
}
function toneLabel(value: SnakeInsight["tone"]): string { return value === "attention" ? "Worth reviewing" : value === "positive" ? "Positive pattern" : "Recorded pattern"; }
function categoryLabel(value: SnakeInsight["category"]): string { return value === "weight" ? "Weight" : value === "feeding" ? "Feeding" : value === "shedding" ? "Shed" : value === "behaviour" ? "Behaviour" : value === "health" ? "Health" : value === "activity" ? "Timeline" : "Profile"; }
function categoryRoute(category: SnakeInsight["category"], snakeId: string): string {
  if (category === "weight") return `/weights/${snakeId}`;
  if (category === "feeding") return `/feeding/${snakeId}`;
  if (category === "shedding") return `/shedding/${snakeId}`;
  if (category === "behaviour") return `/behaviour/${snakeId}`;
  if (category === "health") return `/health/${snakeId}`;
  if (category === "activity") return `/snakes/${snakeId}/timeline`;
  return `/snakes/${snakeId}/edit`;
}

type IntelligencePanelProps = { intelligence: SnakeIntelligence; compact?: boolean };

export default function IntelligencePanel({ intelligence, compact = false }: IntelligencePanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullAccess, setFullAccess] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    if (!user) { setFullAccess(false); return () => { active = false; }; }
    void hasFullIntelligenceAccess(user.uid).then((allowed) => { if (active) setFullAccess(allowed); }).catch(() => { if (active) setFullAccess(false); });
    return () => { active = false; };
  }, [user]);

  if (fullAccess === null) return <section className="tt-intelligence-panel" aria-live="polite"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Checking Intelligence access…</h2><p className="tt-intelligence-meta">Checking your optional data-sharing choice before showing advanced intelligence.</p></section>;
  if (!fullAccess) return <section className="tt-intelligence-panel tt-intelligence-locked" data-tone="neutral"><div className="tt-shared-intelligence-header"><div><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Full Intelligence is optional</h2></div><span aria-label="Intelligence locked">🔒</span></div><p className="tt-intelligence-meta">Your core tracking still works without optional sharing. Full Tiny Titans Intelligence is available when you choose to contribute eligible husbandry data anonymously to the growing Tiny Titans knowledge base.</p><p className="tt-intelligence-meta"><strong>Your choice:</strong> optional data sharing is currently off.</p><a className="tt-intelligence-action" href="/account/data-privacy">Enable Intelligence in Data &amp; Privacy →</a></section>;

  const priority = intelligence.priority;
  const priorityRoute = priority ? categoryRoute(priority.category, intelligence.snakeId) : null;
  const baselineWhy = priority?.title === "Build the individual baseline"
    ? `${intelligence.snakeName} doesn't yet have enough history across key areas to make stronger individual comparisons.`
    : priority?.why ?? "Tiny Titans only surfaces an insight when recorded data provides a reason.";
  return <section className="tt-intelligence-panel tt-shared-intelligence" data-tone={priority?.tone ?? "neutral"}>
    <div className="tt-shared-intelligence-header"><div><p className="tt-intelligence-kicker">PERSONALISED INTELLIGENCE · ACTIVE</p><h2 className="tt-intelligence-title">{intelligence.snakeName}'s current picture</h2></div><div className="tt-shared-intelligence-metrics" aria-label="Intelligence data metrics"><span><strong>{intelligence.dataCoveragePercent}%</strong> coverage <button type="button" className="tt-confidence-help" title="What does Intelligence Coverage mean?" aria-label="What does Intelligence Coverage mean?">?</button></span><span><strong>{intelligence.confidence}</strong> confidence <button type="button" className="tt-confidence-help" title={intelligence.confidenceExplanation} aria-label="What does Intelligence Confidence mean?">?</button></span></div></div>
    <div className="tt-intelligence-definitions"><details><summary>What do these percentages mean?</summary><p><strong>Coverage</strong> is how much of the core personal-history data Tiny Titans currently has available to interpret. It is not a score for how complete your records or keeping are.</p><p><strong>Intelligence Confidence</strong> is how reliably the available data supports the current interpretation. It considers factors such as record quantity, time span, recency and consistency. It is <strong>not a rating of your keeping ability, your snake's health, or you as a keeper.</strong></p></details></div>
    <p className="tt-intelligence-meta">{intelligence.summary}</p>
    {!compact && <div className="tt-intelligence-breakdown">{intelligence.coverageMetrics.map((metric) => <span key={metric.key}><strong>{metric.percent}%</strong> {metric.label.toLowerCase()} history</span>)}</div>}
    {priority && <article className="tt-shared-insight" data-tone={priority.tone}>
      <div><span className="tt-shared-insight-label">{toneLabel(priority.tone)}</span><h3>{priority.title}</h3>{priority.title === "Individual weight trend" ? <><strong>Recent trend: {priority.value.split(" · ")[0]}</strong><small>Overall change: {priority.value.split(" · ")[1]?.replace(/\s+overall$/, "") ?? "Not available"}</small></> : <strong>{priority.value}</strong>}</div>
      <p><b>Why:</b> {baselineWhy}</p>
      <p><b>Next:</b> {priority.action}</p>
      <span className="tt-confidence">◉ {confidenceLabel(priority.confidence)}</span>
      {priorityRoute && <button type="button" className="tt-profile-review-button" onClick={() => navigate(priorityRoute)}>Review {categoryLabel(priority.category)} →</button>}
    </article>}
    {!compact && <details className="tt-confidence-details"><summary>Why am I seeing this?</summary><p>{baselineWhy}</p></details>}
    {!compact && <Link className="tt-intelligence-action" to={`/titan-intelligence?snakeId=${encodeURIComponent(intelligence.snakeId)}`}>🧠 Open full Titan Intelligence →</Link>}
  </section>;
}
