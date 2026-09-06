import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hasFullIntelligenceAccess } from "../../services/intelligenceAccessService";
import { refreshTitanDecisionStateForAnimals, subscribeToTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../../services/titanReactiveIntelligenceService";
import "../../styles/titanNextAction.css";
import "../../styles/titanGlobalNextAction.css";

const ANIMAL_CONTEXT_PREFIXES = ["/snakes", "/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry", "/enclosure-intelligence"];

function animalIdFromPath(pathname: string): string | null {
  const prefix = ANIMAL_CONTEXT_PREFIXES.find((candidate) => pathname.startsWith(`${candidate}/`));
  if (!prefix) return null;
  const remainder = pathname.slice(prefix.length + 1);
  const [segment] = remainder.split("/");
  return segment ? decodeURIComponent(segment) : null;
}

export default function TitanGlobalNextAction() {
  const { user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [decision, setDecision] = useState<TitanDecision | null>(null);
  const [enabled, setEnabled] = useState(false);
  const animalId = animalIdFromPath(location.pathname);

  useEffect(() => {
    if (!user || loading || profileLoading || !animalId) {
      setEnabled(false);
      setDecision(null);
      return undefined;
    }
    let cancelled = false;
    let cleanup = () => undefined;

    void hasFullIntelligenceAccess(user.uid).then((available) => {
      if (cancelled) return;
      setEnabled(available);
      if (!available) return;

      const sync = (state: { decisions: readonly TitanDecision[] }) => {
        if (cancelled) return;
        setDecision(state.decisions.find((item) => item.status === "active" && item.animalId === animalId) ?? null);
      };
      const unsubscribe = subscribeToTitanDecisionState(user.uid, sync);
      const reactiveUnsubscribe = subscribeToTitanIntelligenceUpdates((detail) => {
        if (detail.event?.animalId !== animalId) return;
        void refreshTitanDecisionStateForAnimals(user.uid, [animalId], { type: detail.event.type, occurredAt: detail.event.occurredAt }).then(sync).catch(() => undefined);
      }, user.uid);
      cleanup = () => { unsubscribe(); reactiveUnsubscribe(); };

      void refreshTitanDecisionStateForAnimals(user.uid, [animalId]).then(sync).catch(() => undefined);
      try {
        const current = localStorage.getItem(`tinyTitans:titan-decision-state:${user.uid}`);
        if (current) {
          const parsed = JSON.parse(current) as { decisions?: TitanDecision[] };
          sync({ decisions: parsed.decisions ?? [] });
        }
      } catch { /* cached decision state is optional */ }
    }).catch(() => {
      if (!cancelled) setEnabled(false);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [user, loading, profileLoading, animalId]);

  if (!enabled || !decision || !animalId) return null;
  return (
    <section className="tt-global-next-action" aria-label="Current Tiny Titan next action">
      <div className="tt-global-next-action__copy">
        <span className="tt-global-next-action__eyebrow">🧠 Tiny Titans Intelligence</span>
        <strong>{decision.title}</strong>
        <span>{decision.reason}</span>
      </div>
      <button type="button" className="hoggie-titan-next-action" onClick={() => navigate(decision.destination)}>
        Open next action →
      </button>
    </section>
  );
}
