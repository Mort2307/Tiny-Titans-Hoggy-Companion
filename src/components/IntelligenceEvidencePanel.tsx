import type { Snake } from "../types/Snake";
import type { CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import { buildIntelligenceEvidence } from "../services/intelligenceEvidenceService";

export default function IntelligenceEvidencePanel({ snake, benchmark }: { snake: Snake; benchmark: CommunityBenchmarkDataset | null }) {
  const evidence = buildIntelligenceEvidence(snake, benchmark);
  return <section className="tt-intelligence-panel tt-intelligence-evidence"><p className="tt-intelligence-kicker">WHY AM I SEEING THIS?</p><h2 className="tt-intelligence-title">Evidence behind Tiny Titans Intelligence</h2><p className="tt-intelligence-meta">Every insight should be explainable. This panel shows the broad evidence and limitations behind the current intelligence summary.</p><div className="tt-intelligence-summary-grid">{evidence.evidence.map((item) => <article key={item.label} className="tt-intelligence-summary-item"><strong>{item.label}</strong><p className="tt-intelligence-meta">{item.value}</p></article>)}</div><details className="tt-intelligence-details"><summary>Show limitations and safeguards</summary><ul>{evidence.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul><p className="tt-intelligence-meta">Generated: {new Date(evidence.generatedAt).toLocaleString()}</p></details></section>;
}
