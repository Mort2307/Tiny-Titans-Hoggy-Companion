import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveTitanDecisions, subscribeToTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { useAuth } from "../../context/useAuth";
import "../../styles/titanDecisionQueue.css";

function confidenceLabel(value:number): string {
  return value >= 0.9 ? "High" : value >= 0.75 ? "Moderate" : value >= 0.5 ? "Low" : "Insufficient";
}

export default function TitanDecisionQueue({ limit = 3 }: { limit?: number }) {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<TitanDecision[]>([]);

  useEffect(() => {
    if (!user) {
      setDecisions([]);
      return;
    }
    const sync = () => setDecisions(getActiveTitanDecisions(user.uid).slice(0, Math.max(1, limit)));
    sync();
    return subscribeToTitanDecisionState(user.uid, sync);
  }, [user, limit]);

  if (!user || decisions.length === 0) return null;

  return (
    <section className="titan-decision-queue" aria-labelledby="titan-decision-queue-title">
      <div className="titan-decision-queue-heading">
        <div>
          <p className="titan-decision-queue-kicker">🧠 NEXT BEST ACTIONS</p>
          <h2 id="titan-decision-queue-title">Things Tiny Titans thinks are worth doing</h2>
          <p>Ranked from the records currently available. A higher position means stronger supporting evidence, not greater biological urgency.</p>
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
            <Link className="titan-decision-queue-action" to={decision.destination}>Open →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
