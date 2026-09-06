import type { SnakeIntelligence } from "./snakeIntelligenceService";
import type { TitanRecommendation, TitanSignal } from "../intelligence/v50/titanIntelligenceContracts";
import { TITAN_INTELLIGENCE_UPDATED_EVENT } from "./tinyTitansEventBus";

export type TitanDecisionStatus = "active" | "handled" | "dismissed";
export type TitanDecisionDomain = "genetics" | "vivarium" | "growth" | "feeding" | "shedding" | "behaviour" | "health" | "learning" | "data" | "activity" | "community";

export interface TitanDecision {
  id: string;
  uid: string;
  animalId?: string;
  animalName?: string;
  domain: TitanDecisionDomain;
  title: string;
  reason: string;
  destination: string;
  priority: number;
  confidence: number;
  score: number;
  why: string;
  status: TitanDecisionStatus;
  firstSeenAt: number;
  lastSeenAt: number;
  lastEventAt?: number;
  handledAt?: number;
  dismissedAt?: number;
}

export interface TitanDecisionState {
  uid: string;
  version: 1;
  generatedAt: number;
  activeDecisionId?: string;
  decisions: readonly TitanDecision[];
}

const STATE_KEY = (uid: string) => `tinyTitans:titan-decision-state:${uid}`;
const STATE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_DECISIONS = 100;

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Non-critical local state. */ }
}

function clamp(value: number): number { return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0; }

function confidenceScore(confidence: number): number { return clamp(confidence * 20); }

function domainFor(id: string, title: string): TitanDecisionDomain {
  const text = `${id} ${title}`.toLowerCase();
  if (text.includes("genetic") || text.includes("morph") || text.includes("offspring") || text.includes("outcome")) return "genetics";
  if (text.includes("vivarium") || text.includes("digital twin") || text.includes("enclosure") || text.includes("microclimate") || text.includes("humidity") || text.includes("temperature")) return "vivarium";
  if (text.includes("growth") || text.includes("weight")) return "growth";
  if (text.includes("feeding") || text.includes("feed")) return "feeding";
  if (text.includes("shed")) return "shedding";
  if (text.includes("behaviour") || text.includes("behavior")) return "behaviour";
  if (text.includes("health") || text.includes("follow-up")) return "health";
  if (text.includes("learn")) return "learning";
  if (text.includes("community") || text.includes("keeper")) return "community";
  if (text.includes("activity")) return "activity";
  return "data";
}

function scoreRecommendation(recommendation: TitanRecommendation, signals: readonly TitanSignal[]): number {
  const related = signals.filter((signal) => signal.actionPath === recommendation.destination || signal.title.toLowerCase().includes(recommendation.title.toLowerCase().split(" ")[0]));
  const signalBoost = related.length ? Math.min(18, related.reduce((sum, signal) => sum + signal.confidence * 6, 0)) : 0;
  const confidenceBoost = confidenceScore(recommendation.confidence);
  const priority = clamp(recommendation.priority);
  return Math.round(Math.min(100, priority * 0.62 + confidenceBoost + signalBoost));
}

function decisionFromRecommendation(uid: string, recommendation: TitanRecommendation, intelligence: SnakeIntelligence, signals: readonly TitanSignal[], now: number): TitanDecision {
  const domain = domainFor(recommendation.id, recommendation.title);
  const score = scoreRecommendation(recommendation, signals);
  return {
    id: `${intelligence.snakeId}:${recommendation.id}`,
    uid,
    animalId: intelligence.snakeId,
    animalName: intelligence.snakeName,
    domain,
    title: recommendation.title,
    reason: recommendation.reason,
    destination: recommendation.destination,
    priority: recommendation.priority,
    confidence: recommendation.confidence,
    score,
    why: recommendation.reason,
    status: "active",
    firstSeenAt: now,
    lastSeenAt: now,
  };
}

