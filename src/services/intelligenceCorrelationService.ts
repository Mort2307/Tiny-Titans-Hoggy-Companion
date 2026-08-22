import type { Snake } from "../types/Snake";
import { detectIntelligenceAnomalies, type IntelligenceAnomaly } from "./intelligenceAnomalyService";

type Event = { date: number; type: string; label: string };
export type IntelligenceCorrelation = { anomaly: IntelligenceAnomaly; nearbyEvents: { type: string; label: string; date: string }[]; explanation: string };

function parseDate(value: unknown): number | undefined {
  if (!(typeof value === "string" || value instanceof Date)) return undefined;
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : undefined;
}

function collectEvents(snake: Snake): Event[] {
  const events: Event[] = [];
  const add = (history: unknown, keys: string[], type: string, label: string) => {
    if (!Array.isArray(history)) return;
    history.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const record = entry as Record<string, unknown>;
      const raw = keys.map((key) => record[key]).find((value) => typeof value === "string" || value instanceof Date);
      const date = parseDate(raw);
      if (date !== undefined) events.push({ date, type, label });
    });
  };
  add(snake.feedingHistory, ["date", "feedingDate"], "feeding", "Feeding recorded");
  add(snake.shedHistory, ["date", "shedDate"], "shed", "Shed recorded");
  add(snake.weightHistory, ["date", "weighedDate", "recordedAt"], "weight", "Weight recorded");
  return events.sort((a, b) => a.date - b.date);
}

export function buildIntelligenceCorrelations(snake: Snake): IntelligenceCorrelation[] {
  const events = collectEvents(snake);
  return detectIntelligenceAnomalies(snake).map((anomaly) => {
    const anchor = anomaly.key === "feeding" ? events.filter((event) => event.type === "feeding").at(-1) : anomaly.key === "shed" ? events.filter((event) => event.type === "shed").at(-1) : events.filter((event) => event.type === "weight").at(-1);
    const nearbyEvents = anchor ? events.filter((event) => event !== anchor && Math.abs(event.date - anchor.date) <= 7 * 86400000).slice(-6).map((event) => ({ type: event.type, label: event.label, date: new Date(event.date).toISOString().slice(0, 10) })) : [];
    return { anomaly, nearbyEvents, explanation: nearbyEvents.length ? "Other records were logged within seven days of this change. Tiny Titans shows the timing only; it does not infer that one event caused another." : "No other recorded events were found within seven days of this change." };
  });
}
