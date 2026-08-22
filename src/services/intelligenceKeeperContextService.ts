import type { Snake } from "../types/Snake";
import { buildIntelligenceCorrelations, type IntelligenceCorrelation } from "./intelligenceCorrelationService";

export type KeeperContextInsight = IntelligenceCorrelation & { contextSignals: string[] };

function collectText(record: unknown): string {
  if (!record || typeof record !== "object") return "";
  const value = record as Record<string, unknown>;
  return [value.notes, value.note, value.description, value.comments, value.observation, value.reason].filter((item) => typeof item === "string").join(" ").trim();
}

function contextSignals(snake: Snake): string[] {
  const histories = [snake.feedingHistory, snake.shedHistory, snake.weightHistory, snake.behaviourHistory, snake.healthHistory].filter(Array.isArray).flat();
  const text = histories.map(collectText).filter(Boolean).join(" ").toLowerCase();
  const signals: string[] = [];
  if (/temperature|temp|heat|thermostat|heating|cool/.test(text)) signals.push("temperature/heating note recorded");
  if (/humidity|moisture|humid/.test(text)) signals.push("humidity note recorded");
  if (/substrate|bedding|aspen|coco|sand|enclosure|viv/.test(text)) signals.push("enclosure/substrate note recorded");
  if (/stress|hide|hiding|burrow|behavio[u]?r|activity/.test(text)) signals.push("behaviour/activity note recorded");
  if (/health|vet|medication|injur|symptom|illness/.test(text)) signals.push("health/vet note recorded");
  if (/move|moved|new enclosure|relocat|transport/.test(text)) signals.push("location/enclosure change note recorded");
  return [...new Set(signals)];
}

export function buildKeeperContextInsights(snake: Snake): KeeperContextInsight[] {
  const signals = contextSignals(snake);
  return buildIntelligenceCorrelations(snake).map((correlation) => ({
    ...correlation,
    contextSignals: signals,
  }));
}
