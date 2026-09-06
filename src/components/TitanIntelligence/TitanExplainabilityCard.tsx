import type { TitanEvidence, TitanRecommendation, TitanSignal } from "../../intelligence/v50/titanIntelligenceContracts";
import { explainWhyRecommendation, explainWhySignal } from "../../intelligence/v50/titanExplainability";

interface Props {
  recommendation?: TitanRecommendation;
  signal?: TitanSignal;
  evidence?: TitanEvidence;
}

export default function TitanExplainabilityCard({ recommendation, signal, evidence }: Props) {
  if (!recommendation && !signal) return null;
  const explanation = recommendation
    ? explainWhyRecommendation(recommendation, evidence)
    : explainWhySignal(signal!);

  return (
    <details className="titan-why-card">
      <summary>Why am I seeing this?</summary>
      <div className="titan-why-card__body">
        <strong>{explanation.title}</strong>
        <p>{explanation.explanation}</p>
        {explanation.evidence && (
          <small>
            Evidence: <b>{explanation.evidence.level}</b>
            {explanation.evidence.sourceIds.length ? ` · ${explanation.evidence.sourceIds.length} source(s)` : ""}
          </small>
        )}
      </div>
    </details>
  );
}
