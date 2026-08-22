import { detectIntelligenceAnomalies, type IntelligenceAnomaly } from "../services/intelligenceAnomalyService";
import type { Snake } from "../types/Snake";

export default function IntelligenceAnomalyPanel({ snake }: { snake: Snake }) {
  const anomalies = detectIntelligenceAnomalies(snake);
  if (!anomalies.length) return null;
  return (
    <section className="tt-intelligence-panel tt-intelligence-anomalies" aria-live="polite">
      <p className="tt-intelligence-kicker">PATTERN WATCH</p>
      <h2 className="tt-intelligence-title">Something changed in the recent records</h2>
      <p className="tt-intelligence-meta">Tiny Titans has detected a measurable change worth keeping an eye on. It does not know the cause and does not treat the observation as a diagnosis.</p>
      <div className="tt-intelligence-summary-grid">
        {anomalies.map((anomaly: IntelligenceAnomaly) => (
          <article key={anomaly.key} className="tt-intelligence-summary-item">
            <div className="tt-intelligence-summary-item-header"><strong>{anomaly.title}</strong><span>{anomaly.severity === "watch" ? "Watch" : "Notice"}</span></div>
            <p className="tt-intelligence-meta"><strong>{anomaly.observation}</strong></p>
            <p className="tt-intelligence-meta">{anomaly.context}</p>
            <p className="tt-intelligence-meta">Records available: {anomaly.recordCount}</p>
          </article>
        ))}
      </div>
      <p className="tt-intelligence-meta"><em>Useful next step: review recent notes, husbandry changes and environmental records alongside the dates shown. If you have health concerns, use the Health &amp; Vet record and seek appropriate veterinary advice.</em></p>
    </section>
  );
}
