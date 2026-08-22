import type { IntelligenceSummary } from "../services/intelligenceSummaryService";
import { comparisonLabel } from "../services/personalBenchmarkInsightService";

export default function ExplainableIntelligenceSummary({ summary }: { summary: IntelligenceSummary }) {
  return (
    <section className={`tt-intelligence-panel tt-intelligence-summary tt-intelligence-${summary.tone}`}>
      <p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p>
      <h2 className="tt-intelligence-title">{summary.headline}</h2>
      <p className="tt-intelligence-meta">{summary.explanation}</p>

      <div className="tt-intelligence-summary-grid">
        {summary.comparisons.map((comparison) => (
          <article key={comparison.metric} className="tt-intelligence-summary-item">
            <div className="tt-intelligence-summary-item-header">
              <strong>{comparison.label}</strong>
              <span>{comparisonLabel(comparison.status)}</span>
            </div>
            {comparison.personalValue !== undefined && (
              <p className="tt-intelligence-meta">
                <strong>{comparison.personalValue.toFixed(1)} {comparison.unit}</strong>
                {comparison.lowerQuartile !== undefined && comparison.upperQuartile !== undefined && (
                  <> · cohort middle 50%: {comparison.lowerQuartile.toFixed(1)}–{comparison.upperQuartile.toFixed(1)} {comparison.unit}</>
                )}
              </p>
            )}
            <p className="tt-intelligence-meta">{comparison.explanation}</p>
          </article>
        ))}
      </div>

      <p className="tt-intelligence-meta"><strong>Dataset confidence:</strong> {summary.confidence} · {summary.availableCount} comparable area{summary.availableCount === 1 ? "" : "s"} currently measurable.</p>
      <p className="tt-intelligence-meta"><em>Community comparisons are observational patterns, not veterinary advice, health targets, or diagnoses.</em></p>
    </section>
  );
}
