import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import type { SnakeMasterRecord } from "../services/snakeMasterRecord";
import type { SnakeInsight } from "../services/snakeIntelligenceService";

export function formatMasterRecordDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function confidenceExplanation(value: SnakeMasterRecord["overview"]["confidence"]["overall"], area: string, count: number, target: number) {
  if (value === "Insufficient") return `No ${area.toLowerCase()} history is recorded yet. Add records to start building this individual baseline.`;
  if (count >= target) return `Based on ${count} ${area.toLowerCase()} records. This is enough history for a stronger individual baseline.`;
  return `Based on ${count} ${area.toLowerCase()} record${count === 1 ? "" : "s"}. ${target - count} more will strengthen this baseline.`;
}

export function timelineDestination(snakeId: string, type: string, recordId?: string) {
  const encoded = encodeURIComponent(recordId ?? "");
  if (type === "Weight") return `/snakes/${snakeId}/weights?record=${encoded}`;
  if (type === "Feeding") return `/snakes/${snakeId}/feeding?record=${encoded}`;
  if (type === "Shed") return `/snakes/${snakeId}/shedding?record=${encoded}`;
  if (type === "Health") return `/health/${snakeId}?record=${encoded}`;
  if (type === "Behaviour") return `/behaviour/${snakeId}?record=${encoded}`;
  return `/snakes/${snakeId}`;
}

export function insightDestination(snakeId: string, insight: SnakeInsight) {
  if (insight.category === "weight") return `/snakes/${snakeId}/weights`;
  if (insight.category === "feeding") return `/snakes/${snakeId}/feeding`;
  if (insight.category === "shedding") return `/snakes/${snakeId}/shedding`;
  if (insight.category === "behaviour") return `/behaviour/${snakeId}`;
  if (insight.category === "health") return `/health/${snakeId}`;
  return `/snakes/${snakeId}`;
}

export function timelineActionLabel(type: string) {
  return ["Weight", "Feeding", "Shed", "Health", "Behaviour"].includes(type)
    ? "Open exact record →"
    : "View reptile profile →";
}

export function insightIconName(tone: SnakeInsight["tone"]): TinyTitansIconName {
  return tone === "attention" ? "warning" : tone === "positive" ? "weight" : "timeline";
}
