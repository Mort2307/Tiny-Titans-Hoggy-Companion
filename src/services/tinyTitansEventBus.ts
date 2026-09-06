/**
 * Small in-process event bus for Tiny Titans domain events.
 *
 * The bus deliberately has no Firebase dependency. UI, intelligence and
 * persistence layers can subscribe to the same domain events without making
 * those layers depend on one another.
 */

export type TinyTitansEventMap = {
  SnakeCreated: { snakeId: string; occurredAt: string };
  WeightRecorded: { snakeId: string; weightGrams: number; occurredAt: string };
  FeedingRecorded: { snakeId: string; occurredAt: string };
  ShedRecorded: { snakeId: string; status: "Complete" | "Partial" | "Problematic"; occurredAt: string };
  BehaviourRecorded: { snakeId: string; recordId: string; observation: string; context: string; occurredAt: string; operation: "create" | "update" };
  HealthRecordCreated: { snakeId: string; occurredAt: string };
  MicroclimateRecorded: { snakeId: string; enclosureId?: string; occurredAt: string };
  EnclosureUpdated: { snakeId: string; enclosureId: string; occurredAt: string };
  MorphConfirmed: { snakeId: string; morphId: string; occurredAt: string };
  GeneticsChanged: { snakeId: string; occurredAt: string };
  BreedingProjectCreated: { projectId: string; occurredAt: string };
  BreedingProjectChanged: { projectId: string; snakeId?: string; action: "created" | "updated" | "deleted"; occurredAt: string };
  HatchlingRecorded: { projectId: string; snakeId?: string; action: "created" | "updated" | "deleted"; occurredAt: string };
  MarketplaceListingCreated: { listingId: string; snakeId?: string; occurredAt: string };
  AchievementUnlocked: { achievementId: string; occurredAt: string };
  NotificationScheduled: { notificationId: string; occurredAt: string };
};

export type TinyTitansEventName = keyof TinyTitansEventMap;
export type TinyTitansEvent<K extends TinyTitansEventName = TinyTitansEventName> = { type: K; payload: TinyTitansEventMap[K] };
type Listener<K extends TinyTitansEventName> = (event: TinyTitansEvent<K>) => void;

export const TITAN_INTELLIGENCE_UPDATED_EVENT = "titan:intelligence-updated";

class TinyTitansEventBus {
  private readonly listeners = new Map<TinyTitansEventName, Set<Listener<TinyTitansEventName>>>();

  on<K extends TinyTitansEventName>(type: K, listener: Listener<K>): () => void {
    const existing = this.listeners.get(type) ?? new Set<Listener<TinyTitansEventName>>();
    existing.add(listener as Listener<TinyTitansEventName>);
    this.listeners.set(type, existing);
    return () => { existing.delete(listener as Listener<TinyTitansEventName>); if (existing.size === 0) this.listeners.delete(type); };
  }

  emit<K extends TinyTitansEventName>(event: TinyTitansEvent<K>): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) for (const listener of listeners) listener(event as TinyTitansEvent<TinyTitansEventName>);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TITAN_INTELLIGENCE_UPDATED_EVENT, { detail: event }));
  }

  clear(): void { this.listeners.clear(); }
}

export const tinyTitansEventBus = new TinyTitansEventBus();