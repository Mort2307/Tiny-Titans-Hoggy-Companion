import type { Snake } from "../types/Snake";
import { buildIntelligenceCorrelations, type IntelligenceCorrelation } from "./intelligenceCorrelationService";

export type KeeperContextInsight = IntelligenceCorrelation & { contextSignals: string[] };

function collectText(record: unknown): string {
  if (!record || typeof record !== "object") return "";
  const value = record as Record<string, unknown>;
  return [value.notes, value.note, value.description, value.comments, value.observation, value.reason].filter((item) => typeof item === "string").join(" ").trim();
}

function contextSignals(snake: Snake): string[] {
  const histories = [snake.feedingHistory, snake.shedHistory, snake.weightHistory, snake.healthHistory, snake.timeline, snake.enclosure?.environmentHistory].filter(Array.isArray).flat();
  const text = histories.map(collectText).filter(Boolean).join(" ").toLowerCase();
  const directText = [snake.temperatureNotes, snake.humidityNotes, snake.feedingNotes, snake.healthNotes, snake.medicationNotes, snake.breedingNotes, snake.notes, snake.enclosure?.notes].filter(Boolean).join(" ").toLowerCase();
  const combined = `${text} ${directText}`;
  const signals: string[] = [];
  if (/temperature|temp|heat|thermostat|heating|cool/.test(combined)) signals.push("temperature/heating note recorded");
  if (/humidity|moisture|humid/.test(combined)) signals.push("humidity note recorded");
  if (/substrate|bedding|aspen|coco|sand|enclosure|viv/.test(combined)) signals.push("enclosure/substrate note recorded");
  if (/stress|hide|hiding|burrow|behavio[u]?r|activity/.test(combined)) signals.push("behaviour/activity note recorded");
  if (/health|vet|medication|injur|symptom|illness/.test(combined)) signals.push("health/vet note recorded");
  if (/move|moved|new enclosure|relocat|transport/.test(combined)) signals.push("location/enclosure change note recorded");
  return [...new Set(signals)];
}

export function buildKeeperContextInsights(snake: Snake): KeeperContextInsight[] {
  const signals = contextSignals(snake);
  return buildIntelligenceCorrelations(snake).map((correlation) => ({ ...correlation, contextSignals: signals }));
}
