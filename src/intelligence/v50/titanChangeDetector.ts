import type { AnimalTimelineEvent } from "./animalIntelligenceEngine";

export interface TitanChangeSignal {
  id: string;
  title: string;
  detail: string;
  types: readonly string[];
  confidence: number;
  destination: string;
}

/**
 * Finds temporal changes worth showing to a keeper. It reports co-occurrence,
 * sequence and gaps only; it deliberately does not claim that one event caused another.
 */
export function detectTitanChanges(timeline: readonly AnimalTimelineEvent[]): TitanChangeSignal[] {
  const events = [...timeline].filter((event) => Number.isFinite(event.date) && event.date > 0).sort((a, b) => a.date - b.date);
  if (events.length < 2) return [];

  const signals: TitanChangeSignal[] = [];
  const latest = events.at(-1)!;
  const previous = events.at(-2)!;
  const gapDays = Math.max(0, (latest.date - previous.date) / 86400000);
  if (gapDays >= 30) {
    signals.push({ id: "long-observation-gap", title: "A long observation gap closed", detail: `${Math.round(gapDays)} days separated the two latest dated records. Tiny Titans is flagging the gap because sparse histories can make trends look more dramatic than they are.`, types: [previous.type, latest.type], confidence: 0.98, destination: "/snakes" });
  }

  const windowStart = latest.date - 14 * 86400000;
  const recent = events.filter((event) => event.date >= windowStart);
  const recentTypes = new Set(recent.map((event) => event.type));
  if (recentTypes.size >= 3) {
    signals.push({ id: "multi-domain-window", title: "Multiple record domains changed recently", detail: `The last 14 days contain ${recentTypes.size} recorded domains (${[...recentTypes].join(", ")}). This is a context signal, not a diagnosis or causal claim.`, types: [...recentTypes], confidence: 0.9, destination: "/snakes" });
  }

  for (let index = 1; index < events.length; index += 1) {
    const a = events[index - 1];
    const b = events[index];
    const withinDay = b.date - a.date <= 86400000;
    if (withinDay && a.type !== b.type) {
      signals.push({ id: `adjacent-${a.type}-${b.type}-${b.date}`, title: "Two different record types occurred close together", detail: `${a.type} and ${b.type} were recorded within 24 hours. Review them together when looking for context; Tiny Titans does not infer cause.`, types: [a.type, b.type], confidence: 0.84, destination: "/snakes" });
      if (signals.length >= 5) break;
    }
  }

  return signals.slice(-5).reverse();
}
