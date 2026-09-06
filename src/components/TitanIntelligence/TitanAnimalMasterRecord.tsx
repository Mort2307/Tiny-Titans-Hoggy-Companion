import { Link } from "react-router-dom";
import type { AnimalMasterRecord } from "../../intelligence/v50/animalMasterRecordEngine";

interface Props { snakeName: string; record: AnimalMasterRecord }

export default function TitanAnimalMasterRecord({ snakeName, record }: Props) {
  return <section className="titan-feature-panel titan-master-record">
    <div className="titan-master-record__header">
      <div><p className="titan-feature-kicker">🧠 TITAN MASTER RECORD</p><h2>{snakeName}</h2><p>{record.note}</p></div>
      <div className="titan-master-record__score" aria-label={`${record.coverageScore}% record coverage`}><strong>{record.coverageScore}%</strong><span>record coverage</span></div>
    </div>
    <div className="titan-master-record__confidence"><div><strong>{record.dataConfidence.score}%</strong><span>data confidence · {record.dataConfidence.band}</span></div><p>{record.dataConfidence.explanation}</p></div>
    <div className="titan-master-record__domains">{record.domains.map((domain) => <article key={domain.id} className={`titan-master-record__domain titan-master-record__domain--${domain.state}`}><div><strong>{domain.label}</strong><span>{domain.detail}</span></div><b>{domain.count}</b></article>)}</div>
    <div className="titan-master-record__factors">{record.dataConfidence.factors.map((factor) => <div key={factor.id}><strong>{factor.score}%</strong><span>{factor.label}</span><small>{factor.explanation}</small></div>)}</div>
    {record.changes.length > 0 && <div className="titan-master-record__changes"><h3>🔎 Something changed</h3>{record.changes.map((change) => <article key={change.id}><div><strong>{change.title}</strong><p>{change.detail}</p><small>{Math.round(change.confidence * 100)}% confidence · temporal pattern only</small></div><Link to={change.destination}>Review →</Link></article>)}</div>}
    {record.suggestions.length > 0 && <div className="titan-master-record__suggestions"><h3>What Tiny Titans sees next</h3>{record.suggestions.map((suggestion) => <article key={suggestion.id}><div><strong>{suggestion.title}</strong><p>{suggestion.reason}</p><small>{Math.round(suggestion.confidence * 100)}% confidence · record-derived</small></div><Link to={suggestion.destination}>Open →</Link></article>)}</div>}
    {record.latestEvent && <div className="titan-feature-note"><strong>Latest recorded event:</strong> {record.latestEvent.label} · {new Date(record.latestEvent.date).toLocaleDateString("en-GB")} · {record.latestEvent.type}.</div>}
  </section>;
}
