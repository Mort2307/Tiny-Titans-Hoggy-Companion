import type { Snake } from "../types/Snake";
import { buildIntelligenceDataQuality, type DataQualitySeverity } from "../services/intelligenceDataQualityService";

function severityLabel(severity: DataQualitySeverity): string { return severity === "action" ? "Action" : severity === "watch" ? "Check" : "Info"; }

export default function IntelligenceDataQualityPanel({ snake }: { snake: Snake }) {
  const report = buildIntelligenceDataQuality(snake);
  return <section className="tt-intelligence-panel tt-intelligence-data-quality"><p className="tt-intelligence-kicker">DATA QUALITY</p><div className="tt-intelligence-summary-item-header"><div><h2 className="tt-intelligence-title">{report.label} · {report.score}/100</h2><p className="tt-intelligence-meta">Tiny Titans checks record quality before relying heavily on your data for pattern analysis.</p></div><span>{report.checkedRecords} records checked</span></div>{report.issues.length === 0 ? <p className="tt-intelligence-meta">🟢 No obvious data-quality issues were detected in the records currently stored for this snake.</p> : <div className="tt-intelligence-summary-grid">{report.issues.map((issue) => <article key={issue.key} className="tt-intelligence-summary-item"><div className="tt-intelligence-summary-item-header"><strong>{issue.title}</strong><span>{severityLabel(issue.severity)}</span></div><p className="tt-intelligence-meta">{issue.detail}</p></article>)}</div>}<p className="tt-intelligence-meta"><em>A data-quality warning does not mean the underlying record is wrong. It tells you where checking the source record may improve intelligence confidence.</em></p></section>;
}
