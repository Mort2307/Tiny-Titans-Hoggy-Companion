import type { AnimalTimelineEvent } from "./animalIntelligenceEngine";

export type TitanTimelinePulse = {
  windowDays: number;
  eventCount: number;
  domainCounts: Record<string, number>;
  latest: AnimalTimelineEvent;
  preceding?: AnimalTimelineEvent;
  tempoLabel: string;
  summary: string;
};

function domainForType(type: string): string {
  const value = type.toLowerCase();
  if (value.includes("weight")) return "weight";
  if (value.includes("feed")) return "feeding";
  if (value.includes("shed")) return "shed";
  if (value.includes("behaviour") || value.includes("behavior")) return "behaviour";
  if (value.includes("health") || value.includes("vet")) return "health";
  if (value.includes("breed")) return "breeding";
  if (value.includes("genetic")) return "genetics";
  return "other";
}

function timestamp(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function daysBetween(newer: number, older: number): number | null {
  const a = timestamp(newer);
  const b = timestamp(older);
  if (!a || !b) return null;
  return Math.max(0, Math.round((a - b) / 86_400_000));
}

export function buildTitanTimelinePulse(timeline: readonly AnimalTimelineEvent[], now = new Date()): TitanTimelinePulse | null {
  const dated = timeline
    .filter((event) => timestamp(event.date) > 0 && timestamp(event.date) <= now.getTime())
    .slice()
    .sort((a, b) => timestamp(a.date) - timestamp(b.date));
  const latest = dated.at(-1);
  if (!latest) return null;

  const nowMs = now.getTime();
  const recent = dated.filter((event) => {
    const eventMs = timestamp(event.date);
    return nowMs - eventMs >= 0 && nowMs - eventMs <= 30 * 86_400_000;
  });
  const source = recent.length ? recent : dated.slice(-6);
  const domainCounts: Record<string, number> = {};
  source.forEach((event) => {
    const domain = domainForType(event.type);
    domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
  });

  const preceding = dated.length > 1 ? dated.at(-2) : undefined;
  const gap = preceding ? daysBetween(latest.date, preceding.date) : null;
  const tempoLabel = gap === null ? "First recorded event" : gap <= 7 ? "Recently active" : gap <= 30 ? "Steady activity" : "Long gap between records";

  const strongest = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];
  const summary = source.length === 1
    ? `The latest recorded event is ${latest.label}. Tiny Titans is waiting for more temporal evidence before calling a pattern.`
    : strongest
      ? `${source.length} dated events are clustered in the recent history, with ${strongest[0]} currently the most represented area. This is descriptive rather than causal.`
      : `${source.length} dated events are currently available in the recent timeline.`;

  return { windowDays: recent.length ? 30 : 0, eventCount: source.length, domainCounts, latest, preceding, tempoLabel, summary };
}