function prune(decisions: TitanDecision[], now: number): TitanDecision[] {
  return decisions
    .filter((decision) => decision.status === "active" || now - decision.lastSeenAt <= STATE_TTL_MS)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || b.lastSeenAt - a.lastSeenAt)
    .slice(0, MAX_DECISIONS);
}

export function getTitanDecisionState(uid: string): TitanDecisionState {
  const now = Date.now();
  const stored = safeRead<TitanDecisionState>(STATE_KEY(uid), { uid, version: 1, generatedAt: now, decisions: [] });
  const decisions = prune([...(stored.decisions ?? [])], now);
  const activeDecisionId = decisions.find((decision) => decision.status === "active")?.id;
  return { uid, version: 1, generatedAt: stored.generatedAt ?? now, activeDecisionId, decisions };
}

export function getActiveTitanDecisions(uid: string): TitanDecision[] {
  return getTitanDecisionState(uid).decisions.filter((decision) => decision.status === "active");
}

export function getTopTitanDecision(uid: string): TitanDecision | null {
  return getActiveTitanDecisions(uid)[0] ?? null;
}

export function persistTitanDecisionState(uid: string, intelligence: readonly SnakeIntelligence[], signalsByAnimalId: Readonly<Record<string, readonly TitanSignal[]>> = {}): TitanDecisionState {
  const now = Date.now();
  const previous = getTitanDecisionState(uid);
  const byId = new Map(previous.decisions.map((decision) => [decision.id, decision]));

  for (const animal of intelligence) {
    const signals = signalsByAnimalId[animal.snakeId] ?? [];
    for (const recommendation of animal.priority ? [animal.priority] : []) {
      const next = decisionFromRecommendation(uid, recommendation as unknown as TitanRecommendation, animal, signals, now);
      const existing = byId.get(next.id);
      byId.set(next.id, {
        ...next,
        status: existing?.status === "handled" || existing?.status === "dismissed" ? existing.status : "active",
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastEventAt: existing?.lastEventAt,
        handledAt: existing?.handledAt,
        dismissedAt: existing?.dismissedAt,
      });
    }
  }

  const decisions = prune([...byId.values()], now);
  const activeDecisionId = decisions.find((decision) => decision.status === "active")?.id;
  const state: TitanDecisionState = { uid, version: 1, generatedAt: now, activeDecisionId, decisions };
  safeWrite(STATE_KEY(uid), state);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TITAN_INTELLIGENCE_UPDATED_EVENT, { detail: { decisionState: state } }));
  return state;
}

export function markTitanDecisionHandled(uid: string, decisionId: string): TitanDecisionState {
  return updateDecisionStatus(uid, decisionId, "handled");
}

export function dismissTitanDecision(uid: string, decisionId: string): TitanDecisionState {
  return updateDecisionStatus(uid, decisionId, "dismissed");
}

export function reopenTitanDecision(uid: string, decisionId: string): TitanDecisionState {
  return updateDecisionStatus(uid, decisionId, "active");
}

function updateDecisionStatus(uid: string, decisionId: string, status: TitanDecisionStatus): TitanDecisionState {
  const now = Date.now();
  const current = getTitanDecisionState(uid);
  const decisions = current.decisions.map((decision) => decision.id !== decisionId ? decision : {
    ...decision,
    status,
    lastSeenAt: now,
    handledAt: status === "handled" ? now : undefined,
    dismissedAt: status === "dismissed" ? now : undefined,
  });
  const activeDecisionId = decisions.find((decision) => decision.status === "active")?.id;
  const next: TitanDecisionState = { ...current, generatedAt: now, activeDecisionId, decisions: prune(decisions, now) };
  safeWrite(STATE_KEY(uid), next);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TITAN_INTELLIGENCE_UPDATED_EVENT, { detail: { decisionState: next } }));
  return next;
}

export function clearTitanDecisionState(uid: string): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STATE_KEY(uid));
}
