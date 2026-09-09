import { useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { getTitanDecisionState } from '../../services/titanDecisionStateService';
import { refreshFeedbackRanking } from '../../services/intelligenceFeedbackRankingService';
import { TITAN_INTELLIGENCE_UPDATED_EVENT } from '../../services/tinyTitansEventBus';

export default function TitanFeedbackLearningBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let timer: number | null = null;
    const refresh = () => {
      if (!active) return;
      const ids = getTitanDecisionState(user.uid).decisions.map((decision) => decision.id);
      if (!ids.length) return;
      void refreshFeedbackRanking(user.uid, ids).catch(() => undefined);
    };
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ decisionState?: unknown; feedbackRanking?: boolean }>).detail;
      if (detail?.feedbackRanking) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 250);
    };
    window.addEventListener(TITAN_INTELLIGENCE_UPDATED_EVENT, onUpdate);
    timer = window.setTimeout(refresh, 750);
    return () => { active = false; if (timer !== null) window.clearTimeout(timer); window.removeEventListener(TITAN_INTELLIGENCE_UPDATED_EVENT, onUpdate); };
  }, [user]);
  return null;
}
