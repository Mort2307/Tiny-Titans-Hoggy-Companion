import type { TinyTitansEvent, TinyTitansEventName } from "./tinyTitansEventBus";
import { TINY_TITANS_EVENT_NAMES, tinyTitansEventBus } from "./tinyTitansEventBus";
import { calculateIntelligenceGrowth, toIntelligenceGrowthEvent, type IntelligenceGrowthEvent, type IntelligenceGrowthSnapshot } from "../intelligence/v50/titanIntelligenceGrowthEngine";

export type TinyTitansInsightTone = "positive" | "attention" | "neutral" | "action";

export interface TinyTitansInsight {
  id: string;
  type: "insight" | "reminder" | "attention" | "achievement";
  tone: TinyTitansInsightTone;
  title: string;
  message: string;
  confidence?: number;
  sourceEvents: TinyTitansEventName[];
  createdAt: string;
  actionLabel?: string;
  actionRoute?: string;
}

type InsightHandler<K extends TinyTitansEventName> = (event: TinyTitansEvent<K>) => TinyTitansInsight | TinyTitansInsight[] | null;

/**
 * App-wide intelligence orchestration layer.
 *
 * Specialist engines remain the domain experts. The kernel is the shared
 * event boundary: every recognised app event can contribute to Intelligence
 * Growth as well as to any specialist insight handlers.
 */
class TinyTitansIntelligenceKernel {
  private readonly handlers = new Map<TinyTitansEventName, Set<InsightHandler<TinyTitansEventName>>>();
  private readonly insights: TinyTitansInsight[] = [];
  private readonly growthEvents: IntelligenceGrowthEvent[] = [];
  private readonly subscriptions = new Map<TinyTitansEventName, () => void>();
  private started = false;

  register<K extends TinyTitansEventName>(eventName: K, handler: InsightHandler<K>): () => void {
    const handlers = this.handlers.get(eventName) ?? new Set<InsightHandler<TinyTitansEventName>>();
    handlers.add(handler as InsightHandler<TinyTitansEventName>);
    this.handlers.set(eventName, handlers);
    if (this.started) this.ensureEventSubscription(eventName);
    return () => {
      handlers.delete(handler as InsightHandler<TinyTitansEventName>);
      if (handlers.size === 0) this.handlers.delete(eventName);
    };
  }

  start(): () => void {
    if (this.started) return () => this.stop();
    this.started = true;
    for (const eventName of TINY_TITANS_EVENT_NAMES) this.ensureEventSubscription(eventName);
    return () => this.stop();
  }

  getRecent(limit = 20): TinyTitansInsight[] { return this.insights.slice(-limit).reverse(); }
  getGrowthSnapshot(now = Date.now()): IntelligenceGrowthSnapshot { return calculateIntelligenceGrowth(this.growthEvents, now); }
  getGrowthEvents(limit = 100): IntelligenceGrowthEvent[] { return this.growthEvents.slice(-limit); }

  clear(): void {
    this.insights.length = 0;
    this.growthEvents.length = 0;
  }

  private ensureEventSubscription(eventName: TinyTitansEventName): void {
    if (this.subscriptions.has(eventName)) return;
    this.subscriptions.set(eventName, tinyTitansEventBus.on(eventName, (event) => this.process(event)));
  }

  private stop(): void {
    for (const unsubscribe of this.subscriptions.values()) unsubscribe();
    this.subscriptions.clear();
    this.started = false;
  }

  private process(event: TinyTitansEvent<TinyTitansEventName>): void {
    const growthEvent = toIntelligenceGrowthEvent(event);
    if (growthEvent) {
      this.growthEvents.push(growthEvent);
      if (this.growthEvents.length > 500) this.growthEvents.splice(0, this.growthEvents.length - 500);
    }
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;
    for (const handler of handlers) {
      const result = handler(event);
      if (!result) continue;
      const generated = Array.isArray(result) ? result : [result];
      this.insights.push(...generated);
    }
    if (this.insights.length > 100) this.insights.splice(0, this.insights.length - 100);
  }
}

export const tinyTitansIntelligenceKernel = new TinyTitansIntelligenceKernel();
