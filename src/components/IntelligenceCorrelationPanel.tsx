import type { Snake } from "../types/Snake";
import { buildIntelligenceCorrelations } from "../services/intelligenceCorrelationService";

export default function IntelligenceCorrelationPanel({ snake }: { snake: Snake }) {
  const correlations = buildIntelligenceCorrelations(snake);
  if (!correlations.length) return null;
  return <section className="tt-intelligence-panel tt-intelligence-correlations"><p className="tt-intelligence-kicker">TIMELINE CONTEXT</p><h2 className="tt-intelligence-title">What was happening around the change?</h2><p className="tt-intelligence-meta">Tiny Titans can show nearby recorded events. Timing is not causation.</p><div className="tt-intelligence-summary-grid">{correlations.map((item) => <article key={item.anomaly.key} className="tt-intelligence-summary-item"><div className="tt-intelligence-summary-item-header"><strong>{item.anomaly.title}</strong><span>{item.nearbyEvents.length ? `${item.nearbyEvents.length} nearby record${item.nearbyEvents.length === 1 ? "" : "s"}` : "No nearby records"}</span></div><p className="tt-intelligence-meta">{item.anomaly.observation}</p>{item.nearbyEvents.length > 0 && <ul>{item.nearbyEvents.map((event, index) => <li key={`${event.type}-${event.date}-${index}`}><strong>{event.date}</strong> · {event.label}</li>)}</ul>}<p className="tt-intelligence-meta"><em>{item.explanation}</em></p></article>)}</div></section>;
}
