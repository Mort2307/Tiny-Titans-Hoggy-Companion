import { Link } from "react-router-dom";
import type { TitanDecision } from "../../services/titanDecisionStateService";
import TitanDecisionFeedback from "./TitanDecisionFeedback";
import "./TitanDecisionWhyCard.css";

interface Props { decision: TitanDecision; compact?: boolean; }

export default function TitanDecisionWhyCard({ decision, compact = false }: Props) {
  return <section className={`titan-decision-why${compact ? " titan-decision-why--compact" : ""}`} aria-label="Why am I seeing this decision?">
    <div className="titan-decision-why__heading"><div><p className="titan-eyebrow">🧠 WHY AM I SEEING THIS?</p><h3>{decision.explanation.headline}</h3></div><span>{Math.round(decision.confidence * 100)}% confidence</span></div>
    <p>{decision.explanation.summary}</p>
    {!compact && <>
      {decision.explanation.evidence.length > 0 && <div className="titan-decision-why__evidence">{decision.explanation.evidence.map(item => <article key={item.id}><strong>{item.label}</strong><small>{item.detail}</small><span>{Math.round(item.confidence * 100)}% · {item.level ?? "record-derived"}</span></article>)}</div>}
      {decision.explanation.contributingDomains.length > 0 && <div className="titan-decision-why__chips">{decision.explanation.contributingDomains.map(domain => <span key={domain}>{domain}</span>)}</div>}
      {decision.explanation.triggeredBy.length > 0 && <p className="titan-decision-why__trigger"><b>Recent trigger context:</b> {decision.explanation.triggeredBy.join(" · ")}</p>}
      <p className="titan-decision-why__boundary"><b>Boundary:</b> {decision.explanation.boundary}</p>
    </>}
    <Link to={decision.destination || "/"}>Review the canonical next action →</Link>
    {!compact && <TitanDecisionFeedback insightId={decision.id} animalId={decision.animalId} domain={decision.domain} destination={decision.destination} />}
  </section>;
}
