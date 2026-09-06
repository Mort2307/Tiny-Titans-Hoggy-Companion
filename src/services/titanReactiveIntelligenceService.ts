import type { SnakeInsight, SnakeIntelligence } from "./snakeIntelligenceService";
import { tinyTitansEventBus, TITAN_INTELLIGENCE_UPDATED_EVENT, type TinyTitansEvent } from "./tinyTitansEventBus";

type TitanRecordEventType = "WeightRecorded" | "FeedingRecorded" | "ShedRecorded" | "BehaviourObserved" | "HealthRecordCreated" | "MicroclimateRecorded" | "EnclosureChanged" | "GeneticsChanged" | "BreedingProjectChanged" | "HatchlingRecorded" | "LearningActivityRecorded";
type TitanActionKind = "created" | "updated" | "deleted";
export interface TitanReactiveEvent { id: string; uid: string; animalId?: string; type: TitanRecordEventType; action: TitanActionKind; createdAt: number; }
export type TitanProactiveItemStatus = "active" | "handled" | "dismissed";
export interface TitanProactiveStateItem { key: string; uid: string; animalId: string; insightId: string; title: string; why: string; action: string; tone: SnakeInsight["tone"]; confidence: SnakeInsight["confidence"]; status: TitanProactiveItemStatus; firstSeenAt: number; lastSeenAt: number; lastEventAt?: number; handledAt?: number; dismissedAt?: number; }
export interface TitanReactiveUpdateDetail { event?: TitanReactiveEvent; affectedAnimalId?: string; }

const EVENTS_KEY = (uid: string) => `tinyTitans:titan-events:${uid}`;
const STATE_KEY = (uid: string) => `tinyTitans:titan-proactive-state:${uid}`;
const MAX_EVENTS = 30;
const MAX_STATE_ITEMS = 100;
const STATE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function safeRead<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function safeWrite<T>(key: string, value: T): void { if (typeof window === "undefined") return; try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Non-critical cache. Never block keeper actions. */ } }
function pruneState(items: TitanProactiveStateItem[], now = Date.now()): TitanProactiveStateItem[] { return items.filter((item) => now - item.lastSeenAt <= STATE_TTL_MS || item.status === "active").sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, MAX_STATE_ITEMS); }
function insightKey(animalId: string, insightId: string): string { return `${animalId}:${insightId}`; }

function mapToDomainEvent(event: TitanReactiveEvent): void {
  const at = new Date(event.createdAt).toISOString();
  if (event.type === "WeightRecorded" && event.animalId) tinyTitansEventBus.emit({ type: "WeightRecorded", payload: { snakeId: event.animalId, weightGrams: 0, occurredAt: at } });
  else if (event.type === "FeedingRecorded" && event.animalId) tinyTitansEventBus.emit({ type: "FeedingRecorded", payload: { snakeId: event.animalId, occurredAt: at } });
  else if (event.type === "ShedRecorded" && event.animalId) tinyTitansEventBus.emit({ type: "ShedRecorded", payload: { snakeId: event.animalId, status: "Complete", occurredAt: at } });
}

export function emitTitanIntelligenceEvent(input: Omit<TitanReactiveEvent, "id" | "createdAt">): TitanReactiveEvent {
  const event: TitanReactiveEvent = { ...input, id: `${input.type}-${input.action}-${input.animalId ?? "collection"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
  const events = safeRead<TitanReactiveEvent[]>(EVENTS_KEY(input.uid), []);
  safeWrite(EVENTS_KEY(input.uid), [event, ...events].slice(0, MAX_EVENTS));
  mapToDomainEvent(event);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<TitanReactiveUpdateDetail>(TITAN_INTELLIGENCE_UPDATED_EVENT, { detail: { event, affectedAnimalId: input.animalId } }));
  return event;
}

export function getRecentTitanIntelligenceEvents(uid: string, max = 12): TitanReactiveEvent[] { return safeRead<TitanReactiveEvent[]>(EVENTS_KEY(uid), []).slice(0, max); }

export function mergeTitanProactiveState(uid: string, insights: readonly SnakeIntelligence[], recentEvents: readonly TitanReactiveEvent[] = getRecentTitanIntelligenceEvents(uid)): TitanProactiveStateItem[] {
  const now = Date.now();
  const state = pruneState(safeRead<TitanProactiveStateItem[]>(STATE_KEY(uid), []), now);
  const byKey = new Map(state.map((item) => [item.key, item]));
  for (const intelligence of insights) {
    const priority = intelligence.priority;
    if (!priority) continue;
    const key = insightKey(intelligence.snakeId, priority.id);
    const latestEventAt = recentEvents.find((event) => event.animalId === intelligence.snakeId)?.createdAt;
    const existing = byKey.get(key);
    const isNewContext = Boolean(latestEventAt && (!existing?.lastEventAt || latestEventAt > existing.lastEventAt));
    const status = isNewContext ? "active" : existing?.status === "dismissed" || existing?.status === "handled" ? existing.status : "active";
    byKey.set(key, { key, uid, animalId: intelligence.snakeId, insightId: priority.id, title: priority.title, why: priority.why, action: priority.action, tone: priority.tone, confidence: priority.confidence, status, firstSeenAt: existing?.firstSeenAt ?? now, lastSeenAt: now, lastEventAt: latestEventAt ?? existing?.lastEventAt, handledAt: isNewContext ? undefined : existing?.handledAt, dismissedAt: isNewContext ? undefined : existing?.dismissedAt });
  }
  const merged = pruneState([...byKey.values()], now);
  safeWrite(STATE_KEY(uid), merged);
  return merged.filter((item) => item.status === "active");
}

export function markTitanProactiveHandled(uid: string, animalId: string, insightId: string): void { updateTitanProactiveState(uid, insightKey(animalId, insightId), "handled"); }
export function dismissTitanProactive(uid: string, animalId: string, insightId: string): void { updateTitanProactiveState(uid, insightKey(animalId, insightId), "dismissed"); }
export function reopenTitanProactive(uid: string, animalId: string, insightId: string): void { updateTitanProactiveState(uid, insightKey(animalId, insightId), "active"); }
export function getActiveTitanProactiveState(uid: string): TitanProactiveStateItem[] { return pruneState(safeRead<TitanProactiveStateItem[]>(STATE_KEY(uid), [])).filter((item) => item.status === "active"); }

export function subscribeToTitanIntelligenceUpdates(callback: (detail: TitanReactiveUpdateDetail) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => callback((event as CustomEvent<TitanReactiveUpdateDetail>).detail ?? {});
  window.addEventListener(TITAN_INTELLIGENCE_UPDATED_EVENT, listener as EventListener);
  return () => window.removeEventListener(TITAN_INTELLIGENCE_UPDATED_EVENT, listener as EventListener);
}

function updateTitanProactiveState(uid: string, key: string, status: TitanProactiveItemStatus): void {
  const now = Date.now();
  const items = safeRead<TitanProactiveStateItem[]>(STATE_KEY(uid), []);
  const updated = items.map((item) => item.key === key ? { ...item, status, ...(status === "handled" ? { handledAt: now, dismissedAt: undefined } : {}), ...(status === "dismissed" ? { dismissedAt: now, handledAt: undefined } : {}), ...(status === "active" ? { handledAt: undefined, dismissedAt: undefined } : {}), lastSeenAt: now } : item);
  safeWrite(STATE_KEY(uid), pruneState(updated, now));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TITAN_INTELLIGENCE_UPDATED_EVENT));
}

// Keep the compiler aware that the reactive service deliberately bridges the typed domain bus.
export type TitanReactiveDomainEvent = TinyTitansEvent;
