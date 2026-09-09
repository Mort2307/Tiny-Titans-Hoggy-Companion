import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useLiveWorldTime } from "../context/WorldTimeContext";
import { getTopTitanDecision, subscribeToTitanDecisionState, type TitanDecision } from "../services/titanDecisionStateService";
import { buildWorldIntelligenceBrief } from "../services/worldIntelligenceService";
import "./WorldIntelligenceContext.css";

export default function WorldIntelligenceContext() {
  const { user, loading, profileLoading } = useAuth();
  const world = useLiveWorldTime();
  const [decision, setDecision] = useState<TitanDecision | null>(null);

  useEffect(() => {
    if (!user || loading || profileLoading) {
      setDecision(null);
      return undefined;
    }
    const refresh = () => setDecision(getTopTitanDecision(user.uid));
    refresh();
    return subscribeToTitanDecisionState(user.uid, refresh);
  }, [user, loading, profileLoading]);

  const brief = useMemo(() => buildWorldIntelligenceBrief(world, Boolean(decision)), [world, decision]);

  if (!user || loading || profileLoading) return null;

  return (
    <section className={`tt-world-intelligence tt-world-intelligence--${brief.tone}`} aria-label="Live Tiny Titans world context">
      <div className="tt-world-intelligence__meta">
        <span className="tt-world-intelligence__eyebrow">{brief.eyebrow}</span>
        <span className="tt-world-intelligence__clock">{world.localTime} · {world.localWeekday} · {world.timezoneLabel} · {world.utcOffsetLabel}</span>
      </div>
      <div className="tt-world-intelligence__body">
        <div>
          <strong>{brief.headline}</strong>
          <p>{brief.detail}</p>
        </div>
        {decision && <Link to={decision.destination || `/snakes/${decision.animalId}/master-record`} className="tt-world-intelligence__action">Open ranked action →</Link>}
      </div>
    </section>
  );
}
