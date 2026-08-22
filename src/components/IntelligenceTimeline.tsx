import { buildIntelligenceTimeline, timelineHeadline, type IntelligenceTimelineMetric } from "../services/intelligenceTimelineService";
import type { Snake } from "../types/Snake";

function trendLabel(trend: IntelligenceTimelineMetric["trend"]): string {
  switch (trend) { case "improving": return "Positive change"; case "stable": return "Stable"; case "changing": return "Changing"; default: return "Still building"; }
}

export default function IntelligenceTimeline({ snake }: { snake: Snake }) {
  const metrics = buildIntelligenceTimeline(snake);
  return (
    <section className="tt-intelligence-panel tt-intelligence-timeline">
      <p className="tt-intelligence-kicker">PERSONAL TRAJECTORY</p>
      <h2 className="tt-intelligence-title">{timelineHeadline(metrics)}</h2>
      <p className="tt-intelligence-meta">Tiny Titans compares recent records with this snake's own previous records. It does not interpret change as a diagnosis.</p>
      <div className="tt-intelligence-summary-grid">
        {metrics.map((metric) => (
          <article key={metric.key} className="tt-intelligence-summary-item">
            <div className="tt-intelligence-summary-item-header"><strong>{metric.label}</strong><span>{trendLabel(metric.trend)}</span></div>
            <p className="tt-intelligence-meta"><strong>{metric.current !== undefined ? `${metric.current.toFixed(1)} ${metric.unit}` : "—"}</strong>{metric.change !== undefined ? ` · change ${metric.change > 0 ? "+" : ""}${metric.change.toFixed(1)} ${metric.unit}` : ""}</p>
            <p className="tt-intelligence-meta">{metric.explanation}</p>
            <p className="tt-intelligence-meta">Records used: {metric.records}</p>
          </article>
        ))}
      </div>
      <p className="tt-intelligence-meta"><em>Personal trajectory observations are based only on records you have entered. They are not veterinary advice or health targets.</em></p>
    </section>
  );
}
