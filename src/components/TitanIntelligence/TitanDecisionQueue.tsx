import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveTitanDecisions, subscribeToTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { useAuth } from "../../context/useAuth";
import "../../styles/titanDecisionQueue.css";

function confidenceLabel(value:number): string {
  return value >= 0.9 ? "High" : value >= 0.75 ? "Moderate" : value >= 0.5 ? "Low" : "Insufficient";
}

function actionLabel(decision:TitanDecision): string {
  if (decision.destination.includes("/weights?action=log")) return "Log weight →";
  if (decision.destination.includes("/feeding?action=log")) return "Log feeding →";
  if (decision.destination.includes("/shedding?action=log")) return "Log shed →";
  if (decision.destination.includes("/behaviour?action=log")) return "Log behaviour →";
  if (decision.destination.includes("/health?action=log")) return "Open care log →";
  if (decision.domain === "vivarium") return "Review enclosure →";
  if (decision.domain === "genetics") return "Review genetics →";
  return "Open →";
}

export default function TitanDecisionQueue({ limit = 3, animalId, excludeDecisionId }: { limit?: number; animalId?: string; excludeDecisionId?: string }) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<TitanDecision[]>([]);

  useEffect(() => {
    if (!user) {
      setDecisions([]);
      return;
    }
    const sync = () => setDecisions(getActiveTitanDecisions(user.uid).filter((decision) => (!animalId || decision.animalId === animalId) && decision.id !== excludeDecisionId).slice(0, Math.max(1, limit)));
    sync();
    return subscribeToTitanDecisionState(user.uid, sync);
  }, [user, limit, animalId, excludeDecisionId]);

  if (!user || decisions.length === 0) return null;

  return (
    <section className="titan-decision-queue" aria-labelledby="titan-decision-queue-title">
      <div className="titan-decision-queue-heading">
        <div>
          <p className="titan-decision-queue-kicker">🧠 ALSO WORTH CONSIDERING</p>
          <h2 id="titan-decision-queue-title">Other useful next actions</h2>
          <p>Ranked from the records currently available. Position reflects supporting evidence, not biological urgency.</p>
        </div>
        <span>{decisions.length} surfaced</span>
      </div>
      <div className="titan-decision-queue-list">
        {decisions.map((decision, index) => (
          <article key={decision.id} className="titan-decision-queue-item">
            <div className="titan-decision-queue-rank">{index + 1}</div>
            <div className="titan-decision-queue-copy">
              <div className="titan-decision-queue-meta">
                <span>{decision.animalName ?? "Your Titan"}</span>
                <span>{decision.domain}</span>
                <span>{confidenceLabel(decision.confidence)} confidence</span>
              </div>
              <h3>{decision.title}</h3>
              <p><strong>Why:</strong> {decision.why}</p>
              <p><strong>Next:</strong> {decision.reason}</p>
              <p className="titan-decision-queue-boundary">Record-derived prioritisation only — not a diagnosis or proof of causation.</p>
            </div>
            <Link className="titan-decision-queue-action" to={decision.destination}>{actionLabel(decision)}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}