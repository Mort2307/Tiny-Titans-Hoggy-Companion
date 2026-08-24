import type { TinyTitansEvent, TinyTitansEventName } from "./tinyTitansEventBus";
import { tinyTitansEventBus } from "./tinyTitansEventBus";

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

type InsightHandler<K extends TinyTitansEventName> = (
  event: TinyTitansEvent<K>,
) => TinyTitansInsight | TinyTitansInsight[] | null;

/**
 * Thin orchestration layer for intelligence.
 *
 * Existing specialist intelligence services remain the domain experts. This
 * kernel is the common presentation contract and event-to-insight boundary.
 * That keeps intelligence explainable, testable and replaceable as the app
 * grows.
 */
class TinyTitansIntelligenceKernel {
  private readonly handlers = new Map<TinyTitansEventName, Set<InsightHandler<TinyTitansEventName>>>();
  private readonly insights: TinyTitansInsight[] = [];

  register<K extends TinyTitansEventName>(eventName: K, handler: InsightHandler<K>): () => void {
    const handlers = this.handlers.get(eventName) ?? new Set<InsightHandler<TinyTitansEventName>>();
    handlers.add(handler as InsightHandler<TinyTitansEventName>);
    this.handlers.set(eventName, handlers);

    return () => {
      handlers.delete(handler as InsightHandler<TinyTitansEventName>);
      if (handlers.size === 0) this.handlers.delete(eventName);
    };
  }

  start(): () => void {
    const unsubscribers: Array<() => void> = [];

    for (const eventName of this.handlers.keys()) {
      unsubscribers.push(tinyTitansEventBus.on(eventName, (event) => this.process(event)));
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  getRecent(limit = 20): TinyTitansInsight[] {
    return this.insights.slice(-limit).reverse();
  }

  clear(): void {
    this.insights.length = 0;
  }

  private process(event: TinyTitansEvent<TinyTitansEventName>): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      const result = handler(event);
      if (!result) continue;
      const generated = Array.isArray(result) ? result : [result];
      this.insights.push(...generated);
    }

    // Keep the in-memory working set bounded. Persistent intelligence history
    // belongs in the existing Firebase-backed intelligence services.
    if (this.insights.length > 100) {
      this.insights.splice(0, this.insights.length - 100);
    }
  }
}

export const tinyTitansIntelligenceKernel = new TinyTitansIntelligenceKernel();
