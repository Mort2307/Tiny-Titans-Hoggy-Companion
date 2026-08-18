import type { Snake } from "../types/Snake";
import { getSnakeIntelligenceInsights, type IntelligenceConfidence } from "./snakeIntelligenceEngine";

export type HoggieStatus = "good" | "info" | "attention";
export type HoggieInsight = {
  status: HoggieStatus;
  label: string;
  detail: string;
  confidence?: IntelligenceConfidence;
  reason?: string;
};

/**
 * Compatibility facade for existing consumers.
 * All interpretation now comes from the central cross-domain intelligence engine.
 */
export function getHoggieInsight(snake: Snake): HoggieInsight {
  const insight = getSnakeIntelligenceInsights(snake)[0];
  const status: HoggieStatus = insight.status === "attention" ? "attention" : insight.status === "positive" ? "good" : "info";
  return {
    status,
    label: insight.title,
    detail: insight.detail,
    confidence: insight.confidence,
    reason: insight.reason,
  };
}

export { getSnakeIntelligenceInsights } from "./snakeIntelligenceEngine";
