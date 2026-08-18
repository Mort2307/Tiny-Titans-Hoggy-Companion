import type { SnakeIntelligence, SnakeInsight } from "../services/snakeIntelligenceService";

function confidenceLabel(value: SnakeIntelligence["confidence"]): string {
  return value === "High" ? "High · Reliable pattern" : value === "Moderate" ? "Moderate · Pattern developing" : value === "Low" ? "Low · More data needed" : "More data needed";
}

function toneLabel(value: SnakeInsight["tone"]): string {
  return value === "attention" ? "Worth reviewing" : value === "positive" ? "Positive pattern" : "Recorded pattern";
}

type IntelligencePanelProps = {
  intelligence: SnakeIntelligence;
  compact?: boolean;
};

export default function IntelligencePanel({ intelligence, compact = false }: IntelligencePanelProps) {
  const priority = intelligence.priority;
  return <section className="tt-intelligence-panel tt-shared-intelligence" data-tone={priority?.tone ?? "neutral"}>
    <div className="tt-shared-intelligence-header">
      <div>
        <p className="tt-intelligence-kicker">PERSONALISED INTELLIGENCE</p>
        <h2 className="tt-intelligence-title">{intelligence.snakeName}'s current picture</h2>
      </div>
      <div className="tt-shared-intelligence-metrics" aria-label="Intelligence data metrics">
        <span>
          <strong>{intelligence.dataCoveragePercent}%</strong> coverage
          <button type="button" className="tt-confidence-help" title="What does Intelligence Coverage mean?" aria-label="What does Intelligence Coverage mean?">?</button>
        </span>
        <span>
          <strong>{intelligence.confidence}</strong> confidence
          <button type="button" className="tt-confidence-help" title={intelligence.confidenceExplanation} aria-label="What does Intelligence Confidence mean?">?</button>
        </span>
      </div>
    </div>
    <div className="tt-intelligence-definitions">
      <details>
        <summary>What do these percentages mean?</summary>
        <p><strong>Coverage</strong> is how much of the core personal-history data Tiny Titans currently has available to interpret. It is not a score for how complete your records or keeping are.</p>
        <p><strong>Intelligence Confidence</strong> is how reliably the available data supports the current interpretation. It considers factors such as record quantity, time span, recency and consistency. It is <strong>not a rating of your keeping ability, your snake's health, or you as a keeper.</strong></p>
      </details>
    </div>
    <p className="tt-intelligence-meta">{intelligence.summary}</p>
    {!compact && <div className="tt-intelligence-breakdown">{intelligence.coverageMetrics.map((metric) => <span key={metric.key}><strong>{metric.percent}%</strong> {metric.label.toLowerCase()} history</span>)}</div>}
    {priority && <article className="tt-shared-insight" data-tone={priority.tone}>
      <div><span className="tt-shared-insight-label">{toneLabel(priority.tone)}</span><h3>{priority.title}</h3><strong>{priority.value}</strong></div>
      <p><b>Why:</b> {priority.why}</p>
      <p><b>Next:</b> {priority.action}</p>
      <span className="tt-confidence">◉ {confidenceLabel(priority.confidence)}</span>
    </article>}
    {!compact && <details className="tt-confidence-details"><summary>Why am I seeing this?</summary><p>{priority?.why ?? "Tiny Titans only surfaces an insight when recorded data provides a reason."}</p></details>}
  </section>;
}
