import { doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../firebase/config';
import { getTitanDecisionState, type TitanDecisionState } from './titanDecisionStateService';
import { TITAN_INTELLIGENCE_UPDATED_EVENT } from './tinyTitansEventBus';

export type IntelligenceFeedbackSignal = {
  helpful: number;
  'not-helpful': number;
  wrong: number;
  dismissed: number;
  'acted-on': number;
  total: number;
  positive: number;
  negative: number;
};
type FeedbackResponse = { signals: Record<string, IntelligenceFeedbackSignal> };
const feedbackCallable = httpsCallable<{ insightIds: string[] }, FeedbackResponse>(getFunctions(app, 'europe-west2'), 'getIntelligenceFeedbackSignals');

export async function getIntelligenceFeedbackSignals(insightIds: readonly string[]) {
  const ids = [...new Set(insightIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  if (!ids.length) return {} as Record<string, IntelligenceFeedbackSignal>;
  const result = await feedbackCallable({ insightIds: ids });
  return result.data.signals;
}
function feedbackBias(signal?: IntelligenceFeedbackSignal): number {
  if (!signal || signal.total < 3) return 0;
  const directional = signal.positive - signal.negative;
  const ratio = directional / signal.total;
  const confidence = Math.min(1, signal.total / 12);
  return Math.round(Math.max(-8, Math.min(8, ratio * 10 * confidence)));
}
function storeState(uid: string, state: TitanDecisionState) {
  try { window.localStorage.setItem(`tinyTitans:titan-decision-state:${uid}`, JSON.stringify(state)); } catch { /* non-critical cache */ }
  void setDoc(doc(db, 'users', uid, 'intelligence', 'titanDecisionState'), JSON.parse(JSON.stringify(state)), { merge: false }).catch(() => undefined);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TITAN_INTELLIGENCE_UPDATED_EVENT, { detail: { decisionState: state, feedbackRanking: true } }));
}
export function applyFeedbackRanking(uid: string, signals: Record<string, IntelligenceFeedbackSignal>): TitanDecisionState {
  const current = getTitanDecisionState(uid);
  const decisions = current.decisions
    .map((decision) => ({ ...decision, score: Math.max(0, Math.min(100, decision.score + feedbackBias(signals[decision.id] ?? signals[decision.title]))) }))
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || b.lastSeenAt - a.lastSeenAt);
  const next: TitanDecisionState = { ...current, generatedAt: Date.now(), activeDecisionId: decisions.find((decision) => decision.status === 'active')?.id, decisions };
  storeState(uid, next);
  return next;
}
export async function refreshFeedbackRanking(uid: string, insightIds: readonly string[]) {
  const signals = await getIntelligenceFeedbackSignals(insightIds);
  return applyFeedbackRanking(uid, signals);
}
